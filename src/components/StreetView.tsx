"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/mapsLoader";
import type { LatLng } from "@/shared/types";

export interface ResolvedPano extends LatLng {
  panoId: string;
}

interface Props {
  /**
   * "position": resolve a pano from coords and let the player WALK freely
   * (hiding — they place themselves precisely; onPano reports wherever they end
   * up). "pano": show a specific pano LOCKED in place (guessing — no travel).
   */
  mode: "position" | "pano";
  position?: LatLng | null;
  panoId?: string | null;
  /** Search radius (m) for resolving a pano from `position`. Caller scales it to zoom. */
  radius?: number;
  /** Reports the current pano (id + its real coords) or null if no coverage. */
  onPano?: (pano: ResolvedPano | null) => void;
  className?: string;
}

export default function StreetView({
  mode,
  position,
  panoId,
  radius = 120,
  onPano,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const lockedPanoRef = useRef<string | null>(null);
  const onPanoRef = useRef(onPano);
  onPanoRef.current = onPano;
  const [ready, setReady] = useState(false);
  const locked = mode === "pano";

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((google) => {
      if (cancelled || !ref.current || panoRef.current) return;
      const pano = new google.maps.StreetViewPanorama(ref.current, {
        visible: true,
        // Hide anything that could leak the location's name.
        addressControl: false,
        showRoadLabels: false,
        fullscreenControl: false,
        motionTracking: false,
        motionTrackingControl: false,
        // Hiding: allow walking so the player can place themselves precisely.
        // Guessing: no nav controls (and the guard below blocks any movement).
        linksControl: !locked,
        clickToGo: !locked,
        panControl: false,
      });

      if (locked) {
        // Guessing: snap straight back to the hider's pano on any move attempt.
        pano.addListener("pano_changed", () => {
          const want = lockedPanoRef.current;
          if (want && pano.getPano() !== want) pano.setPano(want);
        });
      } else {
        // Hiding: as the player walks, report wherever they're now standing so
        // the map pin and the stored hiding spot follow them exactly.
        pano.addListener("position_changed", () => {
          const id = pano.getPano();
          const pos = pano.getPosition();
          if (id && pos) {
            onPanoRef.current?.({ panoId: id, lat: pos.lat(), lng: pos.lng() });
          }
        });
      }

      panoRef.current = pano;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [locked]);

  // pano mode — show a specific panorama by id, locked
  useEffect(() => {
    if (!ready || !panoRef.current || mode !== "pano") return;
    if (panoId) {
      lockedPanoRef.current = panoId;
      panoRef.current.setPano(panoId);
    }
  }, [ready, mode, panoId]);

  // position mode — drop into the nearest pano to the clicked point. From there
  // the player walks freely; the position_changed listener reports their spot.
  useEffect(() => {
    if (!ready || !panoRef.current || mode !== "position") return;
    if (!position) return;
    // Ignore this lookup if the click changes before it returns.
    let active = true;
    const sv = new google.maps.StreetViewService();
    sv.getPanorama(
      {
        location: position,
        // Radius scales with map zoom (passed in): wide when zoomed out so a
        // click always finds nearby coverage, tight when zoomed in so it snaps
        // precisely to the street actually clicked instead of a far/parallel one.
        radius,
        preference: google.maps.StreetViewPreference.NEAREST,
        // OUTDOOR = Google's official street imagery only. DEFAULT also returns
        // user photospheres, which (especially when zoomed out) are often indoor
        // or broken and render as a black screen. OUTDOOR always has real imagery.
        source: google.maps.StreetViewSource.OUTDOOR,
      },
      (data, status) => {
        if (!active) return;
        if (
          status === google.maps.StreetViewStatus.OK &&
          data?.location?.pano &&
          panoRef.current
        ) {
          // setPano fires position_changed, which reports the spot upward.
          panoRef.current.setPano(data.location.pano);
        } else {
          onPanoRef.current?.(null);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [ready, mode, position?.lat, position?.lng, radius]);

  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%" }} />
  );
}
