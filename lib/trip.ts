import { isLngLat, type LngLat } from "./geo";
import type { AddressResult } from "./geocoding";
import type { Leg } from "./ors";

/** Une étape de la tournée : une adresse géocodée (coordonnées gardées, pas de re-géocodage). */
export type Stop = AddressResult;

/** Départ : ma position, ou la première adresse de la liste. */
export type Departure = "position" | "first";
/** Arrivée : n'importe où (retour libre), retour au point de départ, ou la dernière adresse de la liste. */
export type Arrival = "free" | "start" | "last";

/** Trajet calculé pour l'ordre actuel des étapes. */
export type Route = {
  /** Point de départ au moment du calcul (la position bouge ensuite). */
  start: LngLat;
  /** Un tronçon par destination : chaque visite, puis le retour au départ s'il est demandé. */
  legs: Leg[];
  /** Temps gagné par rapport à l'ordre saisi (s). */
  savedS: number;
};

export type TripState = {
  /** Étapes dans l'ordre de visite. */
  stops: Stop[];
  /** Dernière adresse ajoutée, mise en avant tant que la liste n'a pas été retouchée. */
  lastAddedId: string | null;
  departure: Departure;
  arrival: Arrival;
  /** Null tant que l'ordre n'est pas calculé, et dès que la tournée change. */
  route: Route | null;
  /** Tournée démarrée : index de la destination en cours (= nombre de destinations atteintes). */
  progress: number | null;
};

export type TripAction =
  | { type: "hydrate"; state: Partial<TripState> }
  | { type: "add"; stop: Stop }
  | { type: "remove"; id: string }
  | { type: "move"; from: number; to: number }
  | { type: "setDeparture"; value: "position" | string }
  | { type: "setArrival"; value: "free" | "start" | string }
  | { type: "optimized"; order: string[]; route: Route }
  | { type: "edit" }
  | { type: "start" }
  | { type: "arrive" }
  | { type: "stop" }
  | { type: "reset" };

/**
 * Plafond d'étapes : une tournée de commercial en compte rarement plus de 15, et il faut rester
 * sous les limites d'OpenRouteService (50 points par itinéraire, 59 par matrice)
 * en gardant de la place pour les services.
 */
export const MAX_STOPS = 25;
export const MIN_STOPS = 2;

export const initialTrip: TripState = {
  stops: [],
  lastAddedId: null,
  departure: "position",
  arrival: "free",
  route: null,
  progress: null,
};

/** Toute modification de la tournée invalide le trajet calculé. */
const changed = (state: TripState, patch: Partial<TripState>): TripState => ({
  ...state,
  lastAddedId: null,
  route: null,
  progress: null,
  ...patch,
});

function moveTo(stops: Stop[], id: string, index: number): Stop[] {
  const stop = stops.find((s) => s.id === id);
  if (!stop) return stops;
  const rest = stops.filter((s) => s.id !== id);
  rest.splice(index < 0 ? rest.length : index, 0, stop);
  return rest;
}

export function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case "hydrate":
      return { ...initialTrip, ...action.state, lastAddedId: null };
    case "add": {
      const duplicate = state.stops.some((s) => s.id === action.stop.id);
      if (duplicate || state.stops.length >= MAX_STOPS) return state;
      return changed(state, { stops: [...state.stops, action.stop], lastAddedId: action.stop.id });
    }
    case "remove":
      return changed(state, { stops: state.stops.filter((s) => s.id !== action.id) });
    case "move": {
      const { from, to } = action;
      const n = state.stops.length;
      if (from === to || from < 0 || to < 0 || from >= n || to >= n) return state;
      const stops = [...state.stops];
      const [moved] = stops.splice(from, 1);
      stops.splice(to, 0, moved);
      return changed(state, { stops });
    }
    case "setDeparture":
      return action.value === "position"
        ? changed(state, { departure: "position" })
        : changed(state, { departure: "first", stops: moveTo(state.stops, action.value, 0) });
    case "setArrival":
      return action.value === "free" || action.value === "start"
        ? changed(state, { arrival: action.value })
        : changed(state, { arrival: "last", stops: moveTo(state.stops, action.value, -1) });
    case "optimized": {
      const byId = new Map(state.stops.map((s) => [s.id, s]));
      const stops = action.order.flatMap((id) => byId.get(id) ?? []);
      if (stops.length !== state.stops.length) return state;
      return { ...state, stops, route: action.route, lastAddedId: null, progress: null };
    }
    case "edit":
      return changed(state, {});
    case "start":
      return state.route ? { ...state, progress: 0 } : state;
    case "arrive":
      return state.route && state.progress !== null
        ? { ...state, progress: Math.min(state.progress + 1, state.route.legs.length) }
        : state;
    case "stop":
      return { ...state, progress: null };
    case "reset":
      return { ...initialTrip, departure: state.departure, arrival: state.arrival };
  }
}

/** Le trajet tel qu'il sera parcouru : point de départ, visites dans l'ordre, retour éventuel. */
export type TripPlan = {
  start: LngLat;
  /** Étape de départ quand on part d'une adresse (sinon on part de ma position). */
  startStop: Stop | null;
  visits: Stop[];
  returnToStart: boolean;
};

export function tripPlan(state: Pick<TripState, "stops" | "departure" | "arrival">, position: LngLat | null): TripPlan | null {
  const fromPosition = state.departure === "position" && position !== null;
  const startStop = fromPosition ? null : (state.stops[0] ?? null);
  const visits = fromPosition ? state.stops : state.stops.slice(1);
  const start = fromPosition ? position : startStop?.lngLat;
  if (!start || state.stops.length < MIN_STOPS) return null;
  return { start, startStop, visits, returnToStart: state.arrival === "start" };
}

/** Coordonnées à relier, dans l'ordre (le départ est répété à la fin pour un retour). */
export function planCoordinates(plan: TripPlan): LngLat[] {
  return [plan.start, ...plan.visits.map((s) => s.lngLat), ...(plan.returnToStart ? [plan.start] : [])];
}

// Palette des tronçons (Okabe-Ito, distincte en deutéranopie), dans l'ordre du handoff.
export const LEG_COLORS = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#D55E00", "#56B4E9", "#111111"];

export const legColor = (index: number) => LEG_COLORS[index % LEG_COLORS.length];

/** Numéro noir sur couleur claire, blanc sur couleur foncée (luminance relative > 0,3). */
export function textColorOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? "#111111" : "#FFFFFF";
}

// --- Sauvegarde locale ---

const isNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

function isStop(s: unknown): s is Stop {
  const o = s as Record<string, unknown> | null;
  return (
    typeof o === "object" &&
    o !== null &&
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.city === "string" &&
    isLngLat(o.lngLat)
  );
}

function isRoute(r: unknown): r is Route {
  const o = r as Record<string, unknown> | null;
  return (
    typeof o === "object" &&
    o !== null &&
    isLngLat(o.start) &&
    isNumber(o.savedS) &&
    Array.isArray(o.legs) &&
    o.legs.every(
      (l: Record<string, unknown>) =>
        isNumber(l?.durationS) && isNumber(l?.distanceM) && Array.isArray(l?.coordinates) && l.coordinates.every(isLngLat),
    )
  );
}

/** Relit la tournée sauvegardée, en ignorant tout ce qui n'a pas la bonne forme. */
export function parseStoredTrip(raw: string | null): Partial<TripState> {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  // Ancien format (étape 3) : la liste des étapes seule.
  if (Array.isArray(data)) return { stops: data.filter(isStop).slice(0, MAX_STOPS) };
  if (typeof data !== "object" || data === null) return {};
  const o = data as Record<string, unknown>;
  const stops = Array.isArray(o.stops) ? o.stops.filter(isStop).slice(0, MAX_STOPS) : [];
  const state: Partial<TripState> = { stops };
  if (o.departure === "position" || o.departure === "first") state.departure = o.departure;
  if (o.arrival === "free" || o.arrival === "start" || o.arrival === "last") state.arrival = o.arrival;
  // Le trajet n'est repris que s'il correspond encore aux étapes (une par visite, plus le retour).
  if (isRoute(o.route)) {
    const plan = tripPlan({ stops, departure: state.departure ?? "first", arrival: state.arrival ?? "free" }, o.route.start);
    if (plan && planCoordinates(plan).length - 1 === o.route.legs.length) {
      state.route = o.route;
      if (isNumber(o.progress) && o.progress >= 0 && o.progress <= o.route.legs.length) {
        state.progress = Math.floor(o.progress);
      }
    }
  }
  return state;
}

/** Ce qui est sauvegardé : tout sauf la mise en avant passagère. */
export function storedTrip({ stops, departure, arrival, route, progress }: TripState): string {
  return JSON.stringify({ stops, departure, arrival, route, progress });
}

// --- Lignes à dessiner sur la carte ---

export type LineFeature = {
  type: "Feature";
  properties: { color: string; opacity: number; draft: boolean };
  geometry: { type: "LineString"; coordinates: LngLat[] };
};

/**
 * Le tracé, un tronçon par couleur. Tournée démarrée : seul le tronçon en cours garde sa couleur,
 * les autres passent en noir à 30 %.
 */
export function routeLines(route: Route, activeLeg: number | null): LineFeature[] {
  return route.legs.map((leg, i) => {
    const muted = activeLeg !== null && i !== activeLeg;
    return {
      type: "Feature",
      properties: { color: muted ? "#111111" : legColor(i), opacity: muted ? 0.3 : 1, draft: false },
      geometry: { type: "LineString", coordinates: leg.coordinates },
    };
  });
}

/** Trait provisoire en pointillés, à vol d'oiseau, pendant le calcul. */
export function draftLine(coordinates: LngLat[]): LineFeature[] {
  return [
    {
      type: "Feature",
      properties: { color: "#111111", opacity: 0.55, draft: true },
      geometry: { type: "LineString", coordinates },
    },
  ];
}
