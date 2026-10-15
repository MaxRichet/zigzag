"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

type Drag = { from: number; startY: number; offset: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Réordonne une liste de rangées de hauteur fixe, au doigt (glisser) ou au clavier (flèches).
 * Renvoie les props de la poignée et le décalage vertical de chaque rangée pendant le glisser.
 */
export function useDragReorder(count: number, rowHeight: number, onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const target = drag ? clamp(drag.from + Math.round(drag.offset / rowHeight), 0, count - 1) : -1;

  function handleProps(index: number) {
    return {
      onPointerDown(e: PointerEvent<HTMLElement>) {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ from: index, startY: e.clientY, offset: 0 });
      },
      onPointerMove(e: PointerEvent<HTMLElement>) {
        if (drag?.from === index) setDrag({ ...drag, offset: e.clientY - drag.startY });
      },
      onPointerUp() {
        if (!drag) return;
        if (target !== drag.from) onMove(drag.from, target);
        setDrag(null);
      },
      onPointerCancel() {
        setDrag(null);
      },
      onKeyDown(e: KeyboardEvent<HTMLElement>) {
        const to = e.key === "ArrowUp" ? index - 1 : e.key === "ArrowDown" ? index + 1 : null;
        if (to === null) return;
        e.preventDefault();
        if (to >= 0 && to < count) onMove(index, to);
      },
    };
  }

  /** Décalage (px) de la rangée `index` : elle suit le doigt, ou s'écarte pour faire la place. */
  function offsetOf(index: number): number {
    if (!drag) return 0;
    const { from } = drag;
    if (index === from) return clamp(drag.offset, -from * rowHeight, (count - 1 - from) * rowHeight);
    if (from < target && index > from && index <= target) return -rowHeight;
    if (target < from && index >= target && index < from) return rowHeight;
    return 0;
  }

  return { draggingIndex: drag?.from ?? -1, handleProps, offsetOf };
}
