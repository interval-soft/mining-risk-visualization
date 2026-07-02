---
tags: [v2, analyse, décision]
date: 2026-07-02
statut: direction validée le 2026-07-02
---

# V2 — Analyse initiale & direction proposée

> **Contexte** : Worley a accepté un POC. Refonte totale, page séparée `/v2/`, v1 intouchable. Mix GIS + 3D, site réel (Oyu Tolgoi), assets immobiles + mobiles, design fonctionnel (pas tape-à-l'œil).

## Vision en une phrase

Un **poste de contrôle opérationnel** du site d'Oyu Tolgoi : carte satellite temps réel avec la flotte en mouvement, drill-down sur chaque asset, bascule vers le souterrain en 3D, IA ancrée sur l'état live.

## Stack retenue (détail : [[Recherche - Stack GIS 3D]])

| Couche | Techno | Rôle |
|---|---|---|
| Carte | **MapLibre GL JS v5** (UMD/CDN) | Satellite Esri + terrain AWS Terrarium, fly-to |
| Data viz | **deck.gl v9** interleaved | Trucks animés (TripsLayer/ScenegraphLayer), heatmap risque, icônes |
| 3D | **Three.js** (custom layer + scène dédiée) | Headframes/structures sur carte + block cave souterrain |
| Anim | GSAP (déjà en place) | Transitions scriptées |

- **Zéro build step** (2 script tags + import map existante) — cohérent avec le repo, déploiement statique inchangé.
- $0 licence. Imagerie : Esri World Imagery (2M tuiles/mo gratuites). Terrain : AWS Terrarium (gratuit, sans clé).
- **Limite structurante** : la caméra MapLibre ne descend pas sous terrain → le souterrain = bascule crossfade vers une scène Three.js (pattern recommandé POC), upgrade possible vers cutaway 3d-tiles-renderer.

## Design (détail : [[Recherche - UX mining ops]])

Style **ISA-101 control-room** : fond gris désaturé, couleur = statut uniquement (vert operating / ambre standby-delay / rouge down / rampe de risque). Densité élevée, typo mono, IDs courts (`DT101`), timestamps partout. Time Usage Model GMG (`Operating/Standby/Delay/Down`) = crédibilité métier immédiate.

```
┌────────────────────────────────────────────────────────┐
│ KPI band: t/h · cycle time · util % · shift réel/plan  │
├──────────┬────────────────────────────────┬────────────┤
│ Assets   │                                │ Événements │
│ (rail    │      CARTE (canvas central)    │ / alertes  │
│ filtrable│   satellite + terrain + flotte │ temps réel │
│ par type/│   [toggle Surface ⇄ Souterrain]│            │
│ statut)  │                                │            │
├──────────┴────────────────────────────────┴────────────┤
│ Timeline shift + contrôle simulation                    │
└────────────────────────────────────────────────────────┘
```

## Données (détail : [[Recherche - Oyu Tolgoi]])

- **Immovable** : export GeoJSON OSM one-shot (pit, 5 puits, concentrateur, TSF, camp, aéroport, haul roads) versionné dans le repo — aucune dépendance runtime.
- **Movable** : flotte simulée réaliste — Komatsu 930E (surface) & Sandvik Toro (souterrain), trajets le long des haul roads OSM, cycles load→haul→dump→return, statuts GMG.
- **Souterrain** : block cave schématique d'après le NI 43-101 (6 niveaux, drawpoints, convoyeur 13 km).

## Ce qu'on garde de v1

- **L'API AI** (`/api/ai/query` + grounding mock) — on étend le grounding à l'état de la flotte v2. Différenciateur fort vs les FMS classiques.
- Les patterns StateManager/event-driven (réécrits proprement).
- L'auth middleware (déjà au niveau projet Vercel).

## Périmètre POC proposé (dans l'ordre)

1. Carte satellite + terrain, assets immobiles OSM, panneau détail au clic
2. Flotte simulée animée avec statuts + trails, rail filtrable
3. Bandeau KPI + feed événements + timeline shift
4. Bascule souterrain (scène Three.js block cave)
5. IA ancrée sur l'état live (« Où est le truck DT204 ? », « Pourquoi la prod a chuté ? »)

## Risques

| Risque | Mitigation |
|---|---|
| Résolution satellite au site | Vérifier Esri au zoom max dès le début ; fallback MapTiler |
| Perf : 3 moteurs WebGL interleaved | deck.gl interleaved = un seul contexte ; profiler tôt |
| Scope creep du souterrain | POC = toggle simple ; cutaway = phase 2 |
| Trop « demo », pas assez « ops » | Conventions GMG/ISA-101 dès le jour 1 |

## Décisions (Joachim, 2026-07-02)

- [x] **Souterrain** : toggle simple (fly-to → crossfade scène Three.js). Cutaway = phase 2.
- [x] **Données** : API Vercel + Supabase dès le POC.
    - ⚠️ Contrainte résilience (Supabase s'est déjà mis en pause) : la simulation de flotte doit être **déterministe côté API** (état calculé depuis le timestamp, comme `levels/current.js` en v1) ; Supabase = persistance (événements, historique, config) avec **fallback gracieux** si DB down. La démo ne doit jamais casser.
- [x] **IA** : incluse — `/api/ai/query` avec grounding étendu à la flotte v2.
- [x] **Deadline** : ~2 semaines → périmètre complet (5 étapes).

## Jalons proposés (2 semaines)

| Jours | Livrable |
|---|---|
| 1–2 | ✅ **Fait (2026-07-02)** — Scaffolding `/v2/`, carte MapLibre satellite + terrain, GeoJSON OSM (842 éléments : pit, 3 puits, 334 bâtiments extrudés, convoyeurs), shell ISA-101, rail 10 assets + fly-to + panneau détail, toggle terrain 3D (fix caméra sous terrain à zoom élevé), mode dégradé sans WebGL. QA passée en headless + headed. |
| 3–5 | ✅ **Fait (2026-07-02)** — Flotte 12 unités (6 × Komatsu 930E, water carts, grader, bus, ute) animée deck.gl (icônes orientées + trails) sur les vraies haul roads OSM (Dijkstra, 5 routes). Simulation 100 % déterministe `f(t)` identique client/serveur (12/12 sync vérifié). KPIs live (2 430 t/h, 9/12, 75 %), feed événements GMG avec backfill 2 h, panneau détail live, shift bar jour/nuit. Endpoint `/api/v2/fleet` sans DB. |
| 6–8 | Bandeau KPI, feed événements, timeline shift, schéma DB v2 |
| 9–10 | Bascule souterrain (Three.js block cave d'après NI 43-101) |
| 11–12 | IA grounding v2 |
| 13–14 | Polish design ISA-101, QA, deploy |
