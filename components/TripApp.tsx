"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useElementHeight } from "@/hooks/useElementHeight";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useTrip } from "@/hooks/useTrip";
import { MAX_STOPS } from "@/lib/trip";
import SearchBar from "./SearchBar";
import StopList, { EmptyRoute } from "./StopList";
import { CrossIcon } from "./icons";
import styles from "./TripApp.module.css";

// MapLibre est lourd : chargé après le shell, uniquement côté client.
const MapView = dynamic(() => import("./MapView"), { ssr: false });

export default function TripApp() {
  const geo = useGeolocation();
  const { trip, dispatch } = useTrip();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const search = useAddressSearch(searchOpen ? query : "", geo.position);
  const panelRef = useRef<HTMLElement>(null);
  const panelHeight = useElementHeight(panelRef);

  const { stops, lastAddedId } = trip;
  const existingIds = useMemo(() => new Set(stops.map((s) => s.id)), [stops]);
  // La dernière adresse ajoutée est présentée à part, sous la liste (écran 3 du handoff).
  const last = stops.at(-1);
  const newStop = last && last.id === lastAddedId ? last : null;
  const listed = newStop ? stops.slice(0, -1) : stops;
  const full = stops.length >= MAX_STOPS;

  function closeSearch() {
    setQuery("");
    setSearchOpen(false);
  }

  return (
    <div className={styles.app}>
      <MapView start={geo.position} stops={stops} highlightId={newStop?.id ?? null} bottomInset={panelHeight} />
      {searchOpen && <div className={styles.veil} onClick={closeSearch} aria-hidden="true" />}

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        open={searchOpen}
        onOpen={() => setSearchOpen(true)}
        onClose={closeSearch}
        search={search}
        origin={geo.position}
        existingIds={existingIds}
        disabled={full}
        onSelect={(address) => dispatch({ type: "add", stop: address })}
      />

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
          <p className={styles.meta}>
            {stops.length ? `Tournée · ${stops.length} arrêt${stops.length > 1 ? "s" : ""}` : "Nouvelle tournée"}
          </p>
        </header>

        {stops.length === 0 ? (
          <>
            <h2 id="trip-title" className={styles.title}>
              Aucune adresse
            </h2>
            <p className={styles.text}>
              Ajoutez les adresses de vos visites du jour. Zigzag trouve l&apos;ordre le plus rapide.
            </p>
            <EmptyRoute hasStart={geo.position !== null} />
          </>
        ) : (
          <>
            <h2 id="trip-title" className="sr-only">
              Étapes de la tournée
            </h2>
            <StopList
              stops={listed}
              onMove={(from, to) => dispatch({ type: "move", from, to })}
              onRemove={(id) => dispatch({ type: "remove", id })}
            />
            {newStop && (
              <div className={styles.newStop} data-alone={!listed.length || undefined}>
                <div className={styles.newStopHeader}>
                  <p className={styles.meta}>Nouvelle étape · {stops.length}</p>
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
          </>
        )}

        {(geo.status === "denied" || geo.status === "unavailable") && !geo.position && (
          <p className={styles.notice} role="status">
            Position indisponible : {stops.length ? "la tournée partira de la première adresse." : "la carte reste centrée sur la France."}
          </p>
        )}
        {full && <p className={styles.hint}>{MAX_STOPS} adresses maximum par tournée.</p>}
        {stops.length < 2 && (
          <>
            <button type="button" className={styles.primary} disabled>
              Optimiser l&apos;ordre
            </button>
            <p className={styles.hint}>2 adresses minimum</p>
          </>
        )}
      </section>
    </div>
  );
}
