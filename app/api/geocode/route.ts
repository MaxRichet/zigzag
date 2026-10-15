import type { NextRequest } from "next/server";
import type { LngLat } from "@/lib/geo";
import {
  GeocodingError,
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  searchAddresses,
} from "@/lib/geocoding";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

// Une frappe toutes les 250 ms au plus côté client : 40 requêtes / 10 s laisse de la marge.
const allow = createRateLimiter({ limit: 40, windowMs: 10_000 });

/** GET /api/geocode?q=12 bd des belges&lon=4.85&lat=45.76 */
export async function GET(request: NextRequest) {
  if (!allow(clientKey(request.headers))) {
    return error(429, "Trop de recherches d'affilée. Réessayez dans quelques secondes.");
  }

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  if (q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) {
    return error(400, `La recherche doit faire entre ${MIN_QUERY_LENGTH} et ${MAX_QUERY_LENGTH} caractères.`);
  }

  const lon = Number(params.get("lon"));
  const lat = Number(params.get("lat"));
  const near: LngLat | null =
    params.has("lon") && params.has("lat") && Math.abs(lon) <= 180 && Math.abs(lat) <= 90
      ? [lon, lat]
      : null;

  try {
    const results = await searchAddresses(q, near);
    // Les adresses changent rarement : cache navigateur 1 h, CDN 1 jour.
    return Response.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (e) {
    if (e instanceof GeocodingError && e.reason === "rate-limited") {
      return error(503, "La recherche d'adresses est saturée. Réessayez dans quelques secondes.");
    }
    return error(502, "La recherche d'adresses ne répond pas. Réessayez dans un instant.");
  }
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
