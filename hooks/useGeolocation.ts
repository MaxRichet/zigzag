"use client";

import { useEffect, useState } from "react";
import type { LngLat } from "@/lib/geo";

export type GeolocationState =
  | { status: "pending"; position: null }
  | { status: "granted"; position: LngLat }
  | { status: "denied" | "unavailable"; position: LngLat | null };

/** Suit la position de l'utilisateur (point de départ de la tournée). */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({ status: "pending", position: null });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setState({ status: "unavailable", position: null }));
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => setState({ status: "granted", position: [p.coords.longitude, p.coords.latitude] }),
      (e) =>
        setState((prev) => ({
          status: e.code === e.PERMISSION_DENIED ? "denied" : "unavailable",
          // Une erreur passagère (perte de signal, délai) garde la dernière position connue.
          position: e.code === e.PERMISSION_DENIED ? null : prev.position,
        })),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return state;
}
