# Handoff : Zigzag — écran carte mobile (direction « Ligne de métro »)

## Vue d'ensemble
Zigzag est une web app mobile pour commerciaux terrain : on saisit plusieurs adresses, l'app calcule l'ordre de visite le plus rapide, affiche le tracé (durée, distance, heure de fin) puis guide la conduite étape par étape. L'écran principal est une carte plein écran avec des éléments posés dessus (barre de recherche, bouton +, panneau bas avec la liste des étapes).

## À propos des fichiers
`Zigzag 1a Ecrans.dc.html` est une **référence de design en HTML** (prototype montrant l'apparence et le comportement visés), pas du code de production. Il faut **recréer ces écrans dans l'environnement du projet** (React, Vue, etc.) avec ses patterns. S'il n'existe pas encore de codebase, choisir un framework adapté (suggestion : React + Vite + TypeScript, MapLibre GL JS pour la carte, un moteur de routage type OSRM/Valhalla/GraphHopper ou une API Directions/Matrix pour les durées réelles).

Pour ouvrir la maquette : servir le dossier en local (`npx serve .`) et ouvrir le fichier `.dc.html` (il charge `support.js`). Les 8 écrans sont posés côte à côte, mis à l'échelle de la fenêtre.

`DESIGN.md` est le brief d'inspiration d'origine (ressources, garde-fous).

## Fidélité
**Haute fidélité** pour la mise en page, les couleurs, la typographie et les états. Seul le **fond de carte est un schéma de remplacement** (rues SVG dessinées) : en production, utiliser un vrai fond vectoriel (style MapTiler/OpenMapTiles retravaillé avec les couleurs listées plus bas). Les noms de rues, la vitesse et les adresses sont des données d'exemple.

## Gabarit commun (tous les écrans)
- Viewport de référence : 390 × 844 (iPhone 14/15). Carte en `position:absolute; inset:0`, tout le reste est posé par-dessus.
- Barre d'état : hauteur 50, texte 15px/600.
- **Barre de recherche** (haut) : `top:58px; left:14px; right:14px`, flex gap 8.
  - Champ : hauteur 52, fond `#FFFFFF`, bordure 2px `#111111`, **coins droits** (radius 0), padding 0 14, icône loupe 20px (trait 2.4) + placeholder « Ajouter une adresse » 16px/500 `#4A4A4A`.
  - Bouton + : rond 52×52, fond `#111111`, croix blanche trait 3. **Rôle : ouvre les arrêts de service** (voir écran 8). Ce n'est pas un doublon de la recherche.
- **Panneau bas** : collé en bas, fond blanc, `border-top: 2px solid #111`, padding `14px 20px 34px`. En-tête : logo texte « zigzag » 17px/700, letter-spacing −0.03em, à gauche ; méta en capitales 12px/600, letter-spacing .08em, `#4A4A4A`, à droite (« Tournée · 5 arrêts »).
- Indicateur home : barre 134×5, radius 3, centrée à 8px du bas.
- **Plan de ligne vertical (signature « métro »)** : chaque étape est une rangée en grille `44px | 1fr | auto`. Colonne 1 : segment vertical de 6px de large à la couleur du tronçon (moitié haute = tronçon d'arrivée, moitié basse = tronçon suivant) et une pastille ronde 28×28, fond blanc, bordure 4px couleur du tronçon, numéro 13px/700. Départ : carré 20×20 noir, bordure blanche 3px + anneau noir 2px.
- Bouton principal : pleine largeur, hauteur 54, fond `#111`, texte blanc 17px/600, radius 4.
- Bouton secondaire : même taille, fond blanc, bordure 2px `#111`.

## Écrans

### 1. Ouverture, aucune adresse
- Carte avec seulement la position de départ (carré noir à x 46, y 327).
- Panneau : méta « Nouvelle tournée » ; titre « Aucune adresse » 36px/700, −0.035em ; texte « Ajoutez les adresses de vos visites du jour. Zigzag trouve l'ordre le plus rapide. » 15px/400/1.4 `#4A4A4A`.
- Ligne de métro vide : « Départ · Ma position » + « 9:30 », puis une pastille vide en pointillés (bordure 3px dashed `#9A9A96`) « Première étape ». Le trait entre les deux est en pointillés 3px `#9A9A96`.
- Bouton désactivé « Optimiser l'ordre » : fond `#E4E4E1`, texte `#5E5E5B`. Sous-texte « 2 adresses minimum » 13px.

### 2. Recherche, clavier ouvert
- Carte voilée (`rgba(238,239,236,.55)`).
- Champ actif : bordure 3px `#111`, texte saisi « 12 bd des Bel » + curseur clignotant (2×20, animation steps 1s), bouton effacer (rond noir 20px avec croix). Le bouton + est remplacé par le texte « Annuler » 15px/600.
- Liste de suggestions sous le champ (`top:118px`), fond blanc, bordure 2px `#111`. Rangées de 62px : icône repère, libellé 15px avec la **partie correspondante en gras 700**, sous-ligne 13px `#4A4A4A`, distance 13px/600 à droite. Séparateurs 1px `#E4E4E1`. La rangée survolée ou sélectionnée a le fond `#F3F3F1`.
- Clavier iOS français **AZERTY** (hauteur 336, fond `#D1D3D9`) : touches blanches radius 5, ombre `0 1px 0 #898A8D`, hauteur 44, gap 6, rangées espacées de 12. Touches système (maj, effacer, 123, emoji) en `#ABB0BA`. Touche d'action « rechercher » en `#0A84FF`. Dessous : globe et micro. En production, c'est le clavier natif : il suffit de mettre `inputmode="search"` / `enterkeyhint="search"`.

### 3. Adresse saisie
- Les 4 arrêts déjà saisis sont sur la carte en pastilles blanches 30px, bordure 3px noire, numérotées (pas encore de couleur, ordre non optimisé).
- La nouvelle adresse a un point noir 16px (bordure blanche 3 + anneau noir 2) et une étiquette noire « Pharmacie du Parc » posée **à gauche** du point, avec une flèche, pour ne jamais passer sous la barre de recherche.
- Panneau : liste compacte des 4 arrêts (rangées de 40px, trait en pointillés, nom + ville) ; séparateur 2px ; « Nouvelle étape · 5 » (méta), nom 24px/700, adresse 15px `#4A4A4A` ; bouton unique « Valider la tournée » en pleine largeur. On ajoute une autre adresse avec la barre du haut.

### 4. Calcul du trajet
- Carte : les 5 arrêts en pastilles blanches avec un point central ; tracé provisoire en pointillés noirs (trait 3, dasharray 6 4, opacité .55) qui défile (`stroke-dashoffset` animé, 1.2s linéaire en boucle).
- Panneau : titre « Recherche du meilleur ordre » 30px/700 ; barre de progression 8px (piste `#E4E4E1`, segment noir de 40 % qui glisse de −100 % à 250 %, 1.4s ease-in-out en boucle) ; textes « 120 ordres possibles comparés » / « Trafic en temps réel » 13px ; liste des 5 noms avec des durées en squelette (barre `#E4E4E1` 44×10) ; bouton secondaire « Annuler ».

### 5. Tournée prête
- Tracé optimisé : chaque tronçon a sa couleur (voir palette), trait 7px, liseré blanc 12px dessous, **angles vifs** (`stroke-linejoin: miter`). Marqueurs ronds 30px pleins à la couleur du tronçon, numéro blanc ou noir selon le contraste, bordure blanche 3 + anneau noir 2.
- Panneau : durée totale 52px/700, −0.04em, chiffres tabulaires (ex. « 54 min » ou « 1 h 05 ») ; à droite, badge « −X min » (fond noir, texte blanc 12px/700, temps gagné par rapport à l'ordre saisi), distance 20px/600 (« 12,4 km », virgule décimale), « Retour libre · fin 10:24 » 13px.
- Liste : départ + 5 étapes (rangées de 46px), nom 15px/600, adresse 12.5px `#555`, durée du tronçon « +8 min » 13px/600.
- Bouton « Démarrer la tournée ».

### 6. En route, guidage
- **Carte en mode « cap en haut » (heading-up)** : on fait tourner la carte pour que le segment en cours pointe **toujours vers le haut**, et la position de l'utilisateur est **centrée horizontalement** (x 195, y ≈ 430). Zoom ≈ 1,8× la vue d'ensemble. Après un virage, la carte tourne pour que le nouveau segment redevienne vertical (comme Waze). Animer la rotation et le recentrage (≈ 300 ms, ease-out).
- Flèche utilisateur : cercle blanc r 24, bordure noire 3, flèche noire pleine, halo noir 8 % r 38. Elle reste fixe à l'écran : c'est la carte qui bouge.
- Seul le tronçon vers l'étape 1 est en couleur (trait 5 sur liseré blanc 8, à l'échelle de la carte) ; les tronçons suivants sont en noir à 30 % d'opacité. Les numéros des marqueurs sont contre-tournés pour rester lisibles.
- Bandeau de manœuvre en haut (fond `#111`, sous la barre d'état) : pictogramme carré blanc 64×64 avec la flèche de virage (miroir pour gauche/droite), distance 34px/700 (« 300 m »), consigne 16px/500 `#E4E4E1` (« Tournez à droite, quai … »). Séparateur 1px `#444`, puis la manœuvre suivante en 14px (« Puis ↑ tout droit sur 1,2 km »).
- Compteur de vitesse à gauche (top 478) : carré blanc, bordure 2px, « 42 » 20px/700 + « KM/H » 10px.
- **Pas de bouton recentrer ici** : la vue est déjà recentrée.
- Panneau : « Étape 1 sur 5 » / « Fin 10:24 » ; pastille 36px bordure 5px couleur du tronçon ; nom 22px/700 ; adresse 14px ; durée restante 46px/700 ; distance 18px + « Arrivée 9:38 » ; ligne de progression (5 pastilles 20px reliées par un trait 6px, la partie faite en couleur, le reste `#D6D6D2`, et un carré noir 16px à la fin) ; boutons « Arrêter » (secondaire, 110px) + « Je suis arrivé » (principal).

### 7. Carte libre (zoom / dézoom), recentrer
- C'est l'état où l'on arrive quand l'utilisateur pince, zoome ou déplace la carte pendant le guidage : la carte passe en **nord en haut**, on voit toute la tournée, et le suivi automatique est suspendu.
- Le bandeau de manœuvre devient compact (pictogramme 40px, distance 22px, consigne 14px).
- La flèche utilisateur est un cercle blanc 36px, bordure 3px, tourné dans le sens de la marche.
- Contrôles en bas à droite de la carte (`right:14px; top:512px`, colonne gap 12) : bloc **+ / −** (2 boutons 48×48, fond blanc, bordure 2px, séparateur 2px) et, dessous, **bouton recentrer** rond 52px noir avec la flèche blanche. Le recentrage ramène à la vue de l'écran 6 (heading-up, zoom par défaut, suivi actif). On peut aussi recentrer automatiquement après ~10 s sans interaction (à valider).
- Échelle à gauche (top 648) : 64px, « 500 m ».
- Panneau compact : étape suivante (pastille 32px, nom 18px/700, « 8 min · 3,1 km · arrivée 9:38 ») + ligne « Tournée entière » / « 54 min · 12,4 km » 20px/700. Pas de bouton en bas.

### 8. Bouton + : arrêts de service
- S'ouvre avec le bouton + de la barre de recherche, qui devient un rond blanc bordure 3px avec une croix (fermer). La carte de la tournée reste visible derrière un voile.
- Panneau : méta « Arrêt de service », titre « Ajouter un arrêt sur le trajet » 26px/700, texte « Zigzag choisit le lieu le mieux placé et l'insère au meilleur moment de la tournée. » 14px.
- Grille 2 colonnes, gap 10, tuiles de 82px de haut, bordure 2px `#111`, padding 12 : icône 24px (trait 2.2) + détour estimé 12px/600 à droite, libellé 15px/600 en bas. Tuile active ou pressée : fond `#111`, texte et icône blancs.
- Catégories : Carburant (+4 min), Recharge (+6 min), Courses (+7 min), Pause déjeuner (créneau 12:00–13:30), Café (+3 min), Parking (près des arrêts).
- Comportement : au toucher, on cherche les lieux de la catégorie près du tracé (POI), on prend celui qui ajoute le moins de détour, on l'insère à la meilleure position de la tournée (contrainte horaire pour la pause déjeuner), puis on recalcule et on revient à l'écran 5 avec l'arrêt marqué comme service (icône à la place du numéro, à concevoir).

## Interactions et comportement
- Toucher la barre de recherche → écran 2 ; choisir une suggestion → écran 3 ; « Valider la tournée » → écran 4 → écran 5 une fois le calcul fini.
- Écran 5 : les étapes se **réordonnent par glisser-déposer** (poignée sur toute la rangée ; une fois l'ordre modifié, le bouton redevient « Optimiser l'ordre » et le badge disparaît). Toucher une étape **isole son tronçon** (les autres tronçons et rangées passent à 18–35 % d'opacité, transition .2s ; toucher à nouveau pour annuler).
- Optimisation : c'est un TSP « départ fixe, retour libre ». La maquette fait une recherche exhaustive sur des distances simulées ; en production, utiliser une matrice de durées réelles (API Matrix) et une heuristique (plus proche voisin + 2-opt) dès 8 étapes ou plus.
- Animation du tracé à l'affichage du résultat : chaque tronçon se dessine (`stroke-dashoffset` 1→0, 420 ms ease-out, décalé de 130 ms par tronçon). La désactiver si `prefers-reduced-motion`.
- « Démarrer la tournée » → écran 6. Un geste sur la carte → écran 7. Bouton recentrer → écran 6. « Je suis arrivé » → étape suivante.

## État
- `stops: {id, name, address, lat, lng, type: 'client'|'service', category?}[]`
- `order: id[]`, `isOptimized: boolean`, `savedMinutes: number`
- `legs: {durationMin, distanceKm, geometry}[]`, `totals: {durationMin, distanceKm, etaClock}`
- `phase: 'empty'|'searching'|'confirming'|'computing'|'ready'|'navigating'|'freeMap'|'serviceSheet'`
- `activeLegIndex: number | -1`, `currentStopIndex`, `heading`, `followUser: boolean`

## Design tokens
Couleurs UI :
- Encre `#111111` · Blanc `#FFFFFF` · Texte secondaire `#4A4A4A` / `#555555`
- Neutre désactivé `#E4E4E1` (texte `#5E5E5B`) · Pointillés `#9A9A96` · Rail inactif `#D6D6D2` · Survol `#F3F3F1` · Séparateur sombre `#444444` · Texte clair sur noir `#E4E4E1`

Palette des tronçons (Okabe-Ito, distincte en deutéranopie), dans l'ordre : `#0072B2`, `#E69F00`, `#009E73`, `#CC79A7`, `#D55E00`, puis `#56B4E9`, `#111111`. Choisir la couleur du numéro par contraste (luminance > 0.3 → `#111`, sinon blanc).

Fond de carte : sol `#EEEFEC`, rues secondaires `#F7F7F5` (3px), axes `#FFFFFF` (8px), eau `#D8DFE3`, parcs `#E1E5DD`, libellés de quartier `#8A8F8C` 10px/600 en capitales, letter-spacing .14em.

Typographie : **Switzer** seule (Fontshare : `https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700`). Échelle : 52 / 46 / 36 / 34 / 30 / 26 / 24 / 22 / 20 / 18 / 17 / 16 / 15 / 14 / 13 / 12. Chiffres en `font-variant-numeric: tabular-nums`. Titres resserrés de −0.025 à −0.04em ; méta en capitales +0.08em.

Rayons : 0 (champs, tuiles, cartes), 4 (boutons), 50 % (pastilles, bouton +, recentrer). Bordures : 2px `#111` comme règle générale, 3px pour l'état actif. Ombres : aucune (anneaux de 2px à la place).

Formats : français, virgule décimale (« 12,4 km »), heures « 9:38 », durées « 54 min » / « 1 h 05 ».

## Assets
Aucune image. Toutes les icônes sont des SVG simples en trait, dans le fichier (loupe, +, croix, repère, flèches de manœuvre, flèche utilisateur, catégories de service). On peut les remplacer par une librairie d'icônes de la codebase (ex. Lucide) en gardant le trait de 2.2 à 2.4.

## Fichiers
- `Zigzag 1a Ecrans.dc.html` : les 8 écrans (le markup est dans `<x-dc>`, la logique et les données d'exemple dans le script en bas : `POOL`, `legsOf`, `best`, `navInfo`, `navMap`, `services`).
- `support.js` : runtime nécessaire pour ouvrir la maquette (pas à reprendre en production).
- `DESIGN.md` : le brief d'origine.
