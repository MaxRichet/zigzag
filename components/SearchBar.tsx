"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { AddressSearch } from "@/hooks/useAddressSearch";
import { distanceKm, formatDistance, type LngLat } from "@/lib/geo";
import type { AddressResult } from "@/lib/geocoding";
import { highlight } from "@/lib/text";
import { CrossIcon, PinIcon, SearchIcon } from "./icons";
import styles from "./SearchBar.module.css";

type Props = {
  query: string;
  onQueryChange: (query: string) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  search: AddressSearch;
  /** Position de l'utilisateur, pour afficher la distance de chaque suggestion. */
  origin: LngLat | null;
  existingIds: ReadonlySet<string>;
  /** Tournée pleine : plus d'ajout possible. */
  disabled: boolean;
  onSelect: (address: AddressResult) => void;
};

const LIST_ID = "address-suggestions";

export default function SearchBar({
  query,
  onQueryChange,
  open,
  onOpen,
  onClose,
  search,
  origin,
  existingIds,
  disabled,
  onSelect,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(-1);
  const { results } = search;
  const activeIndex = active < results.length ? active : -1;

  function close() {
    setActive(-1);
    onClose();
    inputRef.current?.blur();
  }

  function choose(address: AddressResult) {
    if (existingIds.has(address.id)) return;
    onSelect(address);
    close();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!results.length) return;
      e.preventDefault();
      // Cycle sur les suggestions puis le champ lui-même (-1).
      const step = e.key === "ArrowDown" ? 1 : -1;
      const n = results.length + 1;
      setActive(((activeIndex + 1 + step + n) % n) - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const address = results[activeIndex] ?? results[0];
      if (address) choose(address);
    }
  }

  const message =
    search.status === "error"
      ? search.message
      : search.status === "done" && !results.length
        ? "Aucune adresse trouvée."
        : search.status === "loading" && !results.length
          ? "Recherche…"
          : null;
  const showSuggestions = open && search.status !== "idle";
  const listShown = showSuggestions && !message;

  return (
    <div className={styles.bar} data-open={open || undefined}>
      <div className={styles.field}>
        <SearchIcon />
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          role="combobox"
          aria-label="Ajouter une adresse"
          aria-expanded={listShown}
          aria-controls={listShown ? LIST_ID : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${LIST_ID}-${activeIndex}` : undefined}
          placeholder={disabled ? "Tournée complète" : "Ajouter une adresse"}
          disabled={disabled}
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={200}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setActive(-1);
          }}
          onFocus={onOpen}
          onKeyDown={onKeyDown}
        />
        {open && query && (
          <button
            type="button"
            className={styles.clear}
            aria-label="Effacer la saisie"
            onClick={() => {
              onQueryChange("");
              inputRef.current?.focus();
            }}
          >
            <CrossIcon />
          </button>
        )}
      </div>
      {open && (
        <button type="button" className={styles.cancel} onClick={close}>
          Annuler
        </button>
      )}

      {showSuggestions && (
        // Toucher une suggestion ne doit pas retirer le focus du champ (le clavier resterait ouvert ou fermé au hasard).
        <div className={styles.suggestions} onMouseDown={(e) => e.preventDefault()}>
          {message ? (
            <p className={styles.message}>{message}</p>
          ) : (
            <ul id={LIST_ID} role="listbox" aria-label="Adresses suggérées">
              {results.map((address, i) => {
                const existing = existingIds.has(address.id);
                return (
                  <li
                    key={address.id}
                    id={`${LIST_ID}-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    aria-disabled={existing || undefined}
                    className={styles.option}
                    onClick={() => choose(address)}
                    onPointerMove={() => setActive(i)}
                  >
                    <PinIcon />
                    <span className={styles.texts}>
                      <span className={styles.name}>
                        {highlight(address.name, query).map((part, j) =>
                          part.match ? <b key={j}>{part.text}</b> : part.text,
                        )}
                      </span>
                      <span className={styles.city}>{address.city}</span>
                    </span>
                    <span className={styles.distance}>
                      {existing ? "Déjà ajoutée" : origin && formatDistance(distanceKm(origin, address.lngLat))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <p className="sr-only" role="status">
        {showSuggestions && (message ?? `${results.length} adresse${results.length > 1 ? "s" : ""} trouvée${results.length > 1 ? "s" : ""}`)}
      </p>
    </div>
  );
}
