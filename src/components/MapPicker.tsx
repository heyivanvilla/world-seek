"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/mapsLoader";
import { EARTHY_MAP_STYLE } from "@/lib/mapStyle";
import type { LatLng } from "@/shared/types";

export interface MapMarker extends LatLng {
  color?: string; // hex for a colored dot; omit for a default pin
  label?: string; // short text shown on the marker
  title?: string; // hover tooltip
}

export interface MapLine {
  from: LatLng;
  to: LatLng;
  color?: string;
}

interface Props {
  value?: LatLng | null;
  /** Reports the clicked point and the map's current zoom (for adaptive snapping). */
  onChange?: (p: LatLng, zoom: number) => void;
  markers?: MapMarker[];
  lines?: MapLine[];
  fitToContent?: boolean;
  /** Overlay the blue Street View coverage layer (zoom in to see the streets). */
  coverage?: boolean;
  className?: string;
}

export default function MapPicker({
  value,
  onChange,
  markers,
  lines,
  fitToContent,
  coverage,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const extrasRef = useRef<google.maps.Marker[]>([]);
  const linesRef = useRef<google.maps.Polyline[]>([]);
  const coverageRef = useRef<google.maps.StreetViewCoverageLayer | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);

  // --- init map once ---
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((google) => {
      if (cancelled || !ref.current || mapRef.current) return;
      const map = new google.maps.Map(ref.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        minZoom: 2,
        // Color of the map div behind the tiles — visible in the void past the
        // edges of the world when zoomed out. Match the water tone so it blends.
        backgroundColor: "#5c2a1a",
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: "greedy",
        styles: EARTHY_MAP_STYLE,
      });
      mapRef.current = map;
      if (onChangeRef.current) {
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            onChangeRef.current?.(
              { lat: e.latLng.lat(), lng: e.latLng.lng() },
              map.getZoom() ?? 2,
            );
          }
        });
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- blue Street View coverage overlay (like Pegman on Google Maps) ---
  useEffect(() => {
    if (!ready || !mapRef.current || typeof google === "undefined") return;
    if (coverage && !coverageRef.current) {
      coverageRef.current = new google.maps.StreetViewCoverageLayer();
      coverageRef.current.setMap(mapRef.current);
    } else if (!coverage && coverageRef.current) {
      coverageRef.current.setMap(null);
      coverageRef.current = null;
    }
  }, [ready, coverage]);

  // --- sync the user's draggable pin ---
  useEffect(() => {
    if (!ready || !mapRef.current || typeof google === "undefined") return;
    const map = mapRef.current;
    if (value) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          map,
          draggable: !!onChange,
        });
        if (onChange) {
          userMarkerRef.current.addListener(
            "dragend",
            (e: google.maps.MapMouseEvent) => {
              if (e.latLng) {
                onChangeRef.current?.(
                  { lat: e.latLng.lat(), lng: e.latLng.lng() },
                  map.getZoom() ?? 2,
                );
              }
            },
          );
        }
      }
      userMarkerRef.current.setPosition(value);
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }
  }, [ready, value, onChange]);

  // --- sync static markers + lines (results) ---
  useEffect(() => {
    if (!ready || !mapRef.current || typeof google === "undefined") return;
    const map = mapRef.current;

    extrasRef.current.forEach((m) => m.setMap(null));
    extrasRef.current = [];
    linesRef.current.forEach((l) => l.setMap(null));
    linesRef.current = [];

    (markers ?? []).forEach((m) => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: m.lat, lng: m.lng },
        title: m.title,
        label: m.label
          ? { text: m.label, color: "#2b1a12", fontWeight: "700", fontSize: "11px" }
          : undefined,
        icon: m.color
          ? {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: m.color,
              fillOpacity: 1,
              strokeColor: "#2b1a12",
              strokeWeight: 2,
            }
          : undefined,
      });
      extrasRef.current.push(marker);
    });

    (lines ?? []).forEach((ln) => {
      const poly = new google.maps.Polyline({
        map,
        path: [ln.from, ln.to],
        geodesic: true,
        strokeColor: ln.color ?? "#ffffff",
        strokeOpacity: 0.7,
        strokeWeight: 2,
      });
      linesRef.current.push(poly);
    });

    if (fitToContent) {
      const pts = [
        ...(markers ?? []),
        ...(lines ?? []).flatMap((l) => [l.from, l.to]),
      ];
      if (pts.length === 1) {
        map.setCenter(pts[0]);
        map.setZoom(6);
      } else if (pts.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        pts.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 80);
      }
    }
  }, [ready, markers, lines, fitToContent]);

  return <div ref={ref} className={className} style={{ width: "100%", height: "100%" }} />;
}
