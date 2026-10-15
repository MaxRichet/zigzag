"use client";

import { useEffect, useState } from "react";

/**
 * L'heure actuelle, rafraîchie toutes les 30 s (heures d'arrivée affichées).
 * Null au premier rendu : l'heure ne doit pas être figée dans la page pré-rendue.
 */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return now;
}
