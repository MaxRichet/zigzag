import type { LngLat } from "./geo";

/** Une adresse trouvée par le géocodage, prête à devenir une étape. */
export type AddressResult = {
  /** Identifiant BAN, stable pour une même adresse. */
  id: string;
  /** « 12 Boulevard des Belges » */
  name: string;
  /** « 69006 Lyon » */
  city: string;
  lngLat: LngLat;
};

// Géoplateforme IGN : remplace api-adresse.data.gouv.fr (fermée fin janvier 2026).
// Sans clé ; 50 requêtes/s par adresse IP (celle du serveur, puisque l'appel passe par /api/geocode).
const ENDPOINT = "https://data.geopf.fr/geocodage/search";
const TIMEOUT_MS = 5000;

export const MIN_QUERY_LENGTH = 3;
export const MAX_QUERY_LENGTH = 200;
export const MAX_RESULTS = 5;

export class GeocodingError extends Error {
  constructor(readonly reason: "rate-limited" | "unavailable") {
    super(`Géocodage : ${reason}`);
  }
}

type Feature = {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
};

/** Autocomplétion d'adresses en France, orientée autour de `near` si connu. */
export async function searchAddresses(query: string, near: LngLat | null): Promise<AddressResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(MAX_RESULTS),
    autocomplete: "1",
    index: "address",
  });
  if (near) {
    params.set("lon", String(near[0]));
    params.set("lat", String(near[1]));
  }

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new GeocodingError("unavailable");
  }
  if (res.status === 429) throw new GeocodingError("rate-limited");
  if (!res.ok) throw new GeocodingError("unavailable");

  const data: { features?: Feature[] } = await res.json().catch(() => ({}));
  return (data.features ?? []).flatMap(toAddress);
}

function toAddress({ geometry, properties: p }: Feature): AddressResult[] {
  const coords = geometry?.coordinates;
  if (
    !p ||
    geometry?.type !== "Point" ||
    !Array.isArray(coords) ||
    typeof coords[0] !== "number" ||
    typeof coords[1] !== "number" ||
    typeof p.id !== "string" ||
    typeof p.name !== "string"
  ) {
    return [];
  }
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  // Pour une commune, le nom est déjà la ville : on affiche le département et la région.
  const city =
    p.type === "municipality" ? str(p.context) : [str(p.postcode), str(p.city)].filter(Boolean).join(" ");
  return [{ id: p.id, name: p.name, city, lngLat: [coords[0], coords[1]] }];
}
