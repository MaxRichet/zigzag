"use client";

import { useRef, useState, type Dispatch } from "react";
import { simplifyLine } from "@/lib/geo";
import type { AddressResult } from "@/lib/geocoding";
import type { Leg } from "@/lib/ors";
import {
  planCoordinates,
  type Arrival,
  type Route,
  type ServiceRequest,
  type TripAction,
  type TripPlan,
  type Visit,
} from "@/lib/trip";

export type RoutingState =
  | { status: "idle" }
  | { status: "computing"; task: "optimize" | "service"; category?: string }
  | { status: "error"; task: "optimize" | "service"; message: string; key: string };

/** Erreur à montrer telle quelle ; `none` : aucun lieu trouvé pour un service. */
class RoutingError extends Error {
  constructor(
    message: string,
    readonly none = false,
  ) {
    super(message);
  }
}

/** Le tracé envoyé pour chercher les services, allégé (points à moins de 30 m de la ligne retirés). */
const SIMPLIFY_KM = 0.03;

/**
 * Calculs de trajet : ordre le plus rapide puis tracé, et insertion des services un par un.
 * `key` identifie la tournée affichée : une erreur ne reste visible que pour la tournée qui l'a causée.
 */
export function useRouting(dispatch: Dispatch<TripAction>, key: string) {
  const [state, setState] = useState<RoutingState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  /** Lance un calcul (en annulant le précédent) ; vrai s'il a abouti. */
  async function track(
    task: "optimize" | "service",
    category: string | undefined,
    work: (signal: AbortSignal) => Promise<void>,
  ): Promise<boolean> {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const runKey = key;
    setState({ status: "computing", task, category });
    try {
      await work(controller.signal);
      setState({ status: "idle" });
      return true;
    } catch (e) {
      if (controller.signal.aborted) return false;
      setState({
        status: "error",
        task,
        key: runKey,
        message:
          e instanceof RoutingError
            ? e.message
            : e instanceof TypeError
              ? "Pas de connexion. Vérifiez le réseau."
              : "Le calcul a échoué. Réessayez.",
      });
      return false;
    }
  }

  /** Ordre optimal des adresses, tracé, puis services insérés dans ce trajet. */
  function optimize(plan: TripPlan, arrival: Arrival, services: ServiceRequest[]) {
    return track("optimize", undefined, async (signal) => {
      const startName = { name: plan.startStop?.name ?? "Votre position" };
      const optimized = await post<{ order: number[]; savedS: number }>(
        "/api/optimize",
        { locations: [plan.start, ...plan.visits.map((s) => s.lngLat)], end: arrival },
        signal,
        (index) => nameAt([startName, ...plan.visits], index),
      );
      let visits: Visit[] = optimized.order.slice(1).map((i) => plan.visits[i - 1]);
      let legs = await routeLegs({ ...plan, visits }, signal);
      const skipped: string[] = [];
      // Les services sont insérés un par un, le trajet étant recalculé après chacun.
      for (const request of services) {
        try {
          ({ visits, legs } = await insertService({ ...plan, visits }, legs, request, signal));
        } catch (e) {
          if (!(e instanceof RoutingError && e.none)) throw e;
          skipped.push(request.id);
        }
      }
      dispatch({
        type: "optimized",
        startId: plan.startStop?.id ?? null,
        route: { start: plan.start, visits, legs, savedS: optimized.savedS, skipped },
      });
    });
  }

  /** Ajoute un service au trajet déjà calculé, sans changer l'ordre des adresses. */
  function addService(plan: TripPlan, route: Route, request: ServiceRequest) {
    return track("service", request.category, async (signal) => {
      const { visits, legs } = await insertService(plan, route.legs, request, signal);
      dispatch({ type: "serviceAdded", request, route: { ...route, visits, legs } });
    });
  }

  function cancel() {
    controllerRef.current?.abort();
    setState({ status: "idle" });
  }

  const visible: RoutingState = state.status === "error" && state.key !== key ? { status: "idle" } : state;
  return { state: visible, optimize, addService, cancel };
}

async function routeLegs(plan: TripPlan, signal: AbortSignal): Promise<Leg[]> {
  const startName = { name: plan.startStop?.name ?? "Votre position" };
  const { legs } = await post<{ legs: Leg[] }>(
    "/api/route",
    { coordinates: planCoordinates(plan) },
    signal,
    (index) => nameAt([startName, ...plan.visits, startName], index),
  );
  return legs;
}

/** Cherche le lieu qui ajoute le moins de temps, l'insère sur son tronçon et recalcule le tracé. */
async function insertService(plan: TripPlan, legs: Leg[], request: ServiceRequest, signal: AbortSignal) {
  // « Avant l'adresse X » : le tronçon qui arrive à X (le tronçon i mène à la destination i).
  const before = request.beforeId ? plan.visits.findIndex((v) => v.id === request.beforeId) : -1;
  const found = await post<{ place: AddressResult; leg: number }>(
    "/api/services",
    {
      category: request.category,
      points: planCoordinates(plan),
      legs: legs.map((l) => simplifyLine(l.coordinates, SIMPLIFY_KM)),
      leg: before >= 0 ? before : null,
    },
    signal,
    () => null,
  );
  const visit: Visit = { ...found.place, category: request.category };
  const visits = [...plan.visits.slice(0, found.leg), visit, ...plan.visits.slice(found.leg)];
  return { visits, legs: await routeLegs({ ...plan, visits }, signal) };
}

/** Nom d'un point d'après son index dans la liste envoyée (0 = départ). */
const nameAt = (points: { name: string }[], index: number | null) => (index === null ? null : (points[index]?.name ?? null));

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
  throw new RoutingError(
    name
      ? `« ${name} » n'est pas accessible en voiture. Retirez cette étape ou choisissez une adresse proche.`
      : (data.error ?? "Le calcul a échoué. Réessayez."),
    data.reason === "none",
  );
}
