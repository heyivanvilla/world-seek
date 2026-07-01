"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng, PublicPlayer, PublicState } from "@/shared/types";
import { emojiUrl } from "@/shared/emojis";
import MapPicker, { type MapMarker } from "./MapPicker";
import StreetView from "./StreetView";
import PlayerList from "./PlayerList";
import WaitingBar from "./WaitingBar";

interface Props {
  state: PublicState;
  onGuess: (at: LatLng) => void;
  onPreview: (at: LatLng) => void;
}

// Cap how often a moving pin is broadcast so a drag doesn't flood the socket.
const PREVIEW_THROTTLE_MS = 100;
// Tentative (un-confirmed) pins render see-through; confirmed ones go solid.
const TENTATIVE_OPACITY = 0.4;

export default function FindingPhase({ state, onGuess, onPreview }: Props) {
  const [guess, setGuess] = useState<LatLng | null>(null);
  const roundLabel = `Round ${state.currentRound + 1} of ${state.totalRounds}`;

  // Throttle live-pin broadcasts (leading + trailing edge) so continuous drags
  // stream smoothly without emitting on every pointer move.
  const lastSent = useRef(0);
  const trailing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;
  useEffect(
    () => () => {
      if (trailing.current) clearTimeout(trailing.current);
    },
    [],
  );

  // Round advanced. This component now persists across rounds (see GameRoom — it
  // is no longer keyed/remounted, so the map + Street View instances are reused
  // rather than rebuilt), so the remount no longer clears per-round view state.
  // Reset it by hand: drop the working guess and cancel any pending preview emit
  // so a stale pin from the previous round can't leak into the next one.
  useEffect(() => {
    setGuess(null);
    if (trailing.current) clearTimeout(trailing.current);
  }, [state.currentRound]);
  const sendPreview = useCallback((at: LatLng) => {
    const wait = PREVIEW_THROTTLE_MS - (Date.now() - lastSent.current);
    if (wait <= 0) {
      lastSent.current = Date.now();
      onPreviewRef.current(at);
    } else {
      if (trailing.current) clearTimeout(trailing.current);
      trailing.current = setTimeout(() => {
        lastSent.current = Date.now();
        onPreviewRef.current(at);
      }, wait);
    }
  }, []);

  // The other hunters' live pins, for the watch views below.
  const liveMarkers: MapMarker[] = state.livePins.map((g) => ({
    id: g.playerId,
    lat: g.lat,
    lng: g.lng,
    icon: g.emoji,
    opacity: g.confirmed ? 1 : TENTATIVE_OPACITY,
    title: g.name,
  }));

  // --- it's your spot being guessed: watch everyone close in ---
  if (state.youAreTarget) {
    return (
      <WatchView
        roundLabel={roundLabel}
        title="Everyone's hunting for you 🔎"
        emptyHint="Sit tight while the others guess your hiding spot."
        markers={liveMarkers}
        current={state.guessedCount}
        total={state.expectedGuessers}
      />
    );
  }

  // --- already guessed this round: follow the rest of the hunt ---
  if (state.youHaveGuessed) {
    return (
      <WatchView
        roundLabel={roundLabel}
        title="Guess locked in ✅"
        emptyHint="Waiting for the other hunters to lock in."
        markers={liveMarkers}
        current={state.guessedCount}
        total={state.expectedGuessers}
        players={state.players}
      />
    );
  }

  // --- active guesser ---
  // Click / drag-end set the working guess and stream a preview; the continuous
  // onDrag streams previews only (no re-render churn) for live motion.
  function handleChange(p: LatLng) {
    setGuess(p);
    sendPreview(p);
  }

  return (
    <div className="full-bleed">
      <div className="split">
        <div style={{ position: "relative", background: "#000" }}>
          <div className="overlay-top overlay-top--emoji">
            {state.solo ? (
              <span>Where in the world is this? 🌍</span>
            ) : (
              <>
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
              </>
            )}
          </div>
          <StreetView mode="pano" panoId={state.currentTarget?.panoId} />
        </div>
        <div style={{ position: "relative" }}>
          <div className="overlay-top">{roundLabel} · drop your guess</div>
          <MapPicker
            value={guess}
            onChange={handleChange}
            onDrag={(p) => sendPreview(p)}
            markerIcon={state.youEmoji}
            resetViewKey={state.currentRound}
          />
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

/**
 * Shown to players who can no longer guess this round (the target, or anyone
 * already locked in): a live map of the other hunters' pins. Tentative pins are
 * see-through and snap solid on confirm. Falls back to a simple waiting card
 * until the first pin appears.
 */
function WatchView({
  roundLabel,
  title,
  emptyHint,
  markers,
  current,
  total,
  players,
}: {
  roundLabel: string;
  title: string;
  emptyHint: string;
  markers: MapMarker[];
  current: number;
  total: number;
  players?: PublicPlayer[];
}) {
  if (markers.length === 0) {
    return (
      <div className="center-screen">
        <div className="stack" style={{ width: 420, gap: 18 }}>
          <span className="muted">{roundLabel}</span>
          <h1 className="title">{title}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {emptyHint}
          </p>
          <div className="card stack">
            <WaitingBar label="Guesses in" current={current} total={total} />
            {players && <PlayerList players={players} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="full-bleed">
      <div className="map-wrap">
        <div className="overlay-top">
          <strong>{title}</strong>
          <div className="muted" style={{ fontSize: 23, marginTop: 2 }}>
            {roundLabel} · pins glow solid when locked in
          </div>
        </div>
        <MapPicker markers={markers} />
      </div>
      <div className="overlay-bar">
        <div style={{ minWidth: 220 }}>
          <WaitingBar label="Guesses in" current={current} total={total} />
        </div>
      </div>
    </div>
  );
}
