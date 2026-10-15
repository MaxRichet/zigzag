"use client";

import { LngLatBounds, Map as MapLibreMap, Marker, setWorkerUrl, type PaddingOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { LngLat } from "@/lib/geo";
import { mapStyle } from "@/lib/map-style";
import type { Stop } from "@/lib/trip";
import styles from "./MapView.module.css";

const FRANCE: [LngLat, LngLat] = [
  [-5.2, 41.3],
  [9.6, 51.1],
];
const USER_ZOOM = 14;
const MAX_FIT_ZOOM = 15;
/** Marges du cadrage : sous la barre de recherche, au-dessus du panneau et de l'attribution. */
const TOP_INSET = 100;
const BOTTOM_EXTRA = 48;
const SIDE_INSET = 40;

// MapLibre 6 cherche son worker à côté de son propre fichier, ce que le bundler ne copie pas :
// on lui donne l'URL du worker émis comme asset.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

type Props = {
  /** Position de départ (utilisateur), ou null si inconnue. */
  start: LngLat | null;
  stops: Stop[];
  /** Étape mise en avant (dernière ajoutée), affichée avec son nom. */
  highlightId: string | null;
  /** Hauteur masquée par le panneau du bas, pour cadrer la carte dans la zone visible. */
  bottomInset: number;
};

export default function MapView({ start, stops, highlightId, bottomInset }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const startMarkerRef = useRef<Marker | null>(null);
  const stopMarkersRef = useRef(new Map<string, Marker>());
  const startRef = useRef(start);
  const stopsRef = useRef(stops);
  const framedRef = useRef(false);
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
    const stopMarkers = stopMarkersRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      startMarkerRef.current = null;
      stopMarkers.clear();
      framedRef.current = false;
    };
  }, [key]);

  useEffect(() => {
    startRef.current = start;
    stopsRef.current = stops;
  });

  // Départ : carré noir, déplacé à chaque nouvelle position.
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
  }, [start]);

  // Étapes : pastilles numérotées, synchronisées avec la liste (sans recréer celles qui restent).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = stopMarkersRef.current;
    const ids = new Set(stops.map((s) => s.id));
    for (const [id, marker] of markers) {
      if (!ids.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
    stops.forEach((stop, i) => {
      let marker = markers.get(stop.id);
      if (!marker) {
        marker = new Marker({ element: document.createElement("div") }).setLngLat(stop.lngLat).addTo(map);
        markers.set(stop.id, marker);
      }
      renderStopMarker(marker.getElement(), stop, i + 1, stop.id === highlightId);
    });
  }, [stops, highlightId]);

  // Cadrage : seulement quand l'ensemble des points change (pas à chaque mouvement de l'utilisateur
  // ni quand on réordonne), ou quand le panneau change de hauteur. Entre-temps, la carte est libre.
  const startKnown = start !== null;
  const stopsKey = stops
    .map((s) => s.id)
    .sort()
    .join("|");
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points = [
      ...(startRef.current ? [startRef.current] : []),
      ...stopsRef.current.map((s) => s.lngLat),
    ];
    const padding: PaddingOptions = {
      top: TOP_INSET,
      bottom: bottomInset + BOTTOM_EXTRA,
      left: SIDE_INSET,
      right: SIDE_INSET,
    };
    const duration = framedRef.current ? 600 : 0;
    framedRef.current = true;
    if (points.length === 0) {
      map.fitBounds(FRANCE, { padding: { ...padding, top: 0, left: 0, right: 0 }, absolutePadding: true, duration: 0 });
    } else if (points.length === 1) {
      map.easeTo({ center: points[0], zoom: USER_ZOOM, padding, duration });
    } else {
      const bounds = new LngLatBounds(points[0], points[0]);
      for (const p of points) bounds.extend(p);
      map.fitBounds(bounds, { padding, absolutePadding: true, maxZoom: MAX_FIT_ZOOM, duration });
    }
  }, [startKnown, stopsKey, bottomInset]);

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

/** Pastille blanche numérotée ; la dernière étape ajoutée est un point noir avec son nom. */
function renderStopMarker(el: HTMLElement, stop: Stop, num: number, highlighted: boolean) {
  // classList et pas className : MapLibre a posé ses propres classes sur l'élément.
  el.classList.toggle(styles.stop, !highlighted);
  el.classList.toggle(styles.newStop, highlighted);
  el.setAttribute("aria-label", `Étape ${num} : ${stop.name}`);
  if (highlighted) {
    const label = document.createElement("span");
    label.className = styles.label;
    label.textContent = stop.name;
    el.replaceChildren(label);
  } else {
    el.textContent = String(num);
  }
}
