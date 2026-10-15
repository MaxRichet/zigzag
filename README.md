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
| `NEXT_PUBLIC_MAPTILER_KEY` | navigateur | Fond de carte. À restreindre aux domaines du site dans MapTiler. |
| `NEXT_PUBLIC_SITE_URL` | les deux | URL publique, sans slash final (canonical, sitemap, Open Graph) |

## Vérifications avant livraison

```sh
npm run lint
npx tsc --noEmit
npm run build
```

## Déploiement

Importer le dépôt dans Vercel et renseigner les trois variables. Les fonctions tournent à Paris (`cdg1`, voir `vercel.json`).

À noter : le plan Hobby de Vercel et le plan Collaborative d'OpenRouteService interdisent l'usage commercial.

## Pages de contenu

Les pages FAQ et cas d'usage sont définies dans `lib/content.ts`. Ajouter une entrée crée la page et l'ajoute au sitemap. Le contenu actuel est factice.
