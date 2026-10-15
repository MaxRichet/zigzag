import { describe, expect, it } from "vitest";
import { initialTrip, MAX_STOPS, parseStoredStops, tripReducer, type Stop } from "./trip";

const stop = (id: string): Stop => ({ id, name: `Adresse ${id}`, city: "69006 Lyon", lngLat: [4.85, 45.76] });
const withStops = (...ids: string[]) => ({ stops: ids.map(stop), lastAddedId: null });
const ids = (state: { stops: Stop[] }) => state.stops.map((s) => s.id);

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

  it("retoucher la liste retire la mise en avant", () => {
    const added = tripReducer(withStops("a", "b"), { type: "add", stop: stop("c") });
    expect(tripReducer(added, { type: "move", from: 0, to: 1 }).lastAddedId).toBeNull();
    expect(tripReducer(added, { type: "remove", id: "a" }).lastAddedId).toBeNull();
  });

  it("recharge une tournée sauvegardée sans mise en avant", () => {
    const state = tripReducer(initialTrip, { type: "hydrate", stops: [stop("a")] });
    expect(ids(state)).toEqual(["a"]);
    expect(state.lastAddedId).toBeNull();
  });
});

describe("parseStoredStops", () => {
  it("relit des étapes valides", () => {
    expect(parseStoredStops(JSON.stringify([stop("a")]))).toEqual([stop("a")]);
  });

  it("ignore un contenu absent, corrompu ou mal formé", () => {
    expect(parseStoredStops(null)).toEqual([]);
    expect(parseStoredStops("{oups")).toEqual([]);
    expect(parseStoredStops(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(
      parseStoredStops(JSON.stringify([stop("a"), { id: "b", name: "B", city: "", lngLat: [1] }, null])),
    ).toEqual([stop("a")]);
  });
});
