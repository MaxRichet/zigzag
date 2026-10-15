import { distanceToLineKm, type LngLat } from "./geo";

/** Les `max` lieux les plus proches du tracé, à moins de `radiusKm` d'au moins une des lignes. */
export function nearestToRoute<T extends { lngLat: LngLat }>(
  places: T[],
  lines: LngLat[][],
  radiusKm: number,
  max: number,
): T[] {
  return places
    .map((place) => ({ place, d: Math.min(...lines.map((l) => distanceToLineKm(place.lngLat, l))) }))
    .filter(({ d }) => d <= radiusKm)
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map(({ place }) => place);
}

/**
 * Meilleure insertion : `cost` couvre les points du trajet (0 … pointCount-1, dans l'ordre),
 * puis les lieux candidats. Le détour d'un lieu P sur le tronçon A → B vaut
 * durée(A→P) + durée(P→B) − durée(A→B) ; on retient le plus petit sur les tronçons `legs`.
 */
export function bestInsertion(
  cost: (number | null)[][],
  pointCount: number,
  legs: number[],
): { candidate: number; leg: number; detourS: number } | null {
  let best: { candidate: number; leg: number; detourS: number } | null = null;
  for (let p = pointCount; p < cost.length; p++) {
    for (const leg of legs) {
      const [a, b] = [leg, leg + 1];
      const [ap, pb, ab] = [cost[a][p], cost[p][b], cost[a][b]];
      // Lieu injoignable en voiture (zone piétonne, île…) : ignoré.
      if (ap === null || pb === null || ab === null) continue;
      const detourS = Math.max(0, ap + pb - ab);
      if (!best || detourS < best.detourS) best = { candidate: p - pointCount, leg, detourS };
    }
  }
  return best;
}
