"use client";

import { useDragReorder } from "@/hooks/useDragReorder";
import type { Stop } from "@/lib/trip";
import { CrossIcon } from "./icons";
import styles from "./StopList.module.css";

const ROW_HEIGHT = 40;

type Props = {
  stops: Stop[];
  /** La première adresse est le point de départ : carré noir au lieu d'un numéro. */
  firstIsStart: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
};

/** Plan de ligne vertical : une rangée par étape, la pastille sert de poignée pour réordonner. */
export default function StopList({ stops, firstIsStart, onMove, onRemove }: Props) {
  const { draggingIndex, handleProps, offsetOf } = useDragReorder(stops.length, ROW_HEIGHT, onMove);
  if (!stops.length) return null;

  return (
    <ol className={styles.list} data-dragging={draggingIndex >= 0 || undefined}>
      {stops.map((stop, i) => {
        const offset = offsetOf(i);
        const isStart = firstIsStart && i === 0;
        const num = firstIsStart ? i : i + 1;
        return (
          <li
            key={stop.id}
            className={styles.row}
            data-dragged={i === draggingIndex || undefined}
            style={offset ? { transform: `translateY(${offset}px)` } : undefined}
          >
            <button
              type="button"
              className={styles.handle}
              aria-label={`${isStart ? "Départ" : `Étape ${num}`} : ${stop.name}. Glisser, ou flèches haut et bas, pour déplacer.`}
              {...handleProps(i)}
            >
              {isStart ? <span className={styles.square} /> : <span className={styles.dot}>{num}</span>}
            </button>
            <span className={styles.name}>{stop.name}</span>
            <span className={styles.city}>{stop.city}</span>
            <button
              type="button"
              className={styles.remove}
              aria-label={`Retirer ${stop.name}`}
              onClick={() => onRemove(stop.id)}
            >
              <CrossIcon size={12} strokeWidth={2} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Ligne vide de l'écran d'ouverture : départ (si la position est connue) puis « Première étape ». */
export function EmptyRoute({ hasStart }: { hasStart: boolean }) {
  return (
    <ol className={styles.empty}>
      {hasStart && (
        <li className={styles.departure}>
          <span className={styles.square} aria-hidden="true" />
          <span className={styles.departureName}>Départ · Ma position</span>
        </li>
      )}
      <li className={styles.placeholder} data-first={!hasStart || undefined}>
        <span className={styles.ghost} aria-hidden="true" />
        Première étape
      </li>
    </ol>
  );
}
