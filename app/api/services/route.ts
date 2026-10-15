import type { NextRequest } from "next/server";
import { isLngLat, type LngLat } from "@/lib/geo";
import { MAX_MATRIX_POINTS, MAX_ROUTE_POINTS, orsErrorResponse, rawDurationMatrix } from "@/lib/ors";
import { PhotonError, placesAlong } from "@/lib/photon";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { bestInsertion, nearestToRoute } from "@/lib/service-insertion";
import { serviceCategory } from "@/lib/services-config";

const allow = createRateLimiter({ limit: 10, windowMs: 60_000 });

/** Rayon autour du tracé, élargi une fois si rien n'est trouvé. */
const RADIUS_KM = 0.5;
const WIDER_RADIUS_KM = 2;
/** Candidats comparés par la matrice de durées (limitée à 59 points avec ceux du trajet). */
const MAX_CANDIDATES = 12;
const MAX_LINE_POINTS = 5000;

/**
 * POST /api/services { category, points: points du trajet dans l'ordre, legs: tracé de chaque tronçon,
 *   leg: tronçon imposé (« avant l'adresse X ») ou null (meilleur endroit) }
 * → { place, leg: tronçon où l'insérer, detourS }
 */
export async function POST(request: NextRequest) {
  if (!allow(clientKey(request.headers))) {
    return error(429, "Trop de recherches d'affilée. Réessayez dans une minute.");
  }
  const body = await request.json().catch(() => null);
  const category = serviceCategory(body?.category);
  const points: unknown = body?.points;
  const legs: unknown = body?.legs;
  const leg: unknown = body?.leg ?? null;
  if (
    !category ||
    !Array.isArray(points) ||
    points.length < 2 ||
    points.length > MAX_ROUTE_POINTS - 1 ||
    !points.every(isLngLat) ||
    !Array.isArray(legs) ||
    legs.length !== points.length - 1 ||
    !legs.every((l) => Array.isArray(l) && l.length > 0 && l.every(isLngLat)) ||
    legs.reduce((n: number, l: unknown[]) => n + l.length, 0) > MAX_LINE_POINTS ||
    (leg !== null && (!Number.isInteger(leg) || (leg as number) < 0 || (leg as number) >= legs.length))
  ) {
    return error(400, "Demande invalide.");
  }

  const scope = leg === null ? legs.map((_, i) => i) : [leg as number];
  const lines = scope.map((i) => legs[i] as LngLat[]);
  let places;
  try {
    places = await placesAlong(lines.flat(), category.osm, WIDER_RADIUS_KM, category.label);
  } catch (e) {
    if (e instanceof PhotonError) return error(502, "La recherche de lieux ne répond pas. Réessayez dans un instant.");
    throw e;
  }
  const max = Math.min(MAX_CANDIDATES, MAX_MATRIX_POINTS - points.length);
  let candidates = nearestToRoute(places, lines, RADIUS_KM, max);
  if (!candidates.length) candidates = nearestToRoute(places, lines, WIDER_RADIUS_KM, max);
  if (!candidates.length) return notFound(category.none);

  try {
    const cost = await rawDurationMatrix([...points, ...candidates.map((c) => c.lngLat)]);
    const best = bestInsertion(cost, points.length, scope);
    if (!best) return notFound(category.none);
    return Response.json(
      { place: candidates[best.candidate], leg: best.leg, detourS: best.detourS },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return orsErrorResponse(e);
  }
}

function notFound(none: string) {
  return Response.json(
    { error: `${none} près du trajet.`, reason: "none" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
