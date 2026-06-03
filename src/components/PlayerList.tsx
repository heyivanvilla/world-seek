"use client";

import type { PublicPlayer } from "@/shared/types";

interface Props {
  players: PublicPlayer[];
  youId: string;
  showScore?: boolean;
  showHidden?: boolean;
  hiddenLabel?: string;
}

export default function PlayerList({
  players,
  youId,
  showScore,
  showHidden,
  hiddenLabel = "ready",
}: Props) {
  return (
    <div
      className="stack"
      style={{ gap: 8, maxHeight: "50vh", overflowY: "auto" }}
    >
      {players.map((p) => (
        <div key={p.id} className="player-row">
          <div className="row" style={{ gap: 8 }}>
            <strong>{p.name}</strong>
            {p.id === youId && <span className="badge">you</span>}
            {p.isGameMaster && <span className="badge">host</span>}
            {!p.connected && <span className="badge off">offline</span>}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {showHidden && (
              <span className={`badge ${p.hasHidden ? "good" : ""}`}>
                {p.hasHidden ? hiddenLabel : "…"}
              </span>
            )}
            {showScore && (
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                {p.totalScore.toLocaleString()}
              </strong>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
