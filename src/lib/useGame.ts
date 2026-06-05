"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActionAck,
  HidingSpot,
  JoinAck,
  JoinError,
  LatLng,
  PeekAck,
  PublicState,
  ReconnectAck,
} from "@/shared/types";
import { emitAck, emitAction, getSocket } from "./socket";
import { clearSession, loadSession, saveSession } from "./session";

export type GameStatus = "connecting" | "need-join" | "in-game";

function joinErrorMessage(err: JoinError): string {
  switch (err) {
    case "not_found":
      return "That game doesn't exist.";
    case "in_progress":
      return "This game is already in progress — you can't join right now.";
    case "name_taken":
      return "That name is taken. Try another.";
    case "emoji_taken":
      return "That avatar was just taken. Pick another.";
    case "full":
      return "This game is full.";
  }
}

export function useGame(code: string) {
  const [state, setState] = useState<PublicState | null>(null);
  const [status, setStatus] = useState<GameStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const inGame = useRef(false);

  // Whether the SERVER currently recognizes our live socket as our seat. Tracked
  // apart from `connected` because a backgrounded tab can be dropped server-side
  // (ping timeout) while the client still believes its socket is open.
  const seated = useRef(false);
  // Actions fired while we're not seated are parked here and replayed once the
  // seat is re-established — otherwise they'd fire into a socket the server has
  // already forgotten and silently vanish (the "stuck button" bug).
  const pending = useRef<Array<() => void>>([]);
  // Late-bound so the action dispatcher (stable across renders) can re-seat.
  const reseatRef = useRef<() => Promise<boolean>>(async () => false);

  const flushPending = useCallback(() => {
    const queue = pending.current;
    pending.current = [];
    for (const run of queue) run();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    // (Re)claim our seat on the current connection. Resolves true once the
    // server has acknowledged us, at which point any parked actions can replay.
    const reseat = async (): Promise<boolean> => {
      const sess = loadSession(code);
      if (!sess) {
        seated.current = false;
        if (!inGame.current) setStatus("need-join");
        return false;
      }
      const res = await emitAck<ReconnectAck>("game:reconnect", {
        code,
        sessionToken: sess.sessionToken,
      });
      if (res.ok) {
        seated.current = true;
        flushPending();
        return true;
      }
      seated.current = false;
      clearSession(code);
      if (!inGame.current) setStatus("need-join");
      return false;
    };
    reseatRef.current = reseat;

    const onState = (s: PublicState) => {
      inGame.current = true;
      setState(s);
      setStatus("in-game");
    };
    const onConnect = () => {
      setConnected(true);
      reseat();
    };
    const onDisconnect = () => {
      setConnected(false);
      seated.current = false;
    };

    socket.on("state", onState);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) {
      setConnected(true);
      reseat();
    }

    return () => {
      socket.off("state", onState);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [code, flushPending]);

  // Send a game action, surviving a dropped or stale connection. If we aren't
  // seated we park it and (re)connect first; if the server reports our seat
  // lapsed mid-flight (`not_seated`) we re-establish it and replay once.
  const dispatch = useCallback((event: string, payload?: unknown) => {
    const socket = getSocket();

    const send = () => {
      emitAction<ActionAck>(event, payload).then((res) => {
        if (!res.ok && res.reason === "not_seated") {
          reseatRef.current().then((ok) => {
            if (ok) emitAction<ActionAck>(event, payload);
          });
        }
      });
    };

    if (socket.connected && seated.current) {
      send();
      return;
    }
    pending.current.push(send);
    if (!socket.connected) socket.connect();
    else reseatRef.current();
  }, []);

  const join = useCallback(
    async (
      name: string,
      emoji: string,
    ): Promise<{ ok: boolean; takenEmojis?: string[] }> => {
      const res = await emitAck<JoinAck>("game:join", { code, name, emoji });
      if (res.ok) {
        saveSession(code, {
          sessionToken: res.sessionToken,
          playerId: res.playerId,
        });
        // The join itself seated this socket — let any parked actions go.
        seated.current = true;
        flushPending();
        setError(null);
        return { ok: true };
      }
      setError(joinErrorMessage(res.error));
      return { ok: false, takenEmojis: res.takenEmojis };
    },
    [code, flushPending],
  );

  // Pre-join read so the join picker can grey out already-taken emojis.
  const peek = useCallback(async (): Promise<string[]> => {
    const res = await emitAck<PeekAck>("game:peek", { code });
    return res.ok ? res.takenEmojis : [];
  }, [code]);

  const start = useCallback(() => dispatch("game:start"), [dispatch]);
  const hide = useCallback(
    (spot: HidingSpot) => dispatch("hide:confirm", spot),
    [dispatch],
  );
  const guess = useCallback(
    (at: LatLng) => dispatch("guess:confirm", at),
    [dispatch],
  );
  // Solo: the browser generated a location; seed the round with it. Goes through
  // dispatch so it survives a dropped/stale seat like every other action.
  const sendSoloTarget = useCallback(
    (spot: HidingSpot) => dispatch("solo:target", spot),
    [dispatch],
  );
  const nextRound = useCallback(() => dispatch("round:next"), [dispatch]);
  const returnToLobby = useCallback(
    () => dispatch("game:returnToLobby"),
    [dispatch],
  );

  return {
    state,
    status,
    error,
    connected,
    join,
    peek,
    start,
    hide,
    guess,
    sendSoloTarget,
    nextRound,
    returnToLobby,
  };
}
