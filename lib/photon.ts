import { lineLengthKm, pointsAlong, type LngLat } from "./geo";
import type { AddressResult } from "./geocoding";

// Lieux par catégorie OpenStreetMap autour du tracé : Photon (komoot), sans clé, usage raisonnable demandé.
// (La recherche de lieux d'OpenRouteService ne renvoie plus rien en France : testé le 16/10/2026.)
const ENDPOINT = "https://photon.komoot.io/api/";
const USER_AGENT = "Zigzag (+https://github.com/MaxRichet/zigzag)";
const TIMEOUT_MS = 8000;
/** Photon renvoie au plus 50 lieux par requête, les plus proches du point donné. */
const PER_REQUEST = 50;
/** Une requête tous les ~8 km de tracé, 12 au plus. */
const SAMPLE_EVERY_KM = 8;
const MAX_REQUESTS = 12;

export class PhotonError extends Error {}

type Feature = {
  geometry?: { coordinates?: unknown };
  properties?: Record<string, unknown>;
};

/** Lieux des catégories `include` dans des boîtes réparties le long du tracé, sans doublons. */
export async function placesAlong(line: LngLat[], include: readonly string[], marginKm: number, fallbackName: string) {
  const length = lineLengthKm(line);
  const count = Math.min(MAX_REQUESTS, Math.max(1, Math.ceil(length / SAMPLE_EVERY_KM)));
  const halfKm = length / count / 2 + marginKm;
  const results = await Promise.allSettled(
    pointsAlong(line, count).map((center) => search(center, halfKm, include)),
  );
  if (results.every((r) => r.status === "rejected")) throw new PhotonError("Photon indisponible");

  const places = new Map<string, AddressResult>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const f of r.value) {
      const place = toPlace(f, fallbackName);
      if (place) places.set(place.id, place);
    }
  }
  return [...places.values()];
}

async function search([lng, lat]: LngLat, halfKm: number, include: readonly string[]): Promise<Feature[]> {
  const dLat = halfKm / 111.32;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  const params = new URLSearchParams({
    include: include.join(","),
    bbox: [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => n.toFixed(5)).join(","),
    lat: lat.toFixed(5),
    lon: lng.toFixed(5),
    limit: String(PER_REQUEST),
    lang: "fr",
  });
  const res = await fetch(`${ENDPOINT}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new PhotonError(`Photon ${res.status}`);
  const data: { features?: Feature[] } = await res.json();
  return data.features ?? [];
}

function toPlace({ geometry, properties: p }: Feature, fallbackName: string): AddressResult | null {
  const c = geometry?.coordinates;
  if (!p || !Array.isArray(c) || typeof c[0] !== "number" || typeof c[1] !== "number") return null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const street = [str(p.housenumber), str(p.street)].filter(Boolean).join(" ");
  const city = [str(p.postcode), str(p.city)].filter(Boolean).join(" ");
  return {
    id: `osm:${str(p.osm_type)}${String(p.osm_id)}`,
    name: str(p.name) || fallbackName,
    city: [street, city].filter(Boolean).join(", "),
    lngLat: [c[0], c[1]],
  };
}
