import TripApp from "@/components/TripApp";
import { STORAGE_KEY } from "@/lib/trip";

// Exécuté pendant la lecture du HTML, avant le premier affichage : signale une tournée enregistrée,
// pour masquer le panneau « Aucune adresse » jusqu'à ce que la vraie tournée soit lue (pas de saut).
const hasTripScript = `try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));var s=Array.isArray(t)?t:t&&t.stops;if(s&&s.length)document.currentScript.parentElement.setAttribute("data-trip","")}catch(e){}`;

// Le panneau (h1 + description) est rendu côté serveur ; la carte arrive ensuite côté client.
export default function Home() {
  return (
    <main suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: hasTripScript }} />
      <TripApp />
    </main>
  );
}
