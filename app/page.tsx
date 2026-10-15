import TripApp from "@/components/TripApp";

// Le panneau (h1 + description) est rendu côté serveur ; la carte arrive ensuite côté client.
export default function Home() {
  return (
    <main>
      <TripApp />
    </main>
  );
}
