"use client";

import type { Dispatch } from "react";
import { formatClock, formatDuration, formatKm } from "@/lib/format";
import { navigationLinks } from "@/lib/navigation";
import { countOrders, EXACT_LIMIT } from "@/lib/tsp";
import { serviceCategory } from "@/lib/services-config";
import { legColor, type Route, type Stop, type TripAction, type TripPlan, type TripState } from "@/lib/trip";
import { CrossIcon, ServiceIcon } from "./icons";
import styles from "./Panel.module.css";
import { ComputeList, RouteList } from "./RouteList";
import StopList, { EmptyRoute } from "./StopList";

type Vars = React.CSSProperties & Record<`--${string}`, string | undefined>;

const ARRIVAL_LABEL = { free: "Retour libre", start: "Retour au départ", last: "Arrivée fixe" } as const;

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const later = (now: Date, seconds: number) => new Date(now.getTime() + seconds * 1000);

/** Édition : liste des étapes, départ et arrivée, bouton de calcul (écrans 1 et 3). */
export function EditPanel({
  trip,
  plan,
  hasPosition,
  geoNotice,
  error,
  onOptimize,
  dispatch,
}: {
  trip: TripState;
  plan: TripPlan | null;
  hasPosition: boolean;
  geoNotice: string | null;
  error: string | null;
  onOptimize: () => void;
  dispatch: Dispatch<TripAction>;
}) {
  const { stops, lastAddedId } = trip;
  // La dernière adresse ajoutée est présentée à part, sous la liste (écran 3 du handoff).
  const last = stops.at(-1);
  const newStop = last && last.id === lastAddedId ? last : null;
  const listed = newStop ? stops.slice(0, -1) : stops;
  const startStop = plan?.startStop ?? (hasPosition && trip.departure === "position" ? null : (stops[0] ?? null));

  if (stops.length === 0) {
    return (
      <>
        <h2 id="trip-title" className={styles.title}>
          Aucune adresse
        </h2>
        <p className={styles.text}>
          Ajoutez les adresses de vos visites du jour. Zigzag trouve l&apos;ordre le plus rapide.
        </p>
        <EmptyRoute hasStart={hasPosition} />
        {geoNotice && (
          <p className={styles.notice} role="status">
            {geoNotice}
          </p>
        )}
        <button type="button" className={styles.primary} disabled>
          Optimiser l&apos;ordre
        </button>
        <p className={styles.hint}>2 adresses minimum</p>
      </>
    );
  }

  return (
    <>
      <h2 id="trip-title" className="sr-only">
        Étapes de la tournée
      </h2>
      <StopList
        stops={listed}
        firstIsStart={startStop !== null && startStop.id === stops[0].id}
        onMove={(from, to) => dispatch({ type: "move", from, to })}
        onRemove={(id) => dispatch({ type: "remove", id })}
      />
      {newStop && (
        <div className={styles.newStop} data-alone={!listed.length || undefined}>
          <div className={styles.newStopHeader}>
            <p className={styles.meta}>Nouvelle étape · {plan?.visits.length ?? stops.length}</p>
            <button
              type="button"
              className={styles.remove}
              aria-label={`Retirer ${newStop.name}`}
              onClick={() => dispatch({ type: "remove", id: newStop.id })}
            >
              <CrossIcon size={12} strokeWidth={2} />
            </button>
          </div>
          <p className={styles.newStopName}>{newStop.name}</p>
          <p className={styles.newStopCity}>{newStop.city}</p>
        </div>
      )}
      <ServiceRequests trip={trip} dispatch={dispatch} />
      {stops.length >= 2 && (
        <TripOptions trip={trip} startStop={startStop} hasPosition={hasPosition} dispatch={dispatch} />
      )}
      {geoNotice && (
        <p className={styles.notice} role="status">
          {geoNotice}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="button" className={styles.primary} disabled={!plan} onClick={onOptimize}>
        {newStop ? "Valider la tournée" : "Optimiser l'ordre"}
      </button>
      {stops.length < 2 && <p className={styles.hint}>2 adresses minimum</p>}
    </>
  );
}

/** Services demandés, placés au prochain calcul. */
function ServiceRequests({ trip, dispatch }: { trip: TripState; dispatch: Dispatch<TripAction> }) {
  if (!trip.services.length) return null;
  return (
    <ul className={styles.requests} aria-label="Arrêts de service">
      {trip.services.map((r) => {
        const category = serviceCategory(r.category)!;
        const before = r.beforeId ? trip.stops.find((s) => s.id === r.beforeId) : null;
        return (
          <li key={r.id} className={styles.request}>
            <ServiceIcon svg={category.icon} size={22} />
            <span className={styles.requestText}>
              {category.label} <span>· {before ? `avant ${before.name}` : "meilleur endroit"}</span>
            </span>
            <button
              type="button"
              className={styles.remove}
              aria-label={`Retirer ${category.label}`}
              onClick={() => dispatch({ type: "removeService", id: r.id })}
            >
              <CrossIcon size={12} strokeWidth={2} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Départ (ma position ou une adresse) et arrivée (libre, retour, ou une adresse), en listes natives. */
function TripOptions({
  trip,
  startStop,
  hasPosition,
  dispatch,
}: {
  trip: TripState;
  startStop: Stop | null;
  hasPosition: boolean;
  dispatch: Dispatch<TripAction>;
}) {
  const { stops, arrival } = trip;
  const departureValue = startStop ? startStop.id : "position";
  const arrivalValue = arrival === "last" ? stops.at(-1)!.id : arrival;
  return (
    <div className={styles.options}>
      <label className={styles.option}>
        <span className={styles.optionLabel} id="departure-label">
          Départ
        </span>
        <select aria-labelledby="departure-label" value={departureValue} onChange={(e) => dispatch({ type: "setDeparture", value: e.target.value })}>
          {hasPosition && <option value="position">Ma position</option>}
          {stops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.option}>
        <span className={styles.optionLabel} id="arrival-label">
          Arrivée
        </span>
        <select aria-labelledby="arrival-label" value={arrivalValue} onChange={(e) => dispatch({ type: "setArrival", value: e.target.value })}>
          <option value="free">Libre</option>
          <option value="start">Retour au départ</option>
          {stops
            .filter((s) => s.id !== startStop?.id)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
}

/** Calcul en cours (écran 4). */
export function ComputingPanel({ plan, fixedEnd, onCancel }: { plan: TripPlan; fixedEnd: boolean; onCancel: () => void }) {
  const free = plan.visits.length - (fixedEnd ? 1 : 0);
  const count = countOrders(free);
  return (
    <>
      <h2 id="trip-title" className={styles.computeTitle}>
        Recherche du meilleur ordre
      </h2>
      <div className={styles.progress} role="progressbar" aria-label="Calcul en cours" />
      <p className={styles.computeMeta}>
        {free > EXACT_LIMIT
          ? "Des milliards d'ordres possibles"
          : `${count.toLocaleString("fr-FR")} ordre${count > 1 ? "s" : ""} possible${count > 1 ? "s" : ""} comparé${count > 1 ? "s" : ""}`}
      </p>
      <ComputeList plan={plan} />
      <button type="button" className={styles.secondary} onClick={onCancel}>
        Annuler
      </button>
    </>
  );
}

/** Tournée prête : durée, distance, temps gagné, tronçons (écran 5). */
export function ReadyPanel({
  plan,
  route,
  arrival,
  services,
  now,
  dispatch,
}: {
  plan: TripPlan;
  route: Route;
  arrival: TripState["arrival"];
  services: TripState["services"];
  now: Date;
  dispatch: Dispatch<TripAction>;
}) {
  const skipped = services.filter((r) => route.skipped.includes(r.id));
  const totalS = sum(route.legs.map((l) => l.durationS));
  const savedMin = Math.round(route.savedS / 60);
  return (
    <>
      <h2 id="trip-title" className="sr-only">
        Tournée prête
      </h2>
      <div className={styles.summary}>
        <p className={styles.total}>{formatDuration(totalS)}</p>
        <div className={styles.summarySide}>
          {savedMin > 0 && (
            <span className={styles.badge} title="Temps gagné par rapport à l'ordre saisi">
              −{savedMin} min
            </span>
          )}
          <span className={styles.distance}>{formatKm(sum(route.legs.map((l) => l.distanceM)))}</span>
          <span className={styles.eta}>
            {ARRIVAL_LABEL[arrival]} · fin {formatClock(later(now, totalS))}
          </span>
        </div>
      </div>
      <RouteList plan={plan} route={route} now={now} />
      {skipped.map((r) => (
        <p key={r.id} className={styles.notice} role="status">
          {serviceCategory(r.category)?.none} près du trajet : arrêt non ajouté.
        </p>
      ))}
      <button type="button" className={styles.primary} onClick={() => dispatch({ type: "start" })}>
        Démarrer la tournée
      </button>
      <button type="button" className={styles.link} onClick={() => dispatch({ type: "edit" })}>
        Modifier la tournée
      </button>
    </>
  );
}

/** Tournée en cours : destination suivante, ouverture dans l'appli de guidage, « Je suis arrivé ». */
export function NavigationPanel({
  plan,
  route,
  progress,
  now,
  dispatch,
}: {
  plan: TripPlan;
  route: Route;
  progress: number;
  now: Date;
  dispatch: Dispatch<TripAction>;
}) {
  const legs = route.legs;
  const visitCount = plan.visits.filter((v) => !v.category).length;
  if (progress >= legs.length) {
    return (
      <>
        <h2 id="trip-title" className={styles.title}>
          Tournée terminée
        </h2>
        <p className={styles.text}>
          {visitCount} visite{visitCount > 1 ? "s" : ""} ·{" "}
          {formatDuration(sum(legs.map((l) => l.durationS)))} de route ·{" "}
          {formatKm(sum(legs.map((l) => l.distanceM)))}
        </p>
        <button type="button" className={styles.primary} onClick={() => dispatch({ type: "reset" })}>
          Nouvelle tournée
        </button>
        <button type="button" className={styles.secondary} onClick={() => dispatch({ type: "stop" })}>
          Revoir la tournée
        </button>
      </>
    );
  }

  const leg = legs[progress];
  const isReturn = progress >= plan.visits.length;
  const target = isReturn
    ? { name: "Retour au départ", city: plan.startStop?.name ?? "Ma position", lngLat: plan.start }
    : plan.visits[progress];
  const category = !isReturn && plan.visits[progress].category ? serviceCategory(plan.visits[progress].category!) : null;
  // Les adresses sont numérotées ; un service porte son icône.
  const number = plan.visits.slice(0, progress + 1).filter((v) => !v.category).length;
  return (
    <>
      <div className={styles.target}>
        <span
          className={styles.targetDot}
          data-start={isReturn || undefined}
          style={{ "--leg-color": legColor(progress) } as Vars}
          aria-hidden="true"
        >
          {isReturn ? "" : category ? <ServiceIcon svg={category.icon} size={18} /> : number}
        </span>
        <div className={styles.targetText}>
          <h2 id="trip-title" className={styles.targetName}>
            {target.name}
          </h2>
          <p className={styles.targetCity}>{category ? [category.label, target.city].filter(Boolean).join(" · ") : target.city}</p>
        </div>
      </div>
      <div className={styles.legSummary}>
        <span className={styles.legTime}>{formatDuration(leg.durationS)}</span>
        <div className={styles.summarySide}>
          <span className={styles.distance}>{formatKm(leg.distanceM)}</span>
          <span className={styles.eta}>Arrivée {formatClock(later(now, leg.durationS))}</span>
        </div>
      </div>
      <ol className={styles.track} aria-label={`Destination ${progress + 1} sur ${legs.length}`}>
        {legs.map((_, i) => (
          <li
            key={i}
            style={
              {
                "--leg-color": i <= progress ? legColor(i) : "var(--rail)",
                "--fill": i < progress ? legColor(i) : undefined,
                "--next": i < progress ? legColor(i + 1 < legs.length ? i + 1 : i) : undefined,
              } as Vars
            }
          />
        ))}
        <li className={styles.trackEnd} />
      </ol>
      <p className={`${styles.meta} ${styles.appsLabel}`}>Guidage avec</p>
      <div className={styles.apps}>
        {navigationLinks(target.lngLat).map((link) => (
          <a key={link.name} className={styles.secondary} href={link.href} target="_blank" rel="noopener noreferrer">
            {link.name}
          </a>
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => dispatch({ type: "stop" })}>
          Arrêter
        </button>
        <button type="button" className={styles.primary} onClick={() => dispatch({ type: "arrive" })}>
          Je suis arrivé
        </button>
      </div>
    </>
  );
}

/** Méta à droite du logo, selon l'état de la tournée. */
export function panelMeta(trip: TripState, plan: TripPlan | null, now: Date | null): string {
  const { route, progress, stops } = trip;
  if (now && route && plan && progress !== null && progress < route.legs.length) {
    const remainingS = sum(route.legs.slice(progress).map((l) => l.durationS));
    return `Étape ${progress + 1} sur ${route.legs.length} · fin ${formatClock(later(now, remainingS))}`;
  }
  const count = plan ? plan.visits.filter((v) => !v.category).length : stops.length;
  return count ? `Tournée · ${count} arrêt${count > 1 ? "s" : ""}` : "Nouvelle tournée";
}
