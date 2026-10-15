// Pictogramme Zigzag pour les images générées (icônes, Open Graph) : un tracé en zigzag,
// un tronçon par couleur, départ carré noir et étapes en pastilles.
// Le dessin reste dans les 60 % centraux pour être compatible avec les icônes « maskable ».

const POINTS: [number, number][] = [
  [24, 70],
  [42, 32],
  [60, 68],
  [78, 30],
];
const LEG_COLORS = ["#0072B2", "#E69F00", "#009E73"];

export function BrandMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#FFFFFF" />
      {LEG_COLORS.map((color, i) => (
        <line
          key={color}
          x1={POINTS[i][0]}
          y1={POINTS[i][1]}
          x2={POINTS[i + 1][0]}
          y2={POINTS[i + 1][1]}
          stroke={color}
          strokeWidth="9"
        />
      ))}
      <rect x="16" y="62" width="16" height="16" fill="#111111" />
      {POINTS.slice(1).map(([x, y], i) => (
        <circle key={x} cx={x} cy={y} r="7" fill="#FFFFFF" stroke={LEG_COLORS[i]} strokeWidth="4" />
      ))}
    </svg>
  );
}
