"use client";

import { useRef, useState, type Dispatch } from "react";
import type { Leg } from "@/lib/ors";
import { planCoordinates, type Arrival, type TripAction, type TripPlan } from "@/lib/trip";

export type OptimizeState =
  | { status: "idle" | "computing" }
  | { status: "error"; message: string; key: string };

class OptimizeError extends Error {}

/**
 * Calcule l'ordre le plus rapide (matrice + solveur côté serveur), puis le tracé dans cet ordre.
 * `key` identifie la tournée affichée : une erreur ne reste visible que pour la tournée qui l'a causée.
 */
export function useOptimize(dispatch: Dispatch<TripAction>, key: string) {
  const [state, setState] = useState<OptimizeState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  async function run(plan: TripPlan, arrival: Arrival) {
    const runKey = key;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "computing" });

    // Nom d'un point d'après son index dans la liste envoyée (0 = départ).
    const nameAt = (points: { name: string }[], index: number | null) =>
      index === null ? null : (points[index]?.name ?? null);
    const startName = { name: plan.startStop?.name ?? "Votre position" };

    try {
      const optimized = await post<{ order: number[]; savedS: number }>(
        "/api/optimize",
        {
          locations: [plan.start, ...plan.visits.map((s) => s.lngLat)],
          end: arrival,
        },
        controller.signal,
        (index) => nameAt([startName, ...plan.visits], index),
      );
      const visits = optimized.order.slice(1).map((i) => plan.visits[i - 1]);
      const ordered: TripPlan = { ...plan, visits };
      const { legs } = await post<{ legs: Leg[] }>(
        "/api/route",
        { coordinates: planCoordinates(ordered) },
        controller.signal,
        (index) => nameAt([startName, ...visits, startName], index),
      );
      dispatch({
        type: "optimized",
        order: [...(plan.startStop ? [plan.startStop.id] : []), ...visits.map((s) => s.id)],
        route: { start: plan.start, legs, savedS: optimized.savedS },
      });
      setState({ status: "idle" });
    } catch (e) {
      if (controller.signal.aborted) return;
      setState({
        status: "error",
        key: runKey,
        message:
          e instanceof OptimizeError
            ? e.message
            : e instanceof TypeError
              ? "Pas de connexion. Vérifiez le réseau."
              : "Le calcul a échoué. Réessayez.",
      });
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    setState({ status: "idle" });
  }

  const visible: OptimizeState = state.status === "error" && state.key !== key ? { status: "idle" } : state;
  return { state: visible, run, cancel };
}

async function post<T>(
  url: string,
  body: unknown,
  signal: AbortSignal,
  nameOf: (index: number | null) => string | null,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data as T;
  const name = data.reason === "unroutable" ? nameOf(data.index ?? null) : null;
  throw new OptimizeError(
    name
      ? `« ${name} » n'est pas accessible en voiture. Retirez cette étape ou choisissez une adresse proche.`
      : (data.error ?? "Le calcul a échoué. Réessayez."),
  );
}
