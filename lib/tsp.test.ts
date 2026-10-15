import { describe, expect, it } from "vitest";
import { countOrders, EXACT_LIMIT, pathCost, solveOrder } from "./tsp";

/** Matrice asymétrique pseudo-aléatoire, reproductible. */
function randomMatrix(n: number, seed: number): number[][] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 1000;
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Math.round(rand()))));
}

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((p) => [x, ...p]));
}

/** Meilleur chemin par force brute, pour vérifier le solveur. */
function bruteForce(cost: number[][], start: number, end: number | null): number {
  const free = cost.map((_, i) => i).filter((i) => i !== start && i !== end);
  return Math.min(
    ...permutations(free).map((p) => pathCost(cost, end === null ? [start, ...p] : [start, ...p, end])),
  );
}

const isValidPath = (path: number[], n: number, start: number, end: number | null) => {
  const visits = end === start ? path.slice(0, -1) : path;
  return path[0] === start && (end === null || path.at(-1) === end) && new Set(visits).size === n && visits.length === n;
};

describe("solveOrder", () => {
  it("trouve l'ordre évident sur une ligne droite", () => {
    // Points sur une droite aux abscisses 0, 3, 1, 2 : l'ordre est 0 → 2 → 3 → 1.
    const x = [0, 3, 1, 2];
    const cost = x.map((a) => x.map((b) => Math.abs(a - b)));
    expect(solveOrder(cost, 0, null)).toEqual([0, 2, 3, 1]);
  });

  it.each([
    ["retour libre", null],
    ["arrivée imposée", 4],
    ["retour au départ", 0],
  ] as const)("est exact (%s), comparé à la force brute", (_, end) => {
    for (let seed = 1; seed <= 20; seed++) {
      const cost = randomMatrix(7, seed);
      const path = solveOrder(cost, 0, end);
      expect(isValidPath(path, 7, 0, end)).toBe(true);
      expect(pathCost(cost, path)).toBe(bruteForce(cost, 0, end));
    }
  });

  it("gère zéro ou une étape libre", () => {
    expect(solveOrder([[0]], 0, null)).toEqual([0]);
    expect(solveOrder([[0, 5], [5, 0]], 0, null)).toEqual([0, 1]);
    expect(solveOrder([[0, 5], [5, 0]], 0, 1)).toEqual([0, 1]);
  });

  it("au-delà de la limite exacte, renvoie un chemin valide et bien meilleur que l'ordre saisi", () => {
    const n = 26;
    expect(n - 1).toBeGreaterThan(EXACT_LIMIT);
    for (let seed = 1; seed <= 5; seed++) {
      const cost = randomMatrix(n, seed);
      const start = performance.now();
      const path = solveOrder(cost, 0, null);
      expect(performance.now() - start).toBeLessThan(1000);
      expect(isValidPath(path, n, 0, null)).toBe(true);
      const identity = cost.map((_, i) => i);
      expect(pathCost(cost, path)).toBeLessThan(pathCost(cost, identity) * 0.6);
    }
  });

  it("à la limite exacte, reste rapide", () => {
    const cost = randomMatrix(EXACT_LIMIT + 1, 3);
    const start = performance.now();
    solveOrder(cost, 0, null);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe("countOrders", () => {
  it("vaut n!", () => {
    expect([0, 1, 5, 10].map(countOrders)).toEqual([1, 1, 120, 3628800]);
  });
});
