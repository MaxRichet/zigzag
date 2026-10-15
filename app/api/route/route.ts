import type { NextRequest } from "next/server";
import { isLngLat } from "@/lib/geo";
import { MAX_ROUTE_POINTS, orsErrorResponse, route } from "@/lib/ors";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const allow = createRateLimiter({ limit: 20, windowMs: 60_000 });

/** POST /api/route { coordinates: points dans l'ordre de passage } → { legs: un tronçon par point d'arrivée } */
export async function POST(request: NextRequest) {
  if (!allow(clientKey(request.headers))) {
    return error(429, "Trop de calculs d'affilée. Réessayez dans une minute.");
  }
  const body = await request.json().catch(() => null);
  const coordinates: unknown = body?.coordinates;
  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    coordinates.length > MAX_ROUTE_POINTS ||
    !coordinates.every(isLngLat)
  ) {
    return error(400, "Trajet invalide.");
  }

  try {
    return Response.json({ legs: await route(coordinates) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return orsErrorResponse(e);
  }
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
