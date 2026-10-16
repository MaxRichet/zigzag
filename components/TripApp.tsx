"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useElementHeight } from "@/hooks/useElementHeight";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNow } from "@/hooks/useNow";
import { useRouting } from "@/hooks/useRouting";
import { useTrip } from "@/hooks/useTrip";
import { draftLine, MAX_STOPS, planCoordinates, routeLines, routePlan, tripPlan } from "@/lib/trip";
import styles from "./Panel.module.css";
import SearchBar from "./SearchBar";
import { ServicePanel } from "./ServicePanel";
import { ComputingPanel, EditPanel, NavigationPanel, panelMeta, ReadyPanel } from "./TripPanels";

// MapLibre est lourd : chargé après le shell, uniquement côté client.
const MapView = dynamic(() => import("./MapView"), { ssr: false });

export default function TripApp() {
  const geo = useGeolocation();
  const { trip, dispatch, hydrated } = useTrip();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const search = useAddressSearch(searchOpen ? query : "", geo.position);
  const panelRef = useRef<HTMLElement>(null);
  const panelHeight = useElementHeight(panelRef);

  const { stops, route, progress } = trip;
  // Une fois le trajet calculé, il part du point enregistré à ce moment-là, même si l'on a bougé depuis.
  const plan = tripPlan(trip, route?.start ?? geo.position);
  // Trajet calculé : ses destinations comprennent les services insérés.
  const shown = plan && route ? routePlan(plan, route) : plan;
  const planKey = JSON.stringify([plan && planCoordinates(plan), trip.arrival, trip.services, route?.legs.length]);
  const routing = useRouting(dispatch, planKey);
  const task = routing.state.status === "computing" ? routing.state.task : null;
  // Les vues avec heures d'arrivée attendent l'heure du navigateur (null au premier rendu).
  const mode =
    task === "optimize" && plan
      ? "computing"
      : !route || !plan || !now
        ? "edit"
        : progress === null
          ? "ready"
          : "navigating";
  const sheet = servicesOpen && (mode === "edit" || mode === "ready");

  const existingIds = useMemo(() => new Set(stops.map((s) => s.id)), [stops]);
  const lines = useMemo(
    () =>
      route
        ? routeLines(route, progress !== null && progress < route.legs.length ? progress : null)
        : task === "optimize" && plan
          ? draftLine(planCoordinates(plan))
          : [],
    // planKey résume plan : pas besoin de recalculer à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route, progress, task, planKey],
  );
  const lastAdded = mode === "edit" && stops.at(-1)?.id === trip.lastAddedId ? trip.lastAddedId : null;
  const geoNotice =
    (geo.status === "denied" || geo.status === "unavailable") && !geo.position
      ? "Position indisponible : la tournée partira de la première adresse."
      : null;
  const error = routing.state.status === "error" ? routing.state : null;

  function closeSearch() {
    setQuery("");
    setSearchOpen(false);
  }

  function closeSheet() {
    if (task === "service") routing.cancel();
    setServicesOpen(false);
  }

  return (
    <div className={styles.app}>
      <MapView
        start={shown?.start ?? geo.position}
        visits={shown?.visits ?? stops}
        highlightId={lastAdded}
        colored={mode === "ready" || mode === "navigating"}
        lines={lines}
        focusLeg={mode === "navigating" && progress !== null && progress < (route?.legs.length ?? 0) ? progress : null}
        bottomInset={panelHeight}
      />
      {(searchOpen || sheet) && (
        <div className={styles.veil} onClick={searchOpen ? closeSearch : closeSheet} aria-hidden="true" />
      )}

      {/* Pendant le calcul et la tournée, on n'ajoute rien (cela changerait le trajet en cours). */}
      {(mode === "edit" || mode === "ready") && (
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          open={searchOpen}
          onOpen={() => {
            closeSheet();
            setSearchOpen(true);
          }}
          onClose={closeSearch}
          search={search}
          origin={geo.position}
          existingIds={existingIds}
          disabled={stops.length >= MAX_STOPS}
          onServices={() => (sheet ? closeSheet() : setServicesOpen(true))}
          servicesOpen={sheet}
          onSelect={(address) => dispatch({ type: "add", stop: address })}
        />
      )}

      <section
        ref={panelRef}
        className={styles.panel}
        data-hidden={searchOpen || undefined}
        data-ready={(hydrated && now !== null) || undefined}
        aria-labelledby="trip-title"
      >
        <header className={styles.panelHeader}>
          <h1 className={styles.logo}>
            zigzag<span className="sr-only"> : l&apos;ordre de visite le plus rapide pour vos tournées</span>
          </h1>
          <p className={styles.meta}>
            {sheet ? "Arrêt de service" : panelMeta(trip, shown, mode === "navigating" ? now : null)}
          </p>
        </header>

        {sheet && (
          <ServicePanel
            stops={(shown?.visits ?? stops).filter((v) => !("category" in v && v.category))}
            hasRoute={mode === "ready"}
            busy={routing.state.status === "computing" && routing.state.task === "service" ? (routing.state.category ?? null) : null}
            error={error?.task === "service" ? error.message : null}
            onPick={(category, beforeId) => {
              const request = { id: crypto.randomUUID(), category, beforeId };
              if (mode === "ready" && shown && route) {
                routing.addService(shown, route, request).then((done) => done && setServicesOpen(false));
              } else {
                dispatch({ type: "addService", request });
                setServicesOpen(false);
              }
            }}
          />
        )}
        {!sheet && mode === "computing" && plan && (
          <ComputingPanel plan={plan} fixedEnd={trip.arrival === "last"} onCancel={routing.cancel} />
        )}
        {!sheet && mode === "ready" && shown && route && now && (
          <ReadyPanel
            plan={shown}
            route={route}
            arrival={trip.arrival}
            services={trip.services}
            now={now}
            dispatch={dispatch}
          />
        )}
        {mode === "navigating" && shown && route && progress !== null && now && (
          <NavigationPanel plan={shown} route={route} progress={progress} now={now} dispatch={dispatch} />
        )}
        {!sheet && mode === "edit" && (
          <EditPanel
            trip={trip}
            plan={plan}
            hasPosition={geo.position !== null}
            geoNotice={geoNotice}
            error={error?.task === "optimize" ? error.message : null}
            onOptimize={() => plan && routing.optimize(plan, trip.arrival, trip.services)}
            dispatch={dispatch}
          />
        )}
      </section>
    </div>
  );
}
