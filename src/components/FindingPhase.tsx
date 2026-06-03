"use client";

import { useState } from "react";
import type { LatLng, PublicState } from "@/shared/types";
import MapPicker from "./MapPicker";
import StreetView from "./StreetView";
import PlayerList from "./PlayerList";
import WaitingBar from "./WaitingBar";

interface Props {
  state: PublicState;
  onGuess: (at: LatLng) => void;
  onForce: () => void;
}

export default function FindingPhase({ state, onGuess, onForce }: Props) {
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
              onForce={state.youAreGameMaster ? onForce : undefined}
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
              onForce={state.youAreGameMaster ? onForce : undefined}
            />
            <PlayerList players={state.players} youId={state.youId} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="full-bleed">
      <div className="split">
        <div style={{ position: "relative", background: "#000" }}>
          <div className="overlay-top">
            Where is <strong>{state.currentTarget?.name}</strong> hiding?
          </div>
          <StreetView mode="pano" panoId={state.currentTarget?.panoId} />
        </div>
        <div style={{ position: "relative" }}>
          <div className="overlay-top">{roundLabel} · drop your guess</div>
          <MapPicker value={guess} onChange={setGuess} />
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
