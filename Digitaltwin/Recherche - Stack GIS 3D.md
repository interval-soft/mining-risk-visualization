---
tags: [v2, recherche, stack]
date: 2026-07-02
statut: terminé
---

# Recherche — Stack GIS + 3D (vérifié juillet 2026)

> Objectif : fond de carte satellite + terrain (GIS) mixé avec de la 3D Three.js, assets mobiles animés, **sans build step** (cohérent avec le repo), $0 licence.

## Recommandation

**MapLibre GL JS v5 + deck.gl v9 (interleaved) + Three.js** — souterrain géré par bascule fly-to → crossfade vers une scène Three.js dédiée (block cave). Option « wow » : **3d-tiles-renderer** (NASA-AMMOS) pour streamer le vrai terrain *dans* la scène Three.js → caméra libre + cutaway souterrain réel.

Cesium seulement si le souterrain « sur le globe » devient une exigence dure (coût : lourdeur, design difficile à maîtriser, ion commercial $149/mo).

## Versions confirmées (npm, juillet 2026)

| Lib | Version | Notes |
|---|---|---|
| maplibre-gl | **5.24.0** | Globe, terrain 3D, custom layers stables |
| deck.gl | **9.3.5** | Mode interleaved MapLibre officiel |
| cesium | 1.143.0 | Lib Apache-2.0 gratuite ; ion = payant |
| 3d-tiles-renderer | 0.4.28 | Actif, plugins ion/Google, WMTS |
| three | 0.185.1 | v1 est sur 0.160 via CDN — OK |

## Points vérifiés

- **Three.js dans une custom layer MapLibre : officiel et documenté** (modèle 3D, sur terrain, ombres, globe).
- **deck.gl ↔ MapLibre : first-class.** `MapboxOverlay` interleaved = occlusion 3D correcte. `TripsLayer` / `ScenegraphLayer` (glTF haul trucks), `HeatmapLayer`, `IconLayer`.
- **Zéro build : faisable.** maplibre-gl v5 en UMD (script tag) + deck.gl `dist.min.js` standalone + import map existante pour three/gsap. **Ne pas ajouter de bundler.**
- **Fly-to** : MapLibre `flyTo` (courbe Van Wijk) fluide pour la démo ; GSAP peut piloter `map.jumpTo` frame par frame pour du cinématique scripté.
- **Limite dure** : la caméra MapLibre **ne descend pas sous le terrain** (issues #1542, #3928) → le souterrain exige un des patterns ci-dessous.

## Imagerie / terrain (site Gobi)

| Source | Gratuit | Verdict |
|---|---|---|
| **Esri World Imagery** | 2M tuiles/mo, clé + attribution | ⭐ Meilleur choix — Maxar sub-métrique fréquent en zone reculée |
| MapTiler Satellite + Terrain-RGB | 100k req/mo | OK, résolution souvent plus grossière en Mongolie |
| EOX Sentinel-2 cloudless | WMS gratuit, **NC** récent | 10 m — contexte seulement |
| **AWS Terrarium** (elevation-tiles-prod) | Gratuit, sans clé | Terrain ~30 m (SRTM), encodage `terrarium` natif MapLibre |

- Google Photorealistic 3D Tiles : ~inutile ici — le Gobi rural n'a que du terrain drapé basse résolution, et pricing Enterprise.

## Patterns souterrain (carte = surface seulement)

1. **Mode toggle** ⭐ recommandé POC : fly-to sur le site → crossfade vers la scène Three.js block cave.
2. **X-ray overlay** : niveaux souterrains dessinés en custom layer avec depth-test off + opacité réduite (pattern « utilities »), caméra reste en surface.
3. **Terrain-in-Three.js** (3d-tiles-renderer) : caméra libre, vrai cutaway/clipping — meilleur « wow » par effort pour ce codebase.
4. Cesium globe translucency : seul vrai souterrain sur globe, au prix d'adopter Cesium.

Liens : [[V2 - Analyse initiale]] · [[Recherche - UX mining ops]] · [[Recherche - Oyu Tolgoi]]

## Sources

[MapLibre releases](https://github.com/maplibre/maplibre-gl-js/releases) · [MapLibre + Three.js](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/) · [deck.gl MapLibre](https://deck.gl/docs/developer-guide/base-maps/using-with-maplibre) · [deck.gl standalone](https://deck.gl/docs/get-started/using-standalone) · [Cesium ion pricing](https://cesium.com/platform/cesium-ion/pricing/) · [Cesium underground](https://cesium.com/blog/2020/06/16/visualizing-underground/) · [3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS) · [MapTiler pricing](https://www.maptiler.com/cloud/pricing/) · [ArcGIS Location Platform](https://location.arcgis.com/pricing/) · [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) · [MapLibre #1542](https://github.com/maplibre/maplibre-gl-js/issues/1542) · [#3928](https://github.com/maplibre/maplibre-gl-js/issues/3928)
