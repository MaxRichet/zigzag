"use client";

import { useEffect, useReducer } from "react";
import { initialTrip, parseStoredStops, tripReducer } from "@/lib/trip";

const STORAGE_KEY = "zigzag:trip";

/** État de la tournée, conservé dans le navigateur pour survivre à un rechargement. */
export function useTrip() {
  const [trip, dispatch] = useReducer(tripReducer, initialTrip);

  // Lecture après le premier rendu : le serveur ne connaît pas le localStorage.
  useEffect(() => {
    try {
      dispatch({ type: "hydrate", stops: parseStoredStops(localStorage.getItem(STORAGE_KEY)) });
    } catch {
      // Stockage bloqué (navigation privée stricte) : la tournée ne sera simplement pas conservée.
    }
  }, []);

  useEffect(() => {
    // Tant que la lecture n'a pas eu lieu, ne pas écraser la tournée sauvegardée.
    if (trip.stops === initialTrip.stops) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trip.stops));
    } catch {
      // Idem : sans stockage, l'app fonctionne quand même.
    }
  }, [trip.stops]);

  return { trip, dispatch };
}
