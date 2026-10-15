"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useElementHeight } from "@/hooks/useElementHeight";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNow } from "@/hooks/useNow";
import { useOptimize } from "@/hooks/useOptimize";
import { useTrip } from "@/hooks/useTrip";
import { draftLine, MAX_STOPS, planCoordinates, routeLines, tripPlan } from "@/lib/trip";
import styles from "./Panel.module.css";
import SearchBar from "./SearchBar";
import { ComputingPanel, EditPanel, NavigationPanel, panelMeta, ReadyPanel } from "./TripPanels";

// MapLibre est lourd : chargé après le shell, uniquement côté client.
const MapView = dynamic(() => import("./MapView"), { ssr: false });

export default function TripApp() {
  const geo = useGeolocation();
  const { trip, dispatch } = useTrip();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const search = useAddressSearch(searchOpen ? query : "", geo.position);
  const panelRef = useRef<HTMLElement>(null);
  const panelHeight = useElementHeight(panelRef);

  const { stops, route, progress } = trip;
  // Une fois le trajet calculé, il part du point enregistré à ce moment-là, même si l'on a bougé depuis.
  const plan = tripPlan(trip, route?.start ?? geo.position);
  const planKey = JSON.stringify([plan && planCoordinates(plan), trip.arrival]);
  const optimize = useOptimize(dispatch, planKey);
  const computing = optimize.state.status === "computing";
  // Les vues avec heures d'arrivée attendent l'heure du navigateur (null au premier rendu).
  const mode =
    computing && plan ? "computing" : !route || !plan || !now ? "edit" : progress === null ? "ready" : "navigating";

  const existingIds = useMemo(() => new Set(stops.map((s) => s.id)), [stops]);
  const lines = useMemo(
    () =>
      route
        ? routeLines(route, progress !== null && progress < route.legs.length ? progress : null)
        : computing && plan
          ? draftLine(planCoordinates(plan))
          : [],
    // planKey résume plan : pas besoin de recalculer à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route, progress, computing, planKey],
  );
  const lastAdded = mode === "edit" && stops.at(-1)?.id === trip.lastAddedId ? trip.lastAddedId : null;
  const geoNotice =
    (geo.status === "denied" || geo.status === "unavailable") && !geo.position
      ? stops.length
        ? "Position indisponible : la tournée partira de la première adresse."
        : "Position indisponible : la carte reste centrée sur la France."
      : null;

  function closeSearch() {
    setQuery("");
    setSearchOpen(false);
  }

  return (
    <div className={styles.app}>
      <MapView
        start={plan?.start ?? geo.position}
        visits={plan?.visits ?? stops}
        highlightId={lastAdded}
        colored={mode !== "edit" && mode !== "computing"}
        lines={lines}
        focusLeg={mode === "navigating" && progress !== null && progress < (route?.legs.length ?? 0) ? progress : null}
        bottomInset={panelHeight}
      />
      {searchOpen && <div className={styles.veil} onClick={closeSearch} aria-hidden="true" />}

      {/* Pendant le calcul et la tournée, on n'ajoute pas d'adresse (cela changerait le trajet en cours). */}
      {(mode === "edit" || mode === "ready") && (
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          open={searchOpen}
          onOpen={() => setSearchOpen(true)}
          onClose={closeSearch}
          search={search}
          origin={geo.position}
          existingIds={existingIds}
          disabled={stops.length >= MAX_STOPS}
          onSelect={(address) => dispatch({ type: "add", stop: address })}
        />
      )}

      <section
        ref={panelRef}
        className={styles.panel}
        data-hidden={searchOpen || undefined}
        aria-labelledby="trip-title"
      >
        <header className={styles.panelHeader}>
          <h1 className={styles.logo}>
            zigzag<span className="sr-only"> : l&apos;ordre de visite le plus rapide pour vos tournées</span>
          </h1>
          <p className={styles.meta}>{panelMeta(trip, plan, mode === "navigating" ? now : null)}</p>
        </header>

        {mode === "computing" && plan && (
          <ComputingPanel plan={plan} fixedEnd={trip.arrival === "last"} onCancel={optimize.cancel} />
        )}
        {mode === "ready" && plan && route && now && (
          <ReadyPanel plan={plan} route={route} arrival={trip.arrival} now={now} dispatch={dispatch} />
        )}
        {mode === "navigating" && plan && route && progress !== null && now && (
          <NavigationPanel plan={plan} route={route} progress={progress} now={now} dispatch={dispatch} />
        )}
        {mode === "edit" && (
          <EditPanel
            trip={trip}
            plan={plan}
            hasPosition={geo.position !== null}
            geoNotice={geoNotice}
            error={optimize.state.status === "error" ? optimize.state.message : null}
            onOptimize={() => plan && optimize.run(plan, trip.arrival)}
            dispatch={dispatch}
          />
        )}
      </section>
    </div>
  );
}
