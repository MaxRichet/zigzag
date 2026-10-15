/** « 8 min », « 54 min », « 1 h 05 » (jamais « 0 min »). */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

/** « 9:38 », « 14:05 » (heure locale). */
export function formatClock(date: Date): string {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** « 850 m », « 12,4 km », « 128 km » (virgule décimale). */
export function formatKm(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = meters / 1000;
  return `${(km < 100 ? Math.round(km * 10) / 10 : Math.round(km)).toLocaleString("fr-FR")} km`;
}
