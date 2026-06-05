import type { Server, Socket } from "socket.io";
import type {
  ActionAck,
  CreateAck,
  HidingSpot,
  JoinAck,
  LatLng,
  PeekAck,
  ReconnectAck,
  Room,
  Settings,
} from "../src/shared/types";
import {
  bindSocket,
  deleteRoom,
  getRoom,
  lookupSocket,
  saveRoom,
  unbindSocket,
} from "../src/server-logic/store";
import {
  addPlayer,
  allConnectedHidden,
  allGuessed,
  connectedPlayers,
  createRoom,
  findByToken,
  findPlayer,
  nextRound,
  nextSoloRound,
  recordGuess,
  recordHide,
  recordLivePin,
  recordSoloGuess,
  recordSoloTarget,
  removePlayer,
  returnToLobby,
  scoreRound,
  scoreSoloRound,
  startFinding,
  startGame,
  takenEmojis,
} from "../src/server-logic/transitions";
import { projectFor } from "../src/server-logic/projection";

function broadcastState(io: Server, room: Room): void {
  for (const p of room.players) {
    if (p.connected && p.socketId) {
      io.to(p.socketId).emit("state", projectFor(room, p.id));
    }
  }
}

/** End a game for everyone: tell each live client to go home, then drop the room. */
function closeRoom(io: Server, room: Room): void {
  for (const p of room.players) {
    if (p.connected && p.socketId) {
      io.to(p.socketId).emit("game:closed");
      unbindSocket(p.socketId);
    }
  }
  deleteRoom(room.code);
}

/** Resolve which room/player a socket is currently seated at. */
function seat(socket: Socket): { room: Room; playerId: string } | null {
  const binding = lookupSocket(socket.id);
  if (!binding) return null;
  const room = getRoom(binding.code);
  if (!room) return null;
  if (!findPlayer(room, binding.playerId)) return null;
  return { room, playerId: binding.playerId };
}

function isGameMaster(room: Room, playerId: string): boolean {
  return room.gameMasterId === playerId;
}

type AckFn = (res: ActionAck) => void;

/** Invoke an action ack if the client supplied one (older clients may not). */
function reply(cb: AckFn | undefined, res: ActionAck): void {
  if (typeof cb === "function") cb(res);
}

export function registerHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    socket.on(
      "game:create",
      (
        payload: { gmName: string; gmEmoji?: string; settings?: Partial<Settings> },
        ack: (res: CreateAck) => void,
      ) => {
        const { room, player } = createRoom(
          payload?.gmName ?? "",
          payload?.settings,
          payload?.gmEmoji,
        );
        player.socketId = socket.id;
        saveRoom(room);
        bindSocket(socket.id, room.code, player.id);
        ack({ code: room.code, sessionToken: player.sessionToken, playerId: player.id });
        broadcastState(io, room);
      },
    );

    // Lightweight pre-join read so an unjoined client can grey out taken emojis.
    socket.on(
      "game:peek",
      (payload: { code: string }, ack: (res: PeekAck) => void) => {
        const room = getRoom(payload?.code ?? "");
        if (!room) return ack({ ok: false });
        ack({ ok: true, takenEmojis: takenEmojis(room) });
      },
    );

    socket.on(
      "game:join",
      (
        payload: { code: string; name: string; emoji?: string },
        ack: (res: JoinAck) => void,
      ) => {
        const room = getRoom(payload?.code ?? "");
        if (!room) return ack({ ok: false, error: "not_found" });
        const result = addPlayer(room, payload?.name ?? "", payload?.emoji);
        if (!result.ok) {
          // On an emoji clash, hand back the fresh taken set so the picker updates.
          return ack(
            result.error === "emoji_taken"
              ? { ok: false, error: result.error, takenEmojis: takenEmojis(room) }
              : { ok: false, error: result.error },
          );
        }
        result.player.socketId = socket.id;
        saveRoom(room);
        bindSocket(socket.id, room.code, result.player.id);
        ack({
          ok: true,
          sessionToken: result.player.sessionToken,
          playerId: result.player.id,
        });
        broadcastState(io, room);
      },
    );

    socket.on(
      "game:reconnect",
      (
        payload: { code: string; sessionToken: string },
        ack: (res: ReconnectAck) => void,
      ) => {
        const room = getRoom(payload?.code ?? "");
        if (!room) return ack({ ok: false, error: "not_found" });
        const player = findByToken(room, payload?.sessionToken ?? "");
        if (!player) return ack({ ok: false, error: "bad_token" });
        player.connected = true;
        player.socketId = socket.id;
        bindSocket(socket.id, room.code, player.id);
        ack({ ok: true, playerId: player.id });
        broadcastState(io, room);
      },
    );

    // Game actions reply with an ack. A missing seat is reported as `not_seated`
    // (the socket was dropped server-side, e.g. a backgrounded tab) so the client
    // can re-establish its session and replay — rather than the tap vanishing.
    socket.on("game:start", (cb?: AckFn) => {
      const s = seat(socket);
      if (!s) return reply(cb, { ok: false, reason: "not_seated" });
      if (!isGameMaster(s.room, s.playerId) || !startGame(s.room))
        return reply(cb, { ok: false, reason: "rejected" });
      broadcastState(io, s.room);
      reply(cb, { ok: true });
    });

    socket.on("hide:confirm", (spot: HidingSpot, cb?: AckFn) => {
      const s = seat(socket);
      if (!s) return reply(cb, { ok: false, reason: "not_seated" });
      if (!recordHide(s.room, s.playerId, spot))
        return reply(cb, { ok: false, reason: "rejected" });
      if (allConnectedHidden(s.room)) startFinding(s.room);
      broadcastState(io, s.room);
      reply(cb, { ok: true });
    });

    // Solo: the lone player's browser resolves a random Street View location (the
    // server has no Google access of its own) and sends it up to seed the round.
    socket.on("solo:target", (spot: HidingSpot, cb?: AckFn) => {
      const s = seat(socket);
      if (!s) return reply(cb, { ok: false, reason: "not_seated" });
      if (!recordSoloTarget(s.room, spot))
        return reply(cb, { ok: false, reason: "rejected" });
      broadcastState(io, s.room);
      reply(cb, { ok: true });
    });

    // A guesser's pin moving in real time — broadcast to watchers (the target +
    // already-guessed players). High-frequency and best-effort: no ack/replay,
    // throttled on the client. A dropped preview just means a skipped frame.
    socket.on("guess:preview", (at: LatLng) => {
      const s = seat(socket);
      if (!s) return;
      if (!recordLivePin(s.room, s.playerId, at)) return;
      broadcastState(io, s.room);
    });

    socket.on("guess:confirm", (at: LatLng, cb?: AckFn) => {
      const s = seat(socket);
      if (!s) return reply(cb, { ok: false, reason: "not_seated" });
      if (s.room.mode === "solo") {
        // One guesser, no waiting: a successful guess ends the round immediately.
        if (!recordSoloGuess(s.room, s.playerId, at))
          return reply(cb, { ok: false, reason: "rejected" });
        scoreSoloRound(s.room, s.playerId);
        broadcastState(io, s.room);
        return reply(cb, { ok: true });
      }
      if (!recordGuess(s.room, s.playerId, at))
        return reply(cb, { ok: false, reason: "rejected" });
      if (allGuessed(s.room)) scoreRound(s.room);
      broadcastState(io, s.room);
      reply(cb, { ok: true });
    });

    socket.on("round:next", (cb?: AckFn) => {
      const s = seat(socket);
      if (!s) return reply(cb, { ok: false, reason: "not_seated" });
      const advance = s.room.mode === "solo" ? nextSoloRound : nextRound;
      if (!isGameMaster(s.room, s.playerId) || !advance(s.room))
        return reply(cb, { ok: false, reason: "rejected" });
      broadcastState(io, s.room);
      reply(cb, { ok: true });
    });

    socket.on("game:returnToLobby", (cb?: AckFn) => {
      const s = seat(socket);
      if (!s) return reply(cb, { ok: false, reason: "not_seated" });
      if (!isGameMaster(s.room, s.playerId) || !returnToLobby(s.room))
        return reply(cb, { ok: false, reason: "rejected" });
      broadcastState(io, s.room);
      reply(cb, { ok: true });
    });

    // Host ends the game for everyone — all live clients get sent home.
    socket.on("game:close", (cb?: AckFn) => {
      const s = seat(socket);
      if (!s) return reply(cb, { ok: false, reason: "not_seated" });
      if (!isGameMaster(s.room, s.playerId))
        return reply(cb, { ok: false, reason: "rejected" });
      closeRoom(io, s.room);
      reply(cb, { ok: true });
    });

    // A player leaves; the rest keep playing (or the game ends if too few remain).
    socket.on("game:leave", (cb?: AckFn) => {
      const s = seat(socket);
      if (!s) return reply(cb, { ok: false, reason: "not_seated" });
      // A leaving host = closing for everyone (defensive; the client routes here too).
      if (isGameMaster(s.room, s.playerId)) {
        closeRoom(io, s.room);
        return reply(cb, { ok: true });
      }

      const { removed, wasCurrentTarget } = removePlayer(s.room, s.playerId);
      if (!removed) return reply(cb, { ok: false, reason: "rejected" });
      unbindSocket(socket.id);

      // Room empty -> just drop it.
      if (s.room.players.length === 0) {
        deleteRoom(s.room.code);
        return reply(cb, { ok: true });
      }

      const active = connectedPlayers(s.room).length;
      const inProgress = s.room.phase !== "lobby" && s.room.phase !== "finished";

      // A game in progress can't continue with one player -> end it for the rest.
      if (inProgress && active < 2) {
        closeRoom(io, s.room);
        return reply(cb, { ok: true });
      }

      // Re-evaluate the phase transitions the leaver may have been blocking.
      if (s.room.phase === "hiding") {
        if (allConnectedHidden(s.room)) startFinding(s.room);
      } else if (s.room.phase === "finding") {
        if (wasCurrentTarget && s.room.currentRound >= s.room.order.length) {
          s.room.phase = "finished";
        } else if (allGuessed(s.room)) {
          scoreRound(s.room);
        }
      } else if (s.room.phase === "results" && wasCurrentTarget) {
        s.room.phase =
          s.room.currentRound >= s.room.order.length ? "finished" : "finding";
      }

      broadcastState(io, s.room);
      reply(cb, { ok: true });
    });

    socket.on("disconnect", () => {
      const binding = lookupSocket(socket.id);
      unbindSocket(socket.id);
      if (!binding) return;
      const room = getRoom(binding.code);
      if (!room) return;
      const player = findPlayer(room, binding.playerId);
      if (player && player.socketId === socket.id) {
        player.connected = false;
        player.socketId = null;
        // A disconnect can unblock a waiting phase: if everyone still connected
        // has already confirmed, advance automatically rather than leaving the
        // game stuck waiting for a player who just left.
        if (room.phase === "hiding" && allConnectedHidden(room)) startFinding(room);
        else if (room.phase === "finding" && allGuessed(room)) scoreRound(room);
        broadcastState(io, room);
      }
    });
  });
}
