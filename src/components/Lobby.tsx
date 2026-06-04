"use client";

import { useState } from "react";
import type { PublicState } from "@/shared/types";
import PlayerList from "./PlayerList";

interface Props {
  state: PublicState;
  onStart: () => void;
}

export default function Lobby({ state, onStart }: Props) {
  const [copied, setCopied] = useState(false);
  const isGM = state.youAreGameMaster;
  const enoughPlayers = state.players.length >= 2;

  function copyLink() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="center-screen">
      <div className="stack" style={{ width: 440, gap: 20 }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="title">Lobby</h1>
          <div
            className="row"
            style={{ gap: 10, justifyContent: "space-between", alignItems: "stretch" }}
          >
            <span className="code-pill">{state.code}</span>
            <button className="secondary" onClick={copyLink}>
              {copied ? "Copied!" : "Copy invite link"}
            </button>
          </div>
        </div>

        <div className="card stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="eyebrow">Players ({state.players.length})</span>
            <span className="muted">2–12 players</span>
          </div>
          <PlayerList players={state.players} />
        </div>

        {isGM ? (
          <div className="card stack">
            <button onClick={onStart} disabled={!enoughPlayers}>
              {enoughPlayers ? "Start game" : "Need at least 2 players"}
            </button>
          </div>
        ) : (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              Waiting for the host to start the game…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
