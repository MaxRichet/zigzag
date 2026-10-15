"use client";

import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { LngLat } from "@/hooks/useGeolocation";
import { mapStyle } from "@/lib/map-style";
import styles from "./MapView.module.css";

const FRANCE: [LngLat, LngLat] = [
  [-5.2, 41.3],
  [9.6, 51.1],
];
const USER_ZOOM = 14;

// MapLibre 6 cherche son worker à côté de son propre fichier, ce que le bundler ne copie pas :
// on lui donne l'URL du worker émis comme asset.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

type Props = {
  /** Position de départ (utilisateur), ou null si inconnue. */
  start: LngLat | null;
  /** Hauteur masquée par le panneau du bas, pour centrer la carte dans la zone visible. */
  bottomInset: number;
};

export default function MapView({ start, bottomInset }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const startMarkerRef = useRef<Marker | null>(null);
  const centeredOnStartRef = useRef(false);
  const bottomInsetRef = useRef(bottomInset);
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  // La carte est créée une seule fois ; les effets suivants la mettent à jour.
  useEffect(() => {
    if (!key || !containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: mapStyle(key),
      bounds: FRANCE,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      maxPitch: 0,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      startMarkerRef.current = null;
      centeredOnStartRef.current = false;
    };
  }, [key]);

  useEffect(() => {
    bottomInsetRef.current = bottomInset;
    const map = mapRef.current;
    if (!map) return;
    const padding = { top: 0, right: 0, left: 0, bottom: bottomInset };
    const apply = () => {
      if (centeredOnStartRef.current) map.easeTo({ padding, duration: 0 });
      else map.fitBounds(FRANCE, { padding: { ...padding, bottom: bottomInset + 20 }, duration: 0 });
    };
    // Ne pas interrompre une animation en cours (centrage sur l'utilisateur) : attendre sa fin.
    if (!map.isMoving()) {
      apply();
      return;
    }
    map.once("moveend", apply);
    return () => {
      map.off("moveend", apply);
    };
  }, [bottomInset]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !start) return;
    if (!startMarkerRef.current) {
      const el = document.createElement("div");
      el.className = styles.start;
      el.setAttribute("aria-label", "Point de départ : ma position");
      startMarkerRef.current = new Marker({ element: el }).setLngLat(start).addTo(map);
    } else {
      startMarkerRef.current.setLngLat(start);
    }
    // On centre une seule fois : ensuite l'utilisateur garde la main sur la carte.
    if (!centeredOnStartRef.current) {
      centeredOnStartRef.current = true;
      map.easeTo({
        center: start,
        zoom: USER_ZOOM,
        padding: { top: 0, right: 0, left: 0, bottom: bottomInsetRef.current },
        duration: 600,
      });
    }
  }, [start]);

  if (!key) {
    return <p className={styles.error}>Carte indisponible : clé MapTiler manquante.</p>;
  }

  return (
    <div
      ref={containerRef}
      className={styles.map}
      style={{ "--inset-bottom": `${bottomInset}px` } as React.CSSProperties}
    />
  );
}
