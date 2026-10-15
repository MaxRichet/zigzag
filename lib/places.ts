import type { LngLat } from "./geo";
import type { AddressResult } from "./geocoding";

// Lieux et commerces (« carrefour paris ») : géocodage MapTiler, limité aux points d'intérêt (OSM).
// Appelé depuis le navigateur avec la clé publique MapTiler, restreinte par domaine comme pour la carte.
const ENDPOINT = "https://api.maptiler.com/geocoding";

type Feature = {
  id?: unknown;
  text?: unknown;
  place_name?: unknown;
  center?: unknown;
};

export function placesUrl(query: string, near: LngLat | null, key: string, limit: number): string {
  const params = new URLSearchParams({
    key,
    types: "poi",
    country: "fr",
    language: "fr",
    limit: String(limit),
  });
  if (near) params.set("proximity", `${near[0]},${near[1]}`);
  return `${ENDPOINT}/${encodeURIComponent(query)}.json?${params}`;
}

/** Réponse MapTiler → résultats au même format que les adresses. */
export function parsePlaces(data: { features?: Feature[] }): AddressResult[] {
  return (data.features ?? []).flatMap(({ id, text, place_name, center }) => {
    if (
      typeof id !== "string" ||
      typeof text !== "string" ||
      !Array.isArray(center) ||
      typeof center[0] !== "number" ||
      typeof center[1] !== "number"
    ) {
      return [];
    }
    // « Carrefour, 17 Rue du Docteur Bouchut, 69003 Lyon, France » → « 17 Rue du Docteur Bouchut, 69003 Lyon »
    const full = typeof place_name === "string" ? place_name : "";
    const city = full.replace(`${text}, `, "").replace(/, France$/, "");
    return [{ id, name: text, city: city === text ? "" : city, lngLat: [center[0], center[1]] }];
  });
}

/**
 * Une seule liste de suggestions : si la saisie commence par un numéro, c'est une adresse,
 * les adresses passent devant. Sinon, les lieux d'abord, en gardant 2 places pour les adresses
 * (rues, communes) ; ce qui manque d'un côté est complété par l'autre.
 */
export function mergeSuggestions(
  addresses: AddressResult[],
  places: AddressResult[],
  query: string,
  max: number,
): AddressResult[] {
  if (/^\s*\d/.test(query)) return [...addresses, ...places].slice(0, max);
  const placeCount = Math.min(places.length, Math.max(max - 2, max - addresses.length));
  const addressCount = Math.min(addresses.length, max - placeCount);
  return [...places.slice(0, placeCount), ...addresses.slice(0, addressCount)];
}
