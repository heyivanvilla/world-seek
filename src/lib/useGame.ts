"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  HidingSpot,
  JoinAck,
  JoinError,
  LatLng,
  PeekAck,
  PublicState,
  ReconnectAck,
} from "@/shared/types";
import { emitAck, getSocket } from "./socket";
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

  useEffect(() => {
    const socket = getSocket();

    const attemptReconnect = () => {
      const sess = loadSession(code);
      if (!sess) {
        if (!inGame.current) setStatus("need-join");
        return;
      }
      emitAck<ReconnectAck>("game:reconnect", {
        code,
        sessionToken: sess.sessionToken,
      }).then((res) => {
        if (!res.ok) {
          clearSession(code);
          if (!inGame.current) setStatus("need-join");
        }
      });
    };

    const onState = (s: PublicState) => {
      inGame.current = true;
      setState(s);
      setStatus("in-game");
    };
    const onConnect = () => {
      setConnected(true);
      attemptReconnect();
    };
    const onDisconnect = () => setConnected(false);

    socket.on("state", onState);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) {
      setConnected(true);
      attemptReconnect();
    }

    return () => {
      socket.off("state", onState);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [code]);

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
        setError(null);
        return { ok: true };
      }
      setError(joinErrorMessage(res.error));
      return { ok: false, takenEmojis: res.takenEmojis };
    },
    [code],
  );

  // Pre-join read so the join picker can grey out already-taken emojis.
  const peek = useCallback(async (): Promise<string[]> => {
    const res = await emitAck<PeekAck>("game:peek", { code });
    return res.ok ? res.takenEmojis : [];
  }, [code]);

  const start = useCallback(() => getSocket().emit("game:start"), []);
  const hide = useCallback(
    (spot: HidingSpot) => getSocket().emit("hide:confirm", spot),
    [],
  );
  const guess = useCallback(
    (at: LatLng) => getSocket().emit("guess:confirm", at),
    [],
  );
  const nextRound = useCallback(() => getSocket().emit("round:next"), []);
  const returnToLobby = useCallback(
    () => getSocket().emit("game:returnToLobby"),
    [],
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
    nextRound,
    returnToLobby,
  };
}
