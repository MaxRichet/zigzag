"use client";

import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type GeoJSONSource,
  type PaddingOptions,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { LngLat } from "@/lib/geo";
import { mapStyle } from "@/lib/map-style";
import { serviceCategory } from "@/lib/services-config";
import { legColor, textColorOn, type LineFeature, type Visit } from "@/lib/trip";
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
const LINES = "route";
/** Le tracé passe sous les noms de rues et de quartiers. */
const LINES_BEFORE = "road-label";

// MapLibre 6 cherche son worker à côté de son propre fichier, ce que le bundler ne copie pas :
// on lui donne l'URL du worker émis comme asset.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

type Props = {
  /** Point de départ (carré noir) : ma position ou la première adresse, null si inconnu. */
  start: LngLat | null;
  /** Destinations dans l'ordre : adresses numérotées, services avec leur icône. */
  visits: Visit[];
  /** Étape mise en avant (dernière ajoutée), affichée avec son nom. */
  highlightId: string | null;
  /** Étapes colorées selon leur tronçon (une fois le trajet calculé). */
  colored: boolean;
  lines: LineFeature[];
  /** Tronçon sur lequel cadrer (tournée démarrée), sinon toute la tournée. */
  focusLeg: number | null;
  /** Hauteur masquée par le panneau du bas, pour cadrer la carte dans la zone visible. */
  bottomInset: number;
};

export default function MapView({ start, visits, highlightId, colored, lines, focusLeg, bottomInset }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // État et non ref : la carte arrive après le premier rendu, les effets suivants doivent alors s'exécuter.
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const startMarkerRef = useRef<Marker | null>(null);
  const stopMarkersRef = useRef(new Map<string, Marker>());
  const latest = useRef({ start, visits, lines, focusLeg });
  const framedRef = useRef(false);
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  // La carte est créée une seule fois ; les effets suivants la mettent à jour.
  useEffect(() => {
    const container = containerRef.current;
    if (!key || !container) return;
    let created: MapLibreMap | null = null;
    // Créer le contexte WebGL et lire le style est lourd : on laisse d'abord le navigateur
    // afficher la page (après la prochaine image), pour ne pas retarder le texte du panneau.
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        created = createMap(container, key, () => latest.current.lines);
        setMap(created);
      });
    });
    const stopMarkers = stopMarkersRef.current;
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      created?.remove();
      setMap(null);
      startMarkerRef.current = null;
      stopMarkers.clear();
      framedRef.current = false;
    };
  }, [key]);

  useEffect(() => {
    latest.current = { start, visits, lines, focusLeg };
  });

  // Départ : carré noir.
  useEffect(() => {
    if (!map) return;
    if (!start) {
      startMarkerRef.current?.remove();
      startMarkerRef.current = null;
      return;
    }
    if (!startMarkerRef.current) {
      const el = document.createElement("div");
      el.className = styles.start;
      el.setAttribute("aria-label", "Point de départ");
      startMarkerRef.current = new Marker({ element: el }).setLngLat(start).addTo(map);
    } else {
      startMarkerRef.current.setLngLat(start);
    }
  }, [map, start]);

  // Étapes : pastilles numérotées, synchronisées avec la liste (sans recréer celles qui restent).
  useEffect(() => {
    if (!map) return;
    const markers = stopMarkersRef.current;
    const ids = new Set(visits.map((s) => s.id));
    for (const [id, marker] of markers) {
      if (!ids.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
    let number = 0;
    visits.forEach((stop, i) => {
      if (!stop.category) number++;
      let marker = markers.get(stop.id);
      if (!marker) {
        marker = new Marker({ element: document.createElement("div") }).setLngLat(stop.lngLat).addTo(map);
        markers.set(stop.id, marker);
      } else {
        marker.setLngLat(stop.lngLat);
      }
      renderStopMarker(marker.getElement(), stop, number, stop.id === highlightId, colored ? legColor(i) : null);
    });
  }, [map, visits, highlightId, colored]);

  // Tracé (ou trait provisoire pendant le calcul).
  useEffect(() => {
    const source = map?.getSource<GeoJSONSource>(LINES);
    // Avant le chargement du style, la source sera créée avec les dernières lignes (voir « load »).
    source?.setData(collection(lines));
  }, [map, lines]);

  // Cadrage : seulement quand l'ensemble des points change (pas à chaque mouvement de l'utilisateur
  // ni quand on réordonne), ou quand le panneau change de hauteur. Entre-temps, la carte est libre.
  const startKnown = start !== null;
  const visitsKey = visits
    .map((s) => s.id)
    .sort()
    .join("|");
  const hasLines = lines.length > 0 && !lines[0].properties.draft;
  useEffect(() => {
    if (!map) return;
    const current = latest.current;
    const focused = current.focusLeg !== null ? current.lines[current.focusLeg] : undefined;
    const points = focused
      ? focused.geometry.coordinates
      : [
          ...(current.start ? [current.start] : []),
          ...current.visits.map((s) => s.lngLat),
          ...(hasLines ? current.lines.flatMap((l) => l.geometry.coordinates) : []),
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
  }, [map, startKnown, visitsKey, hasLines, focusLeg, bottomInset]);

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

const collection = (features: LineFeature[]) => ({ type: "FeatureCollection" as const, features });

/**
 * Pastille numérotée : blanche avant calcul, pleine à la couleur de son tronçon après.
 * La dernière étape ajoutée est un point noir avec son nom.
 */
function renderStopMarker(el: HTMLElement, stop: Visit, num: number, highlighted: boolean, color: string | null) {
  // classList et pas className : MapLibre a posé ses propres classes sur l'élément.
  el.classList.toggle(styles.stop, !highlighted);
  el.classList.toggle(styles.newStop, highlighted);
  el.classList.toggle(styles.colored, color !== null && !highlighted);
  el.style.setProperty("--leg-color", color);
  el.style.setProperty("--leg-text", color && textColorOn(color));
  const category = stop.category ? serviceCategory(stop.category) : null;
  el.setAttribute("aria-label", category ? `${category.label} : ${stop.name}` : `Étape ${num} : ${stop.name}`);
  if (category) {
    // Icône constante de lib/services-config.ts (pas de donnée externe).
    el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round">${category.icon}</svg>`;
  } else if (highlighted) {
    const label = document.createElement("span");
    label.className = styles.label;
    label.textContent = stop.name;
    el.replaceChildren(label);
  } else {
    el.textContent = String(num);
  }
}

/** Carte au style Zigzag, rotation désactivée, avec les calques du tracé (ajoutés au chargement du style). */
function createMap(container: HTMLElement, key: string, getLines: () => LineFeature[]): MapLibreMap {
  const map = new MapLibreMap({
    container,
    style: mapStyle(key),
    bounds: FRANCE,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    maxPitch: 0,
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.on("load", () => {
    map.addSource(LINES, { type: "geojson", data: collection(getLines()) });
    const solid = ["!", ["get", "draft"]] as ["!", ["get", string]];
    // Liseré blanc 12px sous un trait de 7px à la couleur du tronçon, angles vifs.
    map.addLayer(
      {
        id: "route-casing",
        type: "line",
        source: LINES,
        filter: solid,
        layout: { "line-join": "miter", "line-cap": "butt" },
        paint: { "line-color": "#FFFFFF", "line-width": 12, "line-opacity": ["get", "opacity"] },
      },
      LINES_BEFORE,
    );
    map.addLayer(
      {
        id: "route-line",
        type: "line",
        source: LINES,
        filter: solid,
        layout: { "line-join": "miter", "line-cap": "butt" },
        paint: { "line-color": ["get", "color"], "line-width": 7, "line-opacity": ["get", "opacity"] },
      },
      LINES_BEFORE,
    );
    map.addLayer(
      {
        id: "route-draft",
        type: "line",
        source: LINES,
        filter: ["get", "draft"],
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-opacity": ["get", "opacity"],
          "line-dasharray": [2, 1.33],
        },
      },
      LINES_BEFORE,
    );
  });
  return map;
}
