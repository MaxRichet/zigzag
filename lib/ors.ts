import type { LngLat } from "./geo";

// OpenRouteService, côté serveur uniquement (clé ORS_API_KEY).
// Offre Standard : 50 points par itinéraire, 59 points par matrice ;
// par jour 500 matrices et 2 000 itinéraires, partagés par tous les utilisateurs ; 40 par minute.
const BASE = "https://api.openrouteservice.org/v2";
const PROFILE = "driving-car";
const TIMEOUT_MS = 15_000;
/** Rayon (m) pour accrocher une adresse à la route : un commerce au fond d'un parking peut en être loin. */
const SNAP_RADIUS_M = 1000;

export const MAX_ROUTE_POINTS = 50;
export const MAX_MATRIX_POINTS = 59;

export type OrsErrorReason = "quota" | "unroutable" | "unavailable" | "config";

export class OrsError extends Error {
  constructor(
    readonly reason: OrsErrorReason,
    /** Pour « unroutable » : index du point qu'aucune route n'atteint, s'il est connu. */
    readonly index: number | null = null,
  ) {
    super(`ORS : ${reason}${index === null ? "" : ` (point ${index})`}`);
  }
}

export type Leg = { durationS: number; distanceM: number; coordinates: LngLat[] };

async function post(path: string, body: unknown): Promise<unknown> {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new OrsError("config");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new OrsError("unavailable");
  }
  const data = await res.json().catch(() => null);
  if (res.ok && data) return data;
  if (res.status === 429) throw new OrsError("quota");
  // 2010 : « Could not find routable point within a radius of … of specified coordinate 3 »
  const error = (data as { error?: { code?: number; message?: string } } | null)?.error;
  if (typeof error === "object" && error?.code === 2010) {
    const match = /coordinate (\d+)/.exec(error.message ?? "");
    throw new OrsError("unroutable", match ? Number(match[1]) : null);
  }
  if (res.status === 401 || res.status === 403) throw new OrsError("config");
  throw new OrsError("unavailable");
}

/** Durées (s) de chaque point vers chaque autre, en voiture. */
export async function durationMatrix(locations: LngLat[]): Promise<number[][]> {
  const data = (await post(`/matrix/${PROFILE}`, { locations, metrics: ["duration"] })) as {
    durations?: (number | null)[][];
  };
  const durations = data.durations;
  if (!Array.isArray(durations) || durations.length !== locations.length) throw new OrsError("unavailable");
  // Point hors réseau routier : ORS ne l'accroche pas, sa diagonale est null.
  const isolated = durations.findIndex((row, i) => row[i] === null);
  if (isolated !== -1) throw new OrsError("unroutable", isolated);
  // Points accrochés mais non reliés (île sans pont) : on désigne le moins relié.
  if (durations.some((row) => row.includes(null))) {
    const misses = durations.map(
      (row, i) => row.filter((d) => d === null).length + durations.filter((r) => r[i] === null).length,
    );
    throw new OrsError("unroutable", misses.indexOf(Math.max(...misses)));
  }
  return durations as number[][];
}

/** Itinéraire passant par tous les points dans l'ordre, découpé en tronçons. */
export async function route(coordinates: LngLat[]): Promise<Leg[]> {
  const data = (await post(`/directions/${PROFILE}/geojson`, {
    coordinates,
    radiuses: coordinates.map(() => SNAP_RADIUS_M),
    // Les consignes ne servent pas (guidage reporté en V2), mais c'est la seule façon d'obtenir les tronçons.
    instructions: true,
    geometry_simplify: false,
  })) as {
    features?: {
      geometry?: { coordinates?: number[][] };
      properties?: { segments?: { distance: number; duration: number }[]; way_points?: number[] };
    }[];
  };
  const feature = data.features?.[0];
  const line = feature?.geometry?.coordinates;
  const segments = feature?.properties?.segments;
  const wayPoints = feature?.properties?.way_points;
  if (!line || !segments || !wayPoints || segments.length !== coordinates.length - 1) {
    throw new OrsError("unavailable");
  }
  return segments.map((segment, i) => ({
    durationS: segment.duration,
    distanceM: segment.distance,
    // 5 décimales ≈ 1 m : allège la réponse et le stockage local.
    coordinates: line
      .slice(wayPoints[i], wayPoints[i + 1] + 1)
      .map(([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5] as LngLat),
  }));
}

/** Réponse HTTP pour une erreur ORS, avec un message simple pour l'utilisateur. */
export function orsErrorResponse(e: unknown): Response {
  const reason = e instanceof OrsError ? e.reason : "unavailable";
  const [status, message] = {
    quota: [503, "Le calcul d'itinéraire est saturé. Réessayez dans quelques minutes."],
    unroutable: [422, "Une adresse n'est pas accessible en voiture."],
    config: [500, "Le calcul d'itinéraire n'est pas configuré."],
    unavailable: [502, "Le calcul d'itinéraire ne répond pas. Réessayez dans un instant."],
  }[reason] as [number, string];
  const index = e instanceof OrsError ? e.index : null;
  return Response.json({ error: message, reason, index }, { status, headers: { "Cache-Control": "no-store" } });
}
