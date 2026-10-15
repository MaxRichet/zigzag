import { describe, expect, it } from "vitest";
import {
  initialTrip,
  legColor,
  MAX_STOPS,
  parseStoredTrip,
  planCoordinates,
  storedTrip,
  textColorOn,
  tripPlan,
  tripReducer,
  type Route,
  type Stop,
  type TripState,
} from "./trip";

const stop = (id: string, x = 0): Stop => ({ id, name: `Adresse ${id}`, city: "69006 Lyon", lngLat: [4.85 + x, 45.76] });
const withStops = (...ids: string[]): TripState => ({ ...initialTrip, stops: ids.map((id, i) => stop(id, i)) });
const ids = (state: { stops: Stop[] }) => state.stops.map((s) => s.id);
const route = (legs: number, visits: Stop[] = []): Route => ({
  start: [4.8, 45.7],
  visits,
  skipped: [],
  savedS: 120,
  legs: Array.from({ length: legs }, () => ({ durationS: 300, distanceM: 2000, coordinates: [[4.8, 45.7], [4.81, 45.71]] })),
});

describe("tripReducer", () => {
  it("ajoute une adresse en fin de tournée et la met en avant", () => {
    const state = tripReducer(withStops("a"), { type: "add", stop: stop("b") });
    expect(ids(state)).toEqual(["a", "b"]);
    expect(state.lastAddedId).toBe("b");
  });

  it("n'ajoute pas deux fois la même adresse", () => {
    const before = withStops("a", "b");
    expect(tripReducer(before, { type: "add", stop: stop("a") })).toBe(before);
  });

  it(`refuse au-delà de ${MAX_STOPS} adresses`, () => {
    const full = withStops(...Array.from({ length: MAX_STOPS }, (_, i) => String(i)));
    expect(tripReducer(full, { type: "add", stop: stop("x") })).toBe(full);
  });

  it("retire une adresse", () => {
    expect(ids(tripReducer(withStops("a", "b", "c"), { type: "remove", id: "b" }))).toEqual(["a", "c"]);
  });

  it("déplace une adresse vers le bas et vers le haut", () => {
    expect(ids(tripReducer(withStops("a", "b", "c"), { type: "move", from: 0, to: 2 }))).toEqual(["b", "c", "a"]);
    expect(ids(tripReducer(withStops("a", "b", "c"), { type: "move", from: 2, to: 0 }))).toEqual(["c", "a", "b"]);
  });

  it("ignore un déplacement hors limites", () => {
    const before = withStops("a", "b");
    expect(tripReducer(before, { type: "move", from: 0, to: 5 })).toBe(before);
    expect(tripReducer(before, { type: "move", from: -1, to: 0 })).toBe(before);
  });

  it("partir d'une adresse la place en tête ; arriver à une adresse la place en dernier", () => {
    const dep = tripReducer(withStops("a", "b", "c"), { type: "setDeparture", value: "c" });
    expect([ids(dep), dep.departure]).toEqual([["c", "a", "b"], "first"]);
    const arr = tripReducer(dep, { type: "setArrival", value: "a" });
    expect([ids(arr), arr.arrival]).toEqual([["c", "b", "a"], "last"]);
    expect(tripReducer(arr, { type: "setArrival", value: "start" }).arrival).toBe("start");
    expect(tripReducer(arr, { type: "setDeparture", value: "position" }).departure).toBe("position");
  });

  it("applique l'ordre optimisé (services ignorés) et garde le trajet", () => {
    const fuel = { ...stop("osm:N1"), category: "carburant" as const };
    const visits = [stop("a"), fuel, stop("b")];
    const state = tripReducer(withStops("a", "b", "c"), { type: "optimized", startId: "c", route: route(3, visits) });
    expect(ids(state)).toEqual(["c", "a", "b"]);
    expect(state.route?.visits).toHaveLength(3);
  });

  it("ignore un ordre qui ne correspond pas aux étapes", () => {
    const before = withStops("a", "b");
    expect(tripReducer(before, { type: "optimized", startId: null, route: route(2, [stop("a"), stop("x")]) })).toBe(before);
  });

  it("ajoute et retire des services ; retirer l'adresse visée renvoie au meilleur endroit", () => {
    let state = tripReducer(withStops("a", "b"), { type: "addService", request: { id: "s1", category: "cafe", beforeId: "b" } });
    expect(state.services).toEqual([{ id: "s1", category: "cafe", beforeId: "b" }]);
    expect(tripReducer(state, { type: "remove", id: "b" }).services[0].beforeId).toBeNull();
    state = tripReducer(state, { type: "removeService", id: "s1" });
    expect(state.services).toEqual([]);
  });

  it("un service ajouté à un trajet prêt remplace le trajet", () => {
    const ready = { ...withStops("a", "b"), route: route(2, [stop("a"), stop("b")]) };
    const next = tripReducer(ready, {
      type: "serviceAdded",
      request: { id: "s1", category: "carburant", beforeId: null },
      route: route(3),
    });
    expect([next.services.length, next.route?.legs.length]).toEqual([1, 3]);
  });

  it("toute modification invalide le trajet et la progression", () => {
    const ready = { ...withStops("a", "b", "c"), route: route(3), progress: 1 };
    for (const action of [
      { type: "add", stop: stop("d") },
      { type: "remove", id: "a" },
      { type: "move", from: 0, to: 1 },
      { type: "setDeparture", value: "b" },
      { type: "setArrival", value: "free" },
      { type: "edit" },
    ] as const) {
      const next = tripReducer(ready, action);
      expect([next.route, next.progress]).toEqual([null, null]);
    }
  });

  it("démarre, avance d'étape en étape sans dépasser la fin, s'arrête", () => {
    let state: TripState = { ...withStops("a", "b"), route: route(2) };
    state = tripReducer(state, { type: "start" });
    expect(state.progress).toBe(0);
    state = tripReducer(tripReducer(tripReducer(state, { type: "arrive" }), { type: "arrive" }), { type: "arrive" });
    expect(state.progress).toBe(2);
    expect(tripReducer(state, { type: "stop" }).progress).toBeNull();
  });

  it("ne démarre pas sans trajet", () => {
    const state = withStops("a", "b");
    expect(tripReducer(state, { type: "start" })).toBe(state);
  });

  it("une nouvelle tournée vide tout sauf les préférences de départ et d'arrivée", () => {
    const state = tripReducer({ ...withStops("a", "b"), arrival: "start", route: route(2) }, { type: "reset" });
    expect([state.stops, state.route, state.arrival]).toEqual([[], null, "start"]);
  });
});

describe("tripPlan", () => {
  const position: [number, number] = [4.8, 45.7];

  it("part de ma position et visite toutes les adresses", () => {
    const plan = tripPlan(withStops("a", "b"), position);
    expect(plan?.start).toEqual(position);
    expect(plan?.visits.map((s) => s.id)).toEqual(["a", "b"]);
    expect(planCoordinates(plan!)).toHaveLength(3);
  });

  it("part de la première adresse sans position, ou si on l'a choisi", () => {
    expect(tripPlan(withStops("a", "b"), null)?.startStop?.id).toBe("a");
    expect(tripPlan({ ...withStops("a", "b"), departure: "first" }, position)?.visits.map((s) => s.id)).toEqual(["b"]);
  });

  it("répète le départ à la fin pour un retour", () => {
    const coords = planCoordinates(tripPlan({ ...withStops("a", "b"), arrival: "start" }, position)!);
    expect(coords).toHaveLength(4);
    expect(coords.at(-1)).toEqual(position);
  });

  it("demande au moins 2 adresses", () => {
    expect(tripPlan(withStops("a"), position)).toBeNull();
  });
});

describe("couleurs", () => {
  it("parcourt la palette en boucle", () => {
    expect([legColor(0), legColor(7)]).toEqual(["#0072B2", "#0072B2"]);
  });

  it("choisit un numéro lisible", () => {
    expect(textColorOn("#E69F00")).toBe("#111111");
    expect(textColorOn("#0072B2")).toBe("#FFFFFF");
    expect(textColorOn("#111111")).toBe("#FFFFFF");
  });
});

describe("parseStoredTrip", () => {
  it("relit une tournée sauvegardée, trajet et progression compris", () => {
    const services = [{ id: "s1", category: "cafe" as const, beforeId: "b" }];
    const visits = [stop("a", 0), { ...stop("osm:N1"), category: "cafe" as const }, stop("b", 1)];
    const state: TripState = { ...withStops("a", "b"), services, arrival: "start", route: route(4, visits), progress: 1 };
    expect(parseStoredTrip(storedTrip(state))).toEqual({
      stops: state.stops,
      services,
      departure: "position",
      arrival: "start",
      route: state.route,
      progress: 1,
    });
  });

  it("relit l'ancien format (liste d'étapes)", () => {
    expect(parseStoredTrip(JSON.stringify([stop("a")]))).toEqual({ stops: [stop("a")] });
  });

  it("écarte un trajet qui ne correspond plus aux étapes", () => {
    const state: TripState = { ...withStops("a", "b"), route: route(5, [stop("a", 0), stop("b", 1)]), progress: 0 };
    expect(parseStoredTrip(storedTrip(state)).route).toBeUndefined();
  });

  it("ignore un contenu absent, corrompu ou mal formé", () => {
    expect(parseStoredTrip(null)).toEqual({});
    expect(parseStoredTrip("{oups")).toEqual({});
    expect(parseStoredTrip(JSON.stringify({ stops: [stop("a"), { id: "b", lngLat: [1] }, null], departure: "x" }))).toEqual({
      stops: [stop("a")],
      services: [],
    });
  });
});
