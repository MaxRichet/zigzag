import type { NextRequest } from "next/server";
import { isLngLat } from "@/lib/geo";
import { durationMatrix, MAX_MATRIX_POINTS, orsErrorResponse } from "@/lib/ors";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { pathCost, solveOrder } from "@/lib/tsp";

// Le quota ORS (500 matrices par jour) est partagé par tous : un même appareil ne doit pas l'épuiser.
const allow = createRateLimiter({ limit: 10, windowMs: 60_000 });

/**
 * POST /api/optimize { locations: [départ, ...visites], end: "free" | "start" | "last" }
 * → { order: index des points dans l'ordre de passage (départ en premier, sans le retour), savedS }
 */
export async function POST(request: NextRequest) {
  if (!allow(clientKey(request.headers))) {
    return error(429, "Trop de calculs d'affilée. Réessayez dans une minute.");
  }
  const body = await request.json().catch(() => null);
  const locations: unknown = body?.locations;
  const end: unknown = body?.end;
  if (
    !Array.isArray(locations) ||
    locations.length < 2 ||
    locations.length > MAX_MATRIX_POINTS ||
    !locations.every(isLngLat) ||
    (end !== "free" && end !== "start" && end !== "last")
  ) {
    return error(400, "Tournée invalide.");
  }

  try {
    const durations = await durationMatrix(locations);
    const endIndex = end === "free" ? null : end === "start" ? 0 : locations.length - 1;
    const path = solveOrder(durations, 0, endIndex);
    const entered = locations.map((_, i) => i);
    if (endIndex === 0) entered.push(0);
    const savedS = Math.max(0, pathCost(durations, entered) - pathCost(durations, path));
    return Response.json(
      { order: endIndex === 0 ? path.slice(0, -1) : path, savedS },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return orsErrorResponse(e);
  }
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
