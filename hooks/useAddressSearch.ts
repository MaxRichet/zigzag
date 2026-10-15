"use client";

import { useEffect, useState } from "react";
import { roundLngLat, type LngLat } from "@/lib/geo";
import { MIN_QUERY_LENGTH, type AddressResult } from "@/lib/geocoding";

const DEBOUNCE_MS = 250;

export type AddressSearch =
  | { status: "idle"; results: [] }
  | { status: "loading"; results: AddressResult[] }
  | { status: "done"; results: AddressResult[] }
  | { status: "error"; results: []; message: string };

const IDLE: AddressSearch = { status: "idle", results: [] };

/** Autocomplétion d'adresse : attend une pause dans la frappe et annule les requêtes dépassées. */
export function useAddressSearch(query: string, near: LngLat | null): AddressSearch {
  const [state, setState] = useState<{ query: string; search: AddressSearch }>({ query: "", search: IDLE });
  const q = query.trim();
  // Position arrondie : ne relance pas la recherche à chaque petit déplacement.
  const [lng, lat] = near ? roundLngLat(near) : [null, null];

  useEffect(() => {
    if (q.length < MIN_QUERY_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ q });
      if (lng !== null && lat !== null) {
        params.set("lon", String(lng));
        params.set("lat", String(lat));
      }
      try {
        const res = await fetch(`/api/geocode?${params}`, { signal: controller.signal });
        const body = await res.json();
        setState({
          query: q,
          search: res.ok
            ? { status: "done", results: body.results }
            : { status: "error", results: [], message: body.error ?? "La recherche a échoué." },
        });
      } catch (e) {
        if (controller.signal.aborted) return;
        setState({
          query: q,
          search: {
            status: "error",
            results: [],
            message: e instanceof TypeError ? "Pas de connexion. Vérifiez le réseau." : "La recherche a échoué.",
          },
        });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, lng, lat]);

  if (q.length < MIN_QUERY_LENGTH) return IDLE;
  if (state.query !== q) {
    // Pendant la frappe, garder les suggestions précédentes si l'on continue la même saisie.
    const sameInput = q.startsWith(state.query) || state.query.startsWith(q);
    return { status: "loading", results: sameInput ? state.search.results : [] };
  }
  return state.search;
}
