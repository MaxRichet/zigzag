/** Coordonnées [longitude, latitude], dans l'ordre de MapLibre et du GeoJSON. */
export type LngLat = [number, number];

const EARTH_RADIUS_KM = 6371;

/** Vrai pour un couple [longitude, latitude] valide. */
export function isLngLat(p: unknown): p is LngLat {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    p.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    Math.abs(p[0]) <= 180 &&
    Math.abs(p[1]) <= 90
  );
}

/** Distance à vol d'oiseau, en kilomètres. */
export function distanceKm([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** « 850 m », « 4,2 km », « 37 km » (virgule décimale). */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `${(Math.round(km * 10) / 10).toLocaleString("fr-FR")} km`;
  return `${Math.round(km).toLocaleString("fr-FR")} km`;
}

/** Arrondit une position (≈ 1 km) : suffit pour orienter le géocodage, et le cache s'en sert mieux. */
export function roundLngLat([lng, lat]: LngLat): LngLat {
  return [Math.round(lng * 100) / 100, Math.round(lat * 100) / 100];
}

// --- Géométrie le long d'un tracé (petites distances : projection plane locale, précise à < 1 %) ---

const KM_PER_DEG_LAT = 111.32;

/** Projette en km autour de la latitude `lat0`. */
function project([lng, lat]: LngLat, lat0: number): [number, number] {
  return [lng * KM_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180), lat * KM_PER_DEG_LAT];
}

function segmentDistance(p: [number, number], a: [number, number], b: [number, number]): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/** Distance (km) d'un point au tracé le plus proche. */
export function distanceToLineKm(point: LngLat, line: LngLat[]): number {
  const lat0 = point[1];
  const p = project(point, lat0);
  if (line.length === 1) {
    const q = project(line[0], lat0);
    return Math.hypot(p[0] - q[0], p[1] - q[1]);
  }
  let min = Infinity;
  for (let i = 1; i < line.length; i++) {
    min = Math.min(min, segmentDistance(p, project(line[i - 1], lat0), project(line[i], lat0)));
  }
  return min;
}

/** Simplifie un tracé (Douglas-Peucker) : retire les points à moins de `toleranceKm` de la ligne. */
export function simplifyLine(line: LngLat[], toleranceKm: number): LngLat[] {
  if (line.length <= 2) return line;
  const lat0 = line[0][1];
  const pts = line.map((p) => project(p, lat0));
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let index = -1;
    let max = toleranceKm;
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(pts[i], pts[first], pts[last]);
      if (d > max) {
        max = d;
        index = i;
      }
    }
    if (index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

/** Longueur (km) d'un tracé. */
export function lineLengthKm(line: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += distanceKm(line[i - 1], line[i]);
  return total;
}

/** Points régulièrement espacés le long d'un tracé (le milieu pour un tracé court). */
export function pointsAlong(line: LngLat[], count: number): LngLat[] {
  const length = lineLengthKm(line);
  if (line.length === 1 || length === 0) return [line[0]];
  const targets = Array.from({ length: count }, (_, i) => ((i + 0.5) * length) / count);
  const result: LngLat[] = [];
  let walked = 0;
  for (let i = 1; i < line.length && result.length < count; i++) {
    const step = distanceKm(line[i - 1], line[i]);
    while (result.length < count && targets[result.length] <= walked + step) {
      const t = step === 0 ? 0 : (targets[result.length] - walked) / step;
      const [a, b] = [line[i - 1], line[i]];
      result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
    walked += step;
  }
  return result;
}
