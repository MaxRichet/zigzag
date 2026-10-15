"use client";

import { useEffect, useState, type RefObject } from "react";

/** Hauteur d'un élément, mise à jour quand il change de taille. */
export function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(Math.round(entry.borderBoxSize[0].blockSize)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return height;
}
