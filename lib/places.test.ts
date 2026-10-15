import { describe, expect, it } from "vitest";
import type { AddressResult } from "./geocoding";
import { mergeSuggestions, parsePlaces, placesUrl } from "./places";

const r = (id: string): AddressResult => ({ id, name: id, city: "", lngLat: [0, 0] });
const ids = (list: AddressResult[]) => list.map((x) => x.id);

describe("placesUrl", () => {
  it("cherche les points d'intérêt en France, autour de la position", () => {
    const url = new URL(placesUrl("carrefour paris", [2.35, 48.86], "KEY", 6));
    expect(url.pathname).toBe("/geocoding/carrefour%20paris.json");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      key: "KEY",
      types: "poi",
      country: "fr",
      language: "fr",
      limit: "6",
      proximity: "2.35,48.86",
    });
  });
});

describe("parsePlaces", () => {
  it("garde le nom du lieu et son adresse, sans le pays", () => {
    const data = {
      features: [
        { id: "poi.1", text: "Carrefour", place_name: "Carrefour, 50 Rue de Vouillé, 75015 Paris, France", center: [2.3, 48.83] },
        { id: "poi.2", text: "Sans position", place_name: "Sans position, France" },
      ],
    };
    expect(parsePlaces(data)).toEqual([
      { id: "poi.1", name: "Carrefour", city: "50 Rue de Vouillé, 75015 Paris", lngLat: [2.3, 48.83] },
    ]);
  });
});

describe("mergeSuggestions", () => {
  const addresses = ["a1", "a2", "a3", "a4", "a5"].map(r);
  const places = ["p1", "p2", "p3", "p4", "p5", "p6"].map(r);

  it("met les adresses devant quand la saisie commence par un numéro", () => {
    expect(ids(mergeSuggestions(addresses, places, "12 rue", 6))).toEqual(["a1", "a2", "a3", "a4", "a5", "p1"]);
  });

  it("sinon, les lieux d'abord, en gardant 2 places pour les adresses", () => {
    expect(ids(mergeSuggestions(addresses, places, "carrefour", 6))).toEqual(["p1", "p2", "p3", "p4", "a1", "a2"]);
  });

  it("complète avec l'autre source quand l'une a peu de résultats", () => {
    expect(ids(mergeSuggestions(addresses.slice(0, 1), places, "carrefour", 6))).toEqual(["p1", "p2", "p3", "p4", "p5", "a1"]);
    expect(ids(mergeSuggestions(addresses, places.slice(0, 1), "carrefour", 6))).toEqual(["p1", "a1", "a2", "a3", "a4", "a5"]);
  });
});
