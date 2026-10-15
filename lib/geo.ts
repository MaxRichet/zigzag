/** Coordonnées [longitude, latitude], dans l'ordre de MapLibre et du GeoJSON. */
export type LngLat = [number, number];

const EARTH_RADIUS_KM = 6371;

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
