"use client";

import { useState } from "react";
import type { HidingSpot, LatLng, PublicState } from "@/shared/types";
import EmojiStill from "./EmojiStill";
import MapPicker from "./MapPicker";
import StreetView, { type ResolvedPano } from "./StreetView";
import PlayerList from "./PlayerList";
import WaitingBar from "./WaitingBar";

interface Props {
  state: PublicState;
  onHide: (spot: HidingSpot) => void;
  speakingIds?: Set<string>;
}

type Coverage = "unknown" | "checking" | "ok" | "none";

// Snap radius that scales with map zoom: a clicked pixel covers ~metersPerPixel
// meters on the ground, so we search a proportional radius. Zoomed out → wide
// (always finds nearby coverage); zoomed in → tight (snaps to the exact street).
function snapRadius(lat: number, zoom: number): number {
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return Math.min(200000, Math.max(40, Math.round(metersPerPixel * 40)));
}

export default function HidingPhase({ state, onHide, speakingIds }: Props) {
  // `query` is the clicked point we resolve from (only changes on a click, so
  // Street View resolves exactly once per pick). `resolved` is the snapped
  // panorama. Keeping them separate avoids feeding the snap back into the
  // resolver, which could loop and flicker the panorama to blank.
  const [query, setQuery] = useState<LatLng | null>(null);
  const [queryRadius, setQueryRadius] = useState(120);
  const [resolved, setResolved] = useState<ResolvedPano | null>(null);
  const [coverage, setCoverage] = useState<Coverage>("unknown");
  // Intro modal shown once when the hiding phase opens.
  const [showIntro, setShowIntro] = useState(true);

  // --- already hidden: waiting view ---
  if (state.youHaveHidden) {
    return (
      <div className="center-screen">
        <div className="stack" style={{ width: 420, gap: 18 }}>
          <h1 className="title">You're hidden 🫣</h1>
          <p className="muted" style={{ margin: 0 }}>
            Waiting for everyone to pick a hiding spot.
          </p>
          <div className="card stack">
            <WaitingBar
              label="Players hidden"
              current={state.hiddenCount}
              total={state.expectedHiders}
            />
            <PlayerList
              players={state.players}
              showHidden
              hiddenLabel="hidden"
              speakingIds={speakingIds}
            />
          </div>
        </div>
      </div>
    );
  }

  function pick(p: LatLng, zoom: number) {
    setQuery(p);
    setQueryRadius(snapRadius(p.lat, zoom));
    setResolved(null);
    setCoverage("checking");
  }

  function onPano(res: ResolvedPano | null) {
    if (!res) {
      setResolved(null);
      setCoverage("none");
      return;
    }
    // Fires on the initial drop and again each time the player walks, so the
    // pin and the stored hiding spot track their Street View position.
    setResolved(res);
    setCoverage("ok");
  }

  function confirm() {
    if (resolved && coverage === "ok") {
      onHide({ lat: resolved.lat, lng: resolved.lng, panoId: resolved.panoId });
    }
  }

  const canHide = !!resolved && coverage === "ok";
  // Show the pin where Street View actually landed (snapped), falling back to
  // the raw click while the lookup is in flight.
  const markerSpot: LatLng | null = resolved
    ? { lat: resolved.lat, lng: resolved.lng }
    : query;

  return (
    <div className="full-bleed">
      <div className="split">
        <div style={{ position: "relative" }}>
          <MapPicker
            value={markerSpot}
            onChange={pick}
            markerIcon={state.youEmoji}
            coverage
          />

          {/* Presence roster: who's in the game and who has locked a spot. Sits
             behind the intro modal, so it surfaces once the player taps "Let's
             go". Collapses to avatar dots on phones (see .roster in globals). */}
          <div className="roster" role="status" aria-label="Hiding status">
            <div className="roster-head">
              <span>Hiding spots</span>
              <span className="roster-count">
                {state.hiddenCount}/{state.expectedHiders}
              </span>
            </div>
            <div className="roster-list">
              {state.players.map((p) => (
                <div
                  key={p.id}
                  className={`roster-player ${
                    p.hasHidden ? "is-hidden" : "is-waiting"
                  }${p.connected ? "" : " is-off"}`}
                  title={`${p.name} — ${
                    !p.connected
                      ? "offline"
                      : p.hasHidden
                        ? "hidden"
                        : "still picking"
                  }`}
                >
                  <span className="roster-avatar" aria-hidden="true">
                    <EmojiStill emoji={p.emoji} className="emoji-img" />
                  </span>
                  <span className="roster-name">{p.name}</span>
                  <span className="roster-status">
                    {!p.connected ? "off" : p.hasHidden ? "hidden" : "picking…"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {query && (
            <div
              className={`overlay-bar overlay-bar--reveal${
                coverage === "checking" ? " overlay-bar--thinking" : ""
              }`}
            >
              <span className="overlay-bar-msg">
                {/* The "walk around" text persists through checking (the glowing
                   border signals thinking); only a no-coverage spot swaps it. */}
                {coverage === "none" ? (
                  <span style={{ color: "var(--warn)" }}>
                    No Street View there — click closer to a road.
                  </span>
                ) : (
                  <span className="muted">
                    Walk around to your spot, then hide here.
                  </span>
                )}
              </span>
              <button onClick={confirm} disabled={!canHide}>
                Hide here
              </button>
            </div>
          )}
        </div>
        <div style={{ position: "relative", background: "#000" }}>
          {query ? (
            <StreetView
              mode="position"
              position={query}
              radius={queryRadius}
              onPano={onPano}
            />
          ) : (
            <div
              className="muted"
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Street View preview
            </div>
          )}
        </div>
      </div>

      {showIntro && (
        <div className="modal-backdrop" onClick={() => setShowIntro(false)}>
          <div
            className="modal stack"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="ghost modal-x"
              aria-label="Close"
              onClick={() => setShowIntro(false)}
            >
              ✕
            </button>
            <h2 className="title" style={{ margin: 0 }}>
              Pick your hiding spot 🫥
            </h2>
            <ul className="modal-list">
              <li>Click the map to drop your pin</li>
              <li>Zoom into the blue roads for precise Street View placement</li>
            </ul>
            <div className="card stack" style={{ gap: 8 }}>
              <span className="eyebrow">You set the difficulty 🎚️</span>
              <ul className="modal-list muted" style={{ fontSize: 13 }}>
                <li>Hide by street signs, addresses or car plates to leave clues</li>
                <li>Pick somewhere blank to send everyone wandering</li>
              </ul>
            </div>
            <button onClick={() => setShowIntro(false)}>Let's go</button>
          </div>
        </div>
      )}
    </div>
  );
}
