import { formatClock, formatDuration } from "@/lib/format";
import { serviceCategory } from "@/lib/services-config";
import { legColor, type Route, type TripPlan } from "@/lib/trip";
import { ServiceIcon } from "./icons";
import styles from "./RouteList.module.css";

type Vars = React.CSSProperties & Record<`--${string}`, string | undefined>;

/** Plan de ligne de la tournée calculée : chaque tronçon a sa couleur (écran 5). */
export function RouteList({ plan, route, now }: { plan: TripPlan; route: Route; now: Date }) {
  const startName = plan.startStop?.name ?? "Ma position";
  const last = route.legs.length - 1;
  return (
    <ol className={styles.list}>
      <li className={styles.start} style={{ "--bottom": legColor(0) } as Vars}>
        <span className={styles.square} aria-hidden="true" />
        <span className={styles.name}>Départ · {startName}</span>
        <span className={styles.meta}>{formatClock(now)}</span>
      </li>
      {plan.visits.map((stop, i) => {
        // Les adresses sont numérotées ; un service porte l'icône de sa catégorie.
        const category = stop.category ? serviceCategory(stop.category) : null;
        const number = plan.visits.slice(0, i + 1).filter((v) => !v.category).length;
        return (
        <li
          key={stop.id}
          className={styles.row}
          style={{ "--top": legColor(i), "--bottom": i < last ? legColor(i + 1) : undefined } as Vars}
        >
          <span className={styles.dot} style={{ "--color": legColor(i) } as Vars}>
            {category ? <ServiceIcon svg={category.icon} size={15} /> : number}
          </span>
          <span className={styles.texts}>
            <span className={styles.name}>{stop.name}</span>
            <span className={styles.city}>{category ? [category.label, stop.city].filter(Boolean).join(" · ") : stop.city}</span>
          </span>
          <span className={styles.meta}>+{formatDuration(route.legs[i].durationS)}</span>
        </li>
        );
      })}
      {plan.returnToStart && (
        <li className={styles.start} data-end style={{ "--top": legColor(last) } as Vars}>
          <span className={styles.square} aria-hidden="true" />
          <span className={styles.name}>Retour · {startName}</span>
          <span className={styles.meta}>+{formatDuration(route.legs[last].durationS)}</span>
        </li>
      )}
    </ol>
  );
}

/** Pendant le calcul : les étapes, durées en attente (écran 4). */
export function ComputeList({ plan }: { plan: TripPlan }) {
  return (
    <ol className={`${styles.list} ${styles.computing}`}>
      {plan.visits.map((stop) => (
        <li key={stop.id} className={styles.row}>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.name}>{stop.name}</span>
          <span className={styles.skeleton} aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
}
