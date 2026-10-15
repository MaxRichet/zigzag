"use client";

import { useEffect, useState } from "react";
import { roundLngLat, type LngLat } from "@/lib/geo";
import { MIN_QUERY_LENGTH, type AddressResult } from "@/lib/geocoding";
import { mergeSuggestions, parsePlaces, placesUrl } from "@/lib/places";

const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 6;

export type AddressSearch =
  | { status: "idle"; results: [] }
  | { status: "loading"; results: AddressResult[] }
  | { status: "done"; results: AddressResult[] }
  | { status: "error"; results: []; message: string };

const IDLE: AddressSearch = { status: "idle", results: [] };

/** Autocomplétion (adresses et commerces) : attend une pause dans la frappe et annule les requêtes dépassées. */
export function useAddressSearch(query: string, near: LngLat | null): AddressSearch {
  const [state, setState] = useState<{ query: string; search: AddressSearch }>({ query: "", search: IDLE });
  const q = query.trim();
  // Position arrondie : ne relance pas la recherche à chaque petit déplacement.
  const [lng, lat] = near ? roundLngLat(near) : [null, null];

  useEffect(() => {
    if (q.length < MIN_QUERY_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const near: LngLat | null = lng !== null && lat !== null ? [lng, lat] : null;
      const [addresses, places] = await Promise.all([
        fetchAddresses(q, near, controller.signal),
        fetchPlaces(q, near, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      // Une source en panne n'empêche pas d'afficher l'autre.
      const search: AddressSearch =
        "error" in addresses && "error" in places
          ? { status: "error", results: [], message: addresses.error }
          : {
              status: "done",
              results: mergeSuggestions(
                "results" in addresses ? addresses.results : [],
                "results" in places ? places.results : [],
                q,
                MAX_SUGGESTIONS,
              ),
            };
      setState({ query: q, search });
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

type Outcome = { results: AddressResult[] } | { error: string };

function failure(e: unknown): Outcome {
  return { error: e instanceof TypeError ? "Pas de connexion. Vérifiez le réseau." : "La recherche a échoué." };
}

/** Adresses : Géoplateforme IGN, via notre route (limite de débit, cache). */
async function fetchAddresses(q: string, near: LngLat | null, signal: AbortSignal): Promise<Outcome> {
  const params = new URLSearchParams({ q });
  if (near) {
    params.set("lon", String(near[0]));
    params.set("lat", String(near[1]));
  }
  try {
    const res = await fetch(`/api/geocode?${params}`, { signal });
    const body = await res.json();
    return res.ok ? { results: body.results } : { error: body.error ?? "La recherche a échoué." };
  } catch (e) {
    return failure(e);
  }
}

/** Lieux et commerces : MapTiler, appelé directement avec la clé publique de la carte. */
async function fetchPlaces(q: string, near: LngLat | null, signal: AbortSignal): Promise<Outcome> {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key) return { results: [] };
  try {
    const res = await fetch(placesUrl(q, near, key, MAX_SUGGESTIONS), { signal });
    return res.ok ? { results: parsePlaces(await res.json()) } : { error: "La recherche a échoué." };
  } catch (e) {
    return failure(e);
  }
}
