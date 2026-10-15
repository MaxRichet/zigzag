import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

// Fond de carte du handoff : sol gris clair, rues blanches, eau et parcs désaturés,
// quartiers en capitales grises. Peu de couches = rendu rapide et tracé bien visible.
// Données : tuiles vectorielles MapTiler (schéma OpenMapTiles).

const C = {
  ground: "#EEEFEC",
  minor: "#F7F7F5",
  major: "#FFFFFF",
  water: "#D8DFE3",
  park: "#E1E5DD",
  border: "#C9CBC6",
  label: "#8A8F8C",
};

const NAME: ExpressionSpecification = ["coalesce", ["get", "name:fr"], ["get", "name"]];

const MINOR = ["minor", "service", "track"];
const MAJOR = ["motorway", "trunk", "primary", "secondary", "tertiary"];

/** Largeur d'une route selon le zoom (en px, interpolation exponentielle). */
const width = (stops: [number, number][]) =>
  ["interpolate", ["exponential", 1.6], ["zoom"], ...stops.flat()] as ExpressionSpecification;

export function mapStyle(key: string): StyleSpecification {
  return {
    version: 8,
    glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${key}`,
    sources: {
      omt: { type: "vector", url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${key}` },
    },
    layers: [
      { id: "ground", type: "background", paint: { "background-color": C.ground } },
      {
        id: "park",
        type: "fill",
        source: "omt",
        "source-layer": "park",
        paint: { "fill-color": C.park },
      },
      {
        id: "landcover",
        type: "fill",
        source: "omt",
        "source-layer": "landcover",
        filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "farmland"]]],
        paint: { "fill-color": C.park, "fill-opacity": 0.6 },
      },
      {
        id: "water",
        type: "fill",
        source: "omt",
        "source-layer": "water",
        paint: { "fill-color": C.water },
      },
      {
        id: "waterway",
        type: "line",
        source: "omt",
        "source-layer": "waterway",
        minzoom: 10,
        paint: { "line-color": C.water, "line-width": width([[10, 1], [16, 4]]) },
      },
      {
        id: "border",
        type: "line",
        source: "omt",
        "source-layer": "boundary",
        filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
        paint: { "line-color": C.border, "line-width": 1.5 },
      },
      {
        id: "road-minor",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 12,
        filter: ["in", ["get", "class"], ["literal", MINOR]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": C.minor, "line-width": width([[12, 0.5], [15, 3], [18, 12]]) },
      },
      {
        id: "road-major",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 5,
        filter: ["in", ["get", "class"], ["literal", MAJOR]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": C.major,
          "line-width": width([[5, 0.5], [10, 1.5], [15, 8], [18, 24]]),
        },
      },
      {
        id: "road-label",
        type: "symbol",
        source: "omt",
        "source-layer": "transportation_name",
        minzoom: 14,
        layout: {
          "symbol-placement": "line",
          "text-field": NAME,
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
        },
        paint: { "text-color": C.label, "text-halo-color": C.major, "text-halo-width": 1.5 },
      },
      {
        id: "place-label",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        filter: [
          "in",
          ["get", "class"],
          ["literal", ["city", "town", "village", "suburb", "quarter", "neighbourhood"]],
        ],
        layout: {
          "text-field": NAME,
          "text-font": ["Open Sans Semibold"],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.14,
          "text-size": ["match", ["get", "class"], "city", 12, "town", 11, 10],
          "text-max-width": 8,
        },
        paint: { "text-color": C.label, "text-halo-color": C.ground, "text-halo-width": 1.5 },
      },
    ],
  };
}
