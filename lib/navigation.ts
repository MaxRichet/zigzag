import type { LngLat } from "./geo";

/** Liens qui ouvrent le guidage vers une destination dans l'appli du téléphone (V1 : pas de guidage intégré). */
export function navigationLinks([lng, lat]: LngLat): { name: string; href: string }[] {
  const ll = `${lat},${lng}`;
  return [
    { name: "Waze", href: `https://waze.com/ul?ll=${ll}&navigate=yes` },
    { name: "Google Maps", href: `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=driving` },
    { name: "Plans", href: `https://maps.apple.com/?daddr=${ll}&dirflg=d` },
  ];
}
