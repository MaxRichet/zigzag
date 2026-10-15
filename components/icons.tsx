// Icônes en trait, reprises de la maquette (design_handoff_zigzag). Décoratives : aria-hidden.

export function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M10 20s7-6.2 7-11.5A7 7 0 0 0 3 8.5C3 13.8 10 20 10 20z" />
      <circle cx="10" cy="8.5" r="2.4" />
    </svg>
  );
}

export function CrossIcon({ size = 10, strokeWidth = 1.8 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      <path d="M2 2l6 6M8 2l-6 6" />
    </svg>
  );
}
