"use client";

import { useState } from "react";
import type { HidingSpot, LatLng, PublicState } from "@/shared/types";
import MapPicker from "./MapPicker";
import StreetView, { type ResolvedPano } from "./StreetView";
import PlayerList from "./PlayerList";
import WaitingBar from "./WaitingBar";

interface Props {
  state: PublicState;
  onHide: (spot: HidingSpot) => void;
  onForce: () => void;
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

export default function HidingPhase({ state, onHide, onForce }: Props) {
  // `query` is the clicked point we resolve from (only changes on a click, so
  // Street View resolves exactly once per pick). `resolved` is the snapped
  // panorama. Keeping them separate avoids feeding the snap back into the
  // resolver, which could loop and flicker the panorama to blank.
  const [query, setQuery] = useState<LatLng | null>(null);
  const [queryRadius, setQueryRadius] = useState(120);
  const [resolved, setResolved] = useState<ResolvedPano | null>(null);
  const [coverage, setCoverage] = useState<Coverage>("unknown");

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
              onForce={state.youAreGameMaster ? onForce : undefined}
            />
            <PlayerList
              players={state.players}
              youId={state.youId}
              showHidden
              hiddenLabel="hidden"
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
          <div className="overlay-top">
            Click the map to drop in · zoom in (blue roads) for precise placement
          </div>
          <MapPicker value={markerSpot} onChange={pick} coverage />
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

      <div className="overlay-bar">
        {!query && <span className="muted">Pick somewhere on the map to begin.</span>}
        {coverage === "checking" && <span className="muted">Checking Street View…</span>}
        {coverage === "none" && (
          <span style={{ color: "var(--warn)" }}>
            No Street View there — click closer to a road.
          </span>
        )}
        {coverage === "ok" && (
          <span className="muted">
            Walk around to your spot, then hide here.
          </span>
        )}
        <button onClick={confirm} disabled={!canHide}>
          Hide here
        </button>
      </div>
    </div>
  );
}
