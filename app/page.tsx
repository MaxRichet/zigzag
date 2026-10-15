import { SITE_NAME } from "@/lib/seo";

// Shell rendu côté serveur : visible et indexable avant le chargement de la carte (étape 2).
export default function Home() {
  return (
    <main>
      <header>
        <h1>{SITE_NAME} : l&apos;ordre de visite le plus rapide pour vos tournées</h1>
        <p>
          Ajoutez les adresses de vos visites du jour. Zigzag trouve l&apos;ordre le plus rapide,
          affiche le trajet, et place vos arrêts (carburant, pause, parking) au meilleur endroit.
        </p>
      </header>
    </main>
  );
}
