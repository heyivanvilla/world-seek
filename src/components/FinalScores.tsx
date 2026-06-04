"use client";

import type { PublicState } from "@/shared/types";
import { emojiUrl } from "@/shared/emojis";

interface Props {
  state: PublicState;
  onReturnToLobby: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function FinalScores({ state, onReturnToLobby }: Props) {
  // state.players already arrives sorted by score desc.
  const ranked = state.players;
  const topScore = ranked[0]?.totalScore ?? 0;
  const winners = ranked.filter((p) => p.totalScore === topScore && topScore > 0);

  return (
    <div className="center-screen">
      <div className="stack" style={{ width: 460, gap: 20 }}>
        <div className="stack" style={{ gap: 4 }}>
          <h1 className="title" style={{ fontSize: 34 }}>
            🏆 Game over
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {winners.length === 1
              ? `${winners[0].name} wins!`
              : `It's a tie: ${winners.map((w) => w.name).join(", ")}`}
          </p>
        </div>

        <div className="card stack" style={{ gap: 10 }}>
          {ranked.map((p, i) => (
            <div key={p.id} className="player-row">
              <div className="row" style={{ gap: 10 }}>
                <span style={{ width: 24 }}>{MEDALS[i] ?? `${i + 1}.`}</span>
                <span className="roster-avatar" aria-hidden="true">
                  <img className="emoji-img" src={emojiUrl(p.emoji)} alt="" />
                </span>
                <strong>{p.name}</strong>
                {p.id === state.youId && <span className="badge">you</span>}
              </div>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                {p.totalScore.toLocaleString()}
              </strong>
            </div>
          ))}
        </div>

        {state.youAreGameMaster ? (
          <button onClick={onReturnToLobby}>Back to lobby</button>
        ) : (
          <p className="muted">Waiting for the host to return to the lobby…</p>
        )}
      </div>
    </div>
  );
}
