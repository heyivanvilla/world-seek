import type { Server, Socket } from "socket.io";
import type {
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
  getRoom,
  lookupSocket,
  saveRoom,
  unbindSocket,
} from "../src/server-logic/store";
import {
  addPlayer,
  allConnectedHidden,
  allGuessed,
  createRoom,
  findByToken,
  findPlayer,
  nextRound,
  recordGuess,
  recordHide,
  returnToLobby,
  scoreRound,
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

    socket.on("game:start", () => {
      const s = seat(socket);
      if (!s || !isGameMaster(s.room, s.playerId)) return;
      if (startGame(s.room)) broadcastState(io, s.room);
    });

    socket.on("hide:confirm", (spot: HidingSpot) => {
      const s = seat(socket);
      if (!s) return;
      if (!recordHide(s.room, s.playerId, spot)) return;
      if (allConnectedHidden(s.room)) startFinding(s.room);
      broadcastState(io, s.room);
    });

    socket.on("guess:confirm", (at: LatLng) => {
      const s = seat(socket);
      if (!s) return;
      if (!recordGuess(s.room, s.playerId, at)) return;
      if (allGuessed(s.room)) scoreRound(s.room);
      broadcastState(io, s.room);
    });

    socket.on("round:next", () => {
      const s = seat(socket);
      if (!s || !isGameMaster(s.room, s.playerId)) return;
      if (nextRound(s.room)) broadcastState(io, s.room);
    });

    socket.on("game:returnToLobby", () => {
      const s = seat(socket);
      if (!s || !isGameMaster(s.room, s.playerId)) return;
      if (returnToLobby(s.room)) broadcastState(io, s.room);
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
        broadcastState(io, room);
      }
    });
  });
}
