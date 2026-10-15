# Zigzag — Brief V1 pour Claude Code

## Objectif
Application web d'optimisation de trajet multi-adresses. L'utilisateur saisit plusieurs adresses, et l'app calcule et affiche le trajet le plus rapide qui passe par toutes. Il peut aussi insérer un **service** (station essence, boulangerie…) entre deux étapes : l'app trouve alors le plus proche sur le chemin.

Pas de compte utilisateur en V1. L'app doit être utilisable immédiatement à l'ouverture.

## Règles prioritaires (à respecter à chaque session)
1. **Simplicité et performance avant tout.** Aucun code inutile, aucune abstraction prématurée, aucune dépendance non indispensable. Une base propre et minimale, sur laquelle j'ajouterai des features petit à petit.
2. **Le design vient de Claude Design, ne pas l'inventer.** La référence est `design_handoff_zigzag/` (README : écrans, tokens, comportements ; maquette HTML haute fidélité). La reproduire en CSS simple, sans lib UI. Ce qui n'y figure pas reste fonctionnel et dans le même langage visuel.
3. **Séparer la logique de la présentation.** Les hooks et `lib/` contiennent la logique, les composants sont fins et avec un markup sémantique. Le design doit pouvoir être branché sans toucher à la logique.
4. **Penser SEO, GEO et déploiement dès maintenant.** La structure doit permettre d'ajouter facilement des pages de contenu indexables.
5. Ne pas implémenter ce qui n'est pas demandé ici. En cas de doute, choisir la solution la plus simple et me le signaler.

## Décisions validées (15/10/2026) — priment sur le reste de ce brief et sur le handoff
- **Pas de guidage pas à pas dans l'app en V1** (écrans 6 et 7 du handoff reportés en V2). « Démarrer la tournée » ouvre l'étape suivante dans Waze, Google Maps ou Plans ; « Je suis arrivé » passe à l'étape d'après.
- **Ordre des adresses : un appel ORS `matrix` + résolution dans `lib/`** (exacte jusqu'à ~12 adresses, heuristique plus proche voisin + 2-opt au-delà), au lieu de l'endpoint `optimization`. La même matrice donne le temps gagné (« −X min ») par rapport à l'ordre saisi.
- **Pas de « trafic en temps réel »** : ORS ne le gère pas, ce texte du handoff est retiré.
- **Catégories de services** : une liste fusionnée (handoff + brief), dans `lib/services-config.ts`. La pause déjeuner n'a pas de contrainte horaire en V1.
- **Mode « Avant l'adresse X » et option « arrivée fixe »** : gardés, à dessiner dans le langage visuel du handoff.
- **Recherche : adresses uniquement** (Géoplateforme IGN). Pas de recherche par nom de commerce en V1.
- **Géocodage** : `https://data.geopf.fr/geocodage/` (l'ancienne `api-adresse.data.gouv.fr` est fermée depuis fin janvier 2026).
- **Police** : Switzer, auto-hébergée avec `next/font/local`.
- **Tests** : Vitest sur les fonctions pures de `lib/`.

## Stack
- **Next.js (App Router) + TypeScript**, déployé sur **Vercel**
- **MapLibre GL JS** pour la carte, avec les tuiles **MapTiler** (style vectoriel)
- **API Adresse (BAN / IGN)** pour l'autocomplétion et le géocodage (France). Vérifie l'endpoint actuel, l'API est en cours de migration vers la Géoplateforme.
- **OpenRouteService (ORS)** pour :
  - `optimization` (VROOM) : l'ordre optimal des adresses
  - `directions` (driving-car, GeoJSON) : le tracé de l'itinéraire
  - `matrix` : le calcul du détour pour les services
  - `pois` : la recherche de services dans une zone tampon autour du tracé
- Pas de state manager externe : `useReducer` + `localStorage` pour conserver le trajet en cours.
- Pas de base de données ni d'authentification en V1.

Avant d'implémenter, vérifie dans la documentation à jour les limites des API (nombre de points pour l'optimisation, taille du buffer POI, quotas).

## Interface V1 (type Waze)
- À l'ouverture : **carte plein écran** centrée sur la position de l'utilisateur (si elle est autorisée), sinon sur la France.
- **Barre de recherche** en overlay en haut : autocomplétion d'adresse (debounce ~250 ms, `AbortController` pour annuler les requêtes obsolètes).
- **Bouton +** qui ouvre un choix entre :
  - **Ajouter une adresse**
  - **Ajouter un service** : liste de catégories (station essence, recharge électrique, boulangerie, supermarché, pharmacie, distributeur, toilettes, parking… à définir dans un fichier de config unique, mappé sur les catégories POI d'ORS/OSM)
- **Liste des étapes** (adresses + services) : réordonnable, supprimable.
- Chaque service a un mode de placement :
  - **« Meilleur endroit sur le trajet »** (par défaut) : l'app choisit où l'insérer.
  - **« Avant l'adresse X »** (optionnel) : l'utilisateur choisit une adresse dans un sélecteur.
- Option « **Partir de ma position** ».
- Bouton « **Optimiser l'ordre** », puis affichage du tracé + durée et distance totales.
- Marqueurs numérotés sur la carte.

## Logique métier
1. **Géocodage** : chaque adresse validée est stockée avec ses coordonnées (pas de re-géocodage inutile).
2. **Optimisation** : on optimise d'abord l'ordre des **adresses uniquement**, avec le point de départ fixe (et l'arrivée fixe, en option). Les services sont insérés ensuite, dans le trajet optimisé.
3. **Insertion d'un service** : le détour d'un POI sur un segment A → B vaut `durée(A→POI) + durée(POI→B) − durée(A→B)`.
   - **Mode « Meilleur endroit » (défaut)** :
     - chercher les POI de la catégorie dans un buffer autour du tracé complet (ORS `pois`)
     - garder les N meilleurs candidats
     - en un seul appel `matrix` (étapes + candidats), calculer le détour de chaque candidat sur chaque segment
     - retenir le couple POI/segment avec le plus petit détour
   - **Mode « Avant l'adresse X »** : le segment est figé à (étape qui précède X dans l'ordre optimisé) → X. Si X est la première étape, le segment est départ → X. On cherche les POI autour de ce segment uniquement, puis on retient celui qui a le plus petit détour.
   - S'il y a plusieurs services, les insérer **un par un**, en recalculant le trajet après chaque insertion.
   - Si aucun résultat n'est trouvé, élargir le buffer une fois, puis afficher un message clair.
4. **Tracé final** : un seul appel `directions` sur la séquence complète des étapes.
5. Gérer proprement les erreurs, quotas et timeouts d'API, avec des messages simples pour l'utilisateur.

## Architecture
```
app/
  page.tsx                 # app carte (shell SSR + carte chargée côté client)
  layout.tsx               # metadata globale, JSON-LD
  api/
    geocode/route.ts       # proxy API Adresse
    route/route.ts         # directions
    optimize/route.ts      # optimization
    services/route.ts      # pois + matrix → meilleur POI
  (content)/               # pages SEO futures (FAQ, cas d'usage…), structure prête
  sitemap.ts
  robots.ts
  manifest.ts
  opengraph-image.tsx
components/                # composants fins, sans style
hooks/                     # useTrip (reducer), useGeolocation…
lib/
  ors.ts, geocoding.ts     # clients d'API typés
  services-config.ts       # catégories de services
  seo.ts                   # constantes SEO (nom, description, URL)
public/llms.txt
```
- **Les clés d'API restent côté serveur** (route handlers). Aucune clé exposée au client, sauf la clé MapTiler (restreinte par domaine).
- Ajouter un rate limiting minimal sur les routes API (simple, sans service externe en V1).
- Utiliser un cache HTTP sur les réponses quand c'est pertinent (par exemple le géocodage).

## Performance
- MapLibre importé en `dynamic(() => …, { ssr: false })`. Le shell de la page s'affiche avant la carte.
- Bundle client minimal : vérifier la taille avec `next build`, sans dépendance lourde.
- Pas de re-render inutile de la carte : mettre à jour les sources et layers, ne pas recréer la carte.
- Objectif : de bons Core Web Vitals sur mobile (LCP, INP, CLS).

## SEO / GEO (mis en place dès la V1)
- `/` est l'app, mais avec un **shell rendu côté serveur** : un `<h1>` et une courte description textuelle (accessible et indexable), plus la metadata complète.
- `generateMetadata` et des constantes centralisées dans `lib/seo.ts` : title, description, canonical, Open Graph, Twitter.
- JSON-LD `WebApplication` (gratuit, catégorie navigation), avec la structure prête pour `FAQPage` sur les futures pages.
- `sitemap.ts` généré automatiquement à partir des routes de contenu (ajouter une page = elle apparaît dans le sitemap).
- `robots.ts` : autoriser les moteurs et les crawlers IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) et exclure `/api`.
- `public/llms.txt` : description de l'app, cas d'usage, liens vers les pages clés.
- Un groupe de routes `(content)` prêt pour les pages FAQ et `cas-usage/[slug]`, avec un contenu factice minimal (pas de rédaction).
- `manifest.ts` (PWA installable, sans service worker complexe en V1).
- `lang="fr"`, HTML sémantique.

## Déploiement
- Prêt pour Vercel sans configuration particulière. Fonctions dans la région `cdg1` (Paris).
- `.env.example` documenté : `ORS_API_KEY`, `NEXT_PUBLIC_MAPTILER_KEY`, `NEXT_PUBLIC_SITE_URL`.
- `README.md` court : installation, variables d'environnement, déploiement.
- ESLint + `tsc` sans erreur avant chaque livraison.

## Hors scope V1
Comptes utilisateurs, base de données, partage de trajet, multi-véhicules, créneaux horaires, navigation guidée vocale, design, i18n.

## Ordre de travail suggéré
1. Setup Next.js + SEO de base (metadata, robots, sitemap, llms.txt, manifest)
2. Carte plein écran + géolocalisation
3. Recherche d'adresses + liste des étapes
4. Optimisation de l'ordre + tracé
5. Services sur le trajet
6. Vérification des performances et du build, puis déploiement

À chaque étape, livre quelque chose de fonctionnel et attends ma validation avant de passer à la suivante.
