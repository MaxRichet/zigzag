/**
 * Ordre de visite le plus rapide (voyageur de commerce à départ fixe).
 * `cost[i][j]` : durée de i vers j (asymétrique : sens uniques, autoroutes).
 * `end` : point d'arrivée imposé (qui peut être le départ lui-même : retour au point de départ),
 * ou null pour un retour libre.
 */

/** Au-delà, la recherche exacte (2^n × n²) devient trop lente : on passe à l'heuristique. */
export const EXACT_LIMIT = 12;

/** Durée d'un chemin qui passe par `path` dans l'ordre. */
export function pathCost(cost: number[][], path: number[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += cost[path[i - 1]][path[i]];
  return total;
}

/** Nombre d'ordres possibles pour `n` étapes libres (n!), affiché pendant le calcul. */
export function countOrders(n: number): number {
  let count = 1;
  for (let i = 2; i <= n; i++) count *= i;
  return count;
}

/**
 * Renvoie le chemin complet : `start`, toutes les autres étapes dans le meilleur ordre trouvé,
 * puis `end` s'il est imposé. Exact jusqu'à EXACT_LIMIT étapes libres, sinon plus proche voisin + améliorations locales.
 */
export function solveOrder(cost: number[][], start: number, end: number | null): number[] {
  const free = cost.map((_, i) => i).filter((i) => i !== start && i !== end);
  const middle = free.length <= EXACT_LIMIT ? exact(cost, start, end, free) : heuristic(cost, start, end, free);
  return end === null ? [start, ...middle] : [start, ...middle, end];
}

/** Programmation dynamique de Held-Karp sur les sous-ensembles d'étapes libres. */
function exact(cost: number[][], start: number, end: number | null, free: number[]): number[] {
  const n = free.length;
  if (n === 0) return [];
  const size = 1 << n;
  // best[mask * n + j] : durée minimale départ → (étapes de mask) → free[j], j dans mask.
  const best = new Float64Array(size * n).fill(Infinity);
  const prev = new Int8Array(size * n).fill(-1);
  for (let j = 0; j < n; j++) best[(1 << j) * n + j] = cost[start][free[j]];

  for (let mask = 1; mask < size; mask++) {
    for (let j = 0; j < n; j++) {
      const here = best[mask * n + j];
      if (!(mask & (1 << j)) || here === Infinity) continue;
      for (let k = 0; k < n; k++) {
        if (mask & (1 << k)) continue;
        const next = mask | (1 << k);
        const value = here + cost[free[j]][free[k]];
        if (value < best[next * n + k]) {
          best[next * n + k] = value;
          prev[next * n + k] = j;
        }
      }
    }
  }

  const full = size - 1;
  let last = 0;
  let bestTotal = Infinity;
  for (let j = 0; j < n; j++) {
    const total = best[full * n + j] + (end === null ? 0 : cost[free[j]][end]);
    if (total < bestTotal) {
      bestTotal = total;
      last = j;
    }
  }

  const order: number[] = [];
  for (let mask = full, j = last; j !== -1; ) {
    order.push(free[j]);
    const p = prev[mask * n + j];
    mask &= ~(1 << j);
    j = p;
  }
  return order.reverse();
}

/** Plus proche voisin, puis inversions de tronçons (2-opt) et déplacements d'une étape, tant que ça gagne. */
function heuristic(cost: number[][], start: number, end: number | null, free: number[]): number[] {
  const order: number[] = [];
  const left = new Set(free);
  let current = start;
  while (left.size) {
    let nearest = -1;
    for (const i of left) if (nearest === -1 || cost[current][i] < cost[current][nearest]) nearest = i;
    order.push(nearest);
    left.delete(nearest);
    current = nearest;
  }

  // Durées asymétriques : on recalcule le chemin entier pour chaque essai (n³ pour n ≤ 25 : négligeable).
  const total = (o: number[]) => pathCost(cost, end === null ? [start, ...o] : [start, ...o, end]);
  let bestTotal = total(order);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const reversed = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        const t = total(reversed);
        if (t < bestTotal - 1e-9) {
          order.splice(0, order.length, ...reversed);
          bestTotal = t;
          improved = true;
        }
      }
    }
    for (let i = 0; i < order.length; i++) {
      for (let j = 0; j < order.length; j++) {
        if (i === j) continue;
        const moved = [...order];
        const [node] = moved.splice(i, 1);
        moved.splice(j, 0, node);
        const t = total(moved);
        if (t < bestTotal - 1e-9) {
          order.splice(0, order.length, ...moved);
          bestTotal = t;
          improved = true;
        }
      }
    }
  }
  return order;
}
