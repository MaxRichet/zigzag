/**
 * Catégories de services à insérer dans la tournée : liste fusionnée du handoff et du brief.
 * `osm` : catégories OpenStreetMap, au format du filtre `include` de Photon (osm.<clé>.<valeur>).
 * `icon` : contenu d'un SVG 24×24 en trait (stroke="currentColor"), affiché dans la tuile,
 * la liste et la pastille sur la carte.
 */
export const SERVICE_CATEGORIES = [
  {
    id: "carburant",
    label: "Carburant",
    none: "Aucune station-service trouvée",
    osm: ["osm.amenity.fuel"],
    icon: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M2.5 21h13M4 10h10M14 8l3.5 3.5V17a1.5 1.5 0 0 0 3 0V8.5L17 5"/>',
  },
  {
    id: "recharge",
    label: "Recharge",
    none: "Aucune borne de recharge trouvée",
    osm: ["osm.amenity.charging_station"],
    icon: '<path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>',
  },
  {
    id: "boulangerie",
    label: "Boulangerie",
    none: "Aucune boulangerie trouvée",
    osm: ["osm.shop.bakery"],
    icon: '<path d="M4.5 19.5c-2-2-.5-6.5 3.5-10.5s8.5-5.5 10.5-3.5.5 6.5-3.5 10.5-8.5 5.5-10.5 3.5zM8.5 12l2.5 2.5M11.5 9l2.5 2.5M14.5 6.5 16.5 8.5"/>',
  },
  {
    id: "courses",
    label: "Courses",
    none: "Aucun supermarché trouvé",
    osm: ["osm.shop.supermarket", "osm.shop.convenience"],
    icon: '<path d="M2.5 4H5l2.4 11h11.1L21 7.5H6.1"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
  },
  {
    id: "pharmacie",
    label: "Pharmacie",
    none: "Aucune pharmacie trouvée",
    osm: ["osm.amenity.pharmacy"],
    icon: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  },
  {
    id: "distributeur",
    label: "Distributeur",
    none: "Aucun distributeur de billets trouvé",
    osm: ["osm.amenity.atm"],
    icon: '<rect x="2.5" y="6" width="19" height="12"/><circle cx="12" cy="12" r="2.5"/>',
  },
  {
    id: "dejeuner",
    label: "Pause déjeuner",
    none: "Aucun restaurant trouvé",
    osm: ["osm.amenity.restaurant", "osm.amenity.fast_food"],
    icon: '<path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17.5 21V3c-2.2 1.2-3.5 4-3.5 8h3.5"/>',
  },
  {
    id: "cafe",
    label: "Café",
    none: "Aucun café trouvé",
    osm: ["osm.amenity.cafe"],
    icon: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8.5 3v3M12.5 3v3"/>',
  },
  {
    id: "toilettes",
    label: "Toilettes",
    none: "Aucunes toilettes publiques trouvées",
    osm: ["osm.amenity.toilets"],
    icon: '<path d="M6 21V3h12v18M3.5 21h17M14.5 12h.5"/>',
  },
  {
    id: "parking",
    label: "Parking",
    none: "Aucun parking trouvé",
    osm: ["osm.amenity.parking"],
    icon: '<rect x="3" y="3" width="18" height="18"/><path d="M9.5 17V7h3.5a3 3 0 0 1 0 6H9.5"/>',
  },
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export type ServiceCategoryId = ServiceCategory["id"];

export function serviceCategory(id: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((c) => c.id === id);
}

export const isServiceCategoryId = (id: unknown): id is ServiceCategoryId =>
  typeof id === "string" && serviceCategory(id) !== undefined;
