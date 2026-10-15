import { describe, expect, it } from "vitest";
import { bestInsertion, nearestToRoute } from "./service-insertion";

describe("nearestToRoute", () => {
  const line: [number, number][] = [[4.8, 45.76], [4.9, 45.76]];
  const at = (id: string, lat: number) => ({ id, lngLat: [4.85, lat] as [number, number] });

  it("garde les lieux proches du tracé, du plus proche au plus loin", () => {
    const places = [at("loin", 45.8), at("300m", 45.7627), at("100m", 45.7609)];
    expect(nearestToRoute(places, [line], 0.5, 10).map((p) => p.id)).toEqual(["100m", "300m"]);
    expect(nearestToRoute(places, [line], 0.5, 1).map((p) => p.id)).toEqual(["100m"]);
    expect(nearestToRoute(places, [line], 5, 10)).toHaveLength(3);
  });
});

describe("bestInsertion", () => {
  // Points du trajet : 0 → 1 → 2 ; candidats : 3 (sur le tronçon 0→1), 4 (à l'écart).
  const cost = [
    [0, 100, 200, 50, 300],
    [100, 0, 100, 60, 300],
    [200, 100, 0, 150, 300],
    [50, 60, 150, 0, 300],
    [300, 300, 300, 300, 0],
  ];

  it("choisit le lieu et le tronçon qui ajoutent le moins de temps", () => {
    // Candidat 3 sur 0→1 : 50 + 60 − 100 = 10 s.
    expect(bestInsertion(cost, 3, [0, 1])).toEqual({ candidate: 0, leg: 0, detourS: 10 });
  });

  it("se limite au tronçon imposé (« avant l'adresse X »)", () => {
    // Candidat 3 sur 1→2 : 60 + 150 − 100 = 110 s.
    expect(bestInsertion(cost, 3, [1])).toEqual({ candidate: 0, leg: 1, detourS: 110 });
  });

  it("ignore les lieux injoignables, et renvoie null sans candidat", () => {
    const blocked = cost.map((row, i) => row.map((v, j) => (i === 3 || j === 3 ? null : v)));
    expect(bestInsertion(blocked, 3, [0, 1])?.candidate).toBe(1);
    expect(bestInsertion(cost.slice(0, 3).map((r) => r.slice(0, 3)), 3, [0, 1])).toBeNull();
  });
});
