"use client";

import { useState } from "react";
import { SERVICE_CATEGORIES, type ServiceCategoryId } from "@/lib/services-config";
import type { Stop } from "@/lib/trip";
import { ServiceIcon } from "./icons";
import styles from "./Panel.module.css";

/** Arrêt de service (écran 8) : où le placer, puis la catégorie. */
export function ServicePanel({
  stops,
  hasRoute,
  busy,
  error,
  onPick,
}: {
  /** Adresses de la tournée, dans l'ordre, pour « Avant l'adresse X ». */
  stops: Stop[];
  /** Trajet déjà calculé : le service y est inséré tout de suite ; sinon au prochain calcul. */
  hasRoute: boolean;
  /** Catégorie en cours de recherche. */
  busy: string | null;
  error: string | null;
  onPick: (category: ServiceCategoryId, beforeId: string | null) => void;
}) {
  const [before, setBefore] = useState("");
  return (
    <>
      <h2 id="trip-title" className={styles.sheetTitle}>
        Ajouter un arrêt sur le trajet
      </h2>
      <p className={styles.sheetText}>
        {hasRoute
          ? "Zigzag choisit le lieu le mieux placé et l'insère au meilleur moment de la tournée."
          : "Zigzag choisira le lieu le mieux placé au calcul de la tournée."}
      </p>
      {stops.length > 0 && (
        <label className={`${styles.option} ${styles.placement}`}>
          <span className={styles.optionLabel} id="placement-label">
            Où
          </span>
          <select aria-labelledby="placement-label" value={before} onChange={(e) => setBefore(e.target.value)}>
            <option value="">Meilleur endroit sur le trajet</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                Avant {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className={styles.tiles}>
        {SERVICE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.tile}
            data-active={busy === c.id || undefined}
            disabled={busy !== null}
            onClick={() => onPick(c.id, before || null)}
          >
            <ServiceIcon svg={c.icon} />
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      <p className={styles.sheetStatus} role="status">
        {busy ? "Recherche du lieu le mieux placé…" : ""}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
