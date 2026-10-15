# Zigzag

Application web mobile qui calcule l'ordre de visite le plus rapide pour une tournée de plusieurs adresses.

Stack : Next.js (App Router) + TypeScript, MapLibre GL JS + MapTiler, géocodage Géoplateforme IGN, OpenRouteService.

## Installation

```sh
npm install
cp .env.example .env.local   # puis remplir les clés
npm run dev                  # http://localhost:3000
```

La police Switzer (Fontshare, licence ITF) n'est pas versionnée : sa licence interdit de la redistribuer via un dépôt public. `scripts/fetch-fonts.mjs` la télécharge automatiquement avant `dev` et `build`.

## Variables d'environnement

| Variable | Où | Rôle |
|---|---|---|
| `ORS_API_KEY` | serveur | Itinéraires, matrices de durées, recherche de lieux (OpenRouteService) |
| `NEXT_PUBLIC_MAPTILER_KEY` | navigateur | Fond de carte et recherche de commerces. À restreindre aux domaines du site dans MapTiler. |
| `NEXT_PUBLIC_SITE_URL` | les deux | URL publique, sans slash final (canonical, sitemap, Open Graph) |

La recherche combine les adresses (Géoplateforme IGN, sans clé, via `/api/geocode` qui limite le débit par adresse IP et met les réponses en cache) et les commerces (géocodage MapTiler, avec la clé de la carte).

Le calcul de la tournée passe par `/api/optimize` (matrice de durées ORS, puis ordre résolu dans `lib/tsp.ts` : exact jusqu'à 12 étapes libres, heuristique au-delà) et `/api/route` (tracé ORS). Les services (carburant, boulangerie…) sont cherchés le long du tracé avec Photon (OpenStreetMap, sans clé, usage raisonnable demandé), puis départagés par une matrice ORS (`/api/services`) ; les catégories sont dans `lib/services-config.ts`. Quotas ORS gratuits, partagés par tous les utilisateurs : 500 matrices (calcul d'ordre ou service ajouté) et 2 000 tracés par jour.

## Vérifications avant livraison

```sh
npm run lint
npx tsc --noEmit
npm test          # Vitest, logique de lib/
npm run build
```

## Déploiement

Importer le dépôt dans Vercel et renseigner les trois variables. Les fonctions tournent à Paris (`cdg1`, voir `vercel.json`).

À noter : le plan Hobby de Vercel et le plan Collaborative d'OpenRouteService interdisent l'usage commercial.

## Pages de contenu

Les pages FAQ et cas d'usage sont définies dans `lib/content.ts`. Ajouter une entrée crée la page et l'ajoute au sitemap. Le contenu actuel est factice.
