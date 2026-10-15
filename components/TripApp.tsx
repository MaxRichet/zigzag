"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useElementHeight } from "@/hooks/useElementHeight";
import { useGeolocation } from "@/hooks/useGeolocation";
import styles from "./TripApp.module.css";

// MapLibre est lourd : chargé après le shell, uniquement côté client.
const MapView = dynamic(() => import("./MapView"), { ssr: false });

export default function TripApp() {
  const geo = useGeolocation();
  const panelRef = useRef<HTMLElement>(null);
  const panelHeight = useElementHeight(panelRef);

  return (
    <div className={styles.app}>
      <MapView start={geo.position} bottomInset={panelHeight} />

      <section ref={panelRef} className={styles.panel} aria-labelledby="trip-title">
        <header className={styles.panelHeader}>
          <h1 className={styles.logo}>
            zigzag<span className="sr-only"> : l&apos;ordre de visite le plus rapide pour vos tournées</span>
          </h1>
          <p className={styles.meta}>Nouvelle tournée</p>
        </header>
        <h2 id="trip-title" className={styles.title}>
          Aucune adresse
        </h2>
        <p className={styles.text}>
          Ajoutez les adresses de vos visites du jour. Zigzag trouve l&apos;ordre le plus rapide.
        </p>
        {(geo.status === "denied" || geo.status === "unavailable") && !geo.position && (
          <p className={styles.notice} role="status">
            Position indisponible : la carte reste centrée sur la France.
          </p>
        )}
      </section>
    </div>
  );
}
