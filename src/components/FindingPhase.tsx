"use client";

import { useState } from "react";
import type { LatLng, PublicState } from "@/shared/types";
import { emojiUrl } from "@/shared/emojis";
import MapPicker from "./MapPicker";
import StreetView from "./StreetView";
import PlayerList from "./PlayerList";
import WaitingBar from "./WaitingBar";

interface Props {
  state: PublicState;
  onGuess: (at: LatLng) => void;
}

export default function FindingPhase({ state, onGuess }: Props) {
  const [guess, setGuess] = useState<LatLng | null>(null);
  const roundLabel = `Round ${state.currentRound + 1} of ${state.totalRounds}`;

  // --- it's your spot being guessed: sit out ---
  if (state.youAreTarget) {
    return (
      <div className="center-screen">
        <div className="stack" style={{ width: 420, gap: 18 }}>
          <span className="muted">{roundLabel}</span>
          <h1 className="title">Everyone's hunting for you 🔎</h1>
          <p className="muted" style={{ margin: 0 }}>
            Sit tight while the others guess your hiding spot.
          </p>
          <div className="card stack">
            <WaitingBar
              label="Guesses in"
              current={state.guessedCount}
              total={state.expectedGuessers}
            />
          </div>
        </div>
      </div>
    );
  }

  // --- already guessed this round: waiting view ---
  if (state.youHaveGuessed) {
    return (
      <div className="center-screen">
        <div className="stack" style={{ width: 420, gap: 18 }}>
          <span className="muted">{roundLabel}</span>
          <h1 className="title">Guess locked in ✅</h1>
          <div className="card stack">
            <WaitingBar
              label="Guesses in"
              current={state.guessedCount}
              total={state.expectedGuessers}
            />
            <PlayerList players={state.players} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="full-bleed">
      <div className="split">
        <div style={{ position: "relative", background: "#000" }}>
          <div className="overlay-top overlay-top--emoji">
            {state.currentTarget && (
              <span className="emoji-inline" aria-hidden="true">
                <img
                  className="emoji-img"
                  src={emojiUrl(state.currentTarget.emoji)}
                  alt=""
                />
              </span>
            )}
            <span>
              Where is <strong>{state.currentTarget?.name}</strong> hiding?
            </span>
          </div>
          <StreetView mode="pano" panoId={state.currentTarget?.panoId} />
        </div>
        <div style={{ position: "relative" }}>
          <div className="overlay-top">{roundLabel} · drop your guess</div>
          <MapPicker value={guess} onChange={setGuess} markerIcon={state.youEmoji} />
        </div>
      </div>

      <div className="overlay-bar">
        {!guess && <span className="muted">Click the map to place your guess.</span>}
        {guess && <span className="muted">Lock it in?</span>}
        <button onClick={() => guess && onGuess(guess)} disabled={!guess}>
          Guess here
        </button>
      </div>
    </div>
  );
}
