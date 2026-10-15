import type { AddressResult } from "./geocoding";

/** Une étape de la tournée : une adresse géocodée (coordonnées gardées, pas de re-géocodage). */
export type Stop = AddressResult;

export type TripState = {
  /** Étapes dans l'ordre de visite. */
  stops: Stop[];
  /** Dernière adresse ajoutée, mise en avant tant que la liste n'a pas été retouchée. */
  lastAddedId: string | null;
};

export type TripAction =
  | { type: "hydrate"; stops: Stop[] }
  | { type: "add"; stop: Stop }
  | { type: "remove"; id: string }
  | { type: "move"; from: number; to: number };

/**
 * Plafond d'étapes : une tournée de commercial en compte rarement plus de 15, et il faut rester
 * sous les limites d'OpenRouteService (50 points par itinéraire, 3 500 cases par matrice)
 * en gardant de la place pour les services.
 */
export const MAX_STOPS = 25;

export const initialTrip: TripState = { stops: [], lastAddedId: null };

export function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case "hydrate":
      return { stops: action.stops.slice(0, MAX_STOPS), lastAddedId: null };
    case "add": {
      const duplicate = state.stops.some((s) => s.id === action.stop.id);
      if (duplicate || state.stops.length >= MAX_STOPS) return state;
      return { stops: [...state.stops, action.stop], lastAddedId: action.stop.id };
    }
    case "remove":
      return { stops: state.stops.filter((s) => s.id !== action.id), lastAddedId: null };
    case "move": {
      const { from, to } = action;
      const n = state.stops.length;
      if (from === to || from < 0 || to < 0 || from >= n || to >= n) return state;
      const stops = [...state.stops];
      const [moved] = stops.splice(from, 1);
      stops.splice(to, 0, moved);
      return { stops, lastAddedId: null };
    }
  }
}

/** Relit les étapes sauvegardées, en ignorant tout ce qui n'a pas la bonne forme. */
export function parseStoredStops(raw: string | null): Stop[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter(
    (s): s is Stop =>
      typeof s === "object" &&
      s !== null &&
      typeof s.id === "string" &&
      typeof s.name === "string" &&
      typeof s.city === "string" &&
      Array.isArray(s.lngLat) &&
      s.lngLat.length === 2 &&
      s.lngLat.every((n: unknown) => typeof n === "number" && Number.isFinite(n)),
  );
}
