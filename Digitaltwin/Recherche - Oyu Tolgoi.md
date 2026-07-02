---
tags: [v2, recherche, site]
date: 2026-07-02
statut: terminé
---

# Recherche — Oyu Tolgoi (site de référence v2)

> Mine de cuivre-or Rio Tinto, Ömnögovi (Gobi du Sud), Mongolie. Open pit + block cave souterrain. Vérifié via Overpass/OSM + sources publiques.

## Coordonnées clés

| Élément | Lat, Lon | Note |
|---|---|---|
| Open pit (Southwest Oyu) | 43.0086, 106.8488 | Polygone OSM, 2.56 × 1.74 km |
| Shaft #1 (Hugo North) | 43.0342, 106.8558 | OSM `man_made=mineshaft`, headframe |
| Shaft #2 (winding) | 43.0380, 106.8458 | OSM |
| Shaft #5 (ventilation) | 43.0357, 106.8472 | OSM |
| Concentrateur | 43.0487, 106.8327 | 6 niveaux / 25 m + dôme stockpile 45 m |
| Camp / admin | ~43.043, 106.826 | Dizaines de bâtiments OSM |
| Tailings (TSF) | ~43.04, 106.90 | Polygones industriels à l'est |
| Aéroport Khanbumbat (ZMKB) | 43.1348, 106.8464 | 2e plus fréquenté de Mongolie |

**Bounding box du site** : ~42.98–43.15 N / 106.80–106.93 E (lease ~9 × 9 km).

## Faits pour la modélisation

- **5 puits** : Ø 6.7–11 m, profondeur 1 148–1 385 m (headframes iconiques)
- **Block cave Hugo North Lift 1** : 6 niveaux (apex, undercut, extraction, exhaust, haulage), **2 231 drawpoints**, 52 drifts, layout El Teniente, 95 000 t/j
- **Convoyeur vers la surface** : 3 × 2 202 m inclinés à 6 m/s (route totale ~13.2 km)
- **Open pit** : bancs 15 m, rampes 40 m, ~466 m de profondeur ; concentrateur 100 000 t/j
- **Flotte réelle** : 30 × Komatsu 930E-4SE (290 t) + pelles Cat 7495HR en surface ; 58 unités Sandvik (Toro LH517i…) en souterrain — *pas de CAT 793 ici*

## Disponibilité des données : excellente ✅

- **OSM** : exceptionnel — outline du pit, puits nommés, concentrateur, bâtiments avec hauteurs (`building:levels`, `height`), aéroport, haul roads. 200+ éléments. → Export GeoJSON une fois, versionné dans le repo.
- **Imagerie** : désert du Gobi sans nuages ; tout est net dans Esri World Imagery.
- **Plans** : le [NI 43-101 Technical Report 2020](https://s28.q4cdn.com/411854535/files/doc_financials/2020/AR/oyu_tolgoi_2020_technical_report_ni43-101_finalv2_unsecured.pdf) contient coupes longitudinales, plans de niveaux, layouts de puits → base idéale pour le modèle 3D schématique.

## Faits « démo » pour impressionner

1. **4e plus grande mine de cuivre au monde d'ici 2030** (~500 kt Cu/an 2028–2036)
2. **~200 km de tunnels souterrains**, block cave à 1.3 km sous le Gobi
3. 5 puits à ~1.4 km de profondeur, headframes visibles en satellite
4. Le minerai remonte par un **convoyeur souterrain de 13.2 km**
5. Aéroport privé — la mine est une ville autonome dans le désert

Liens : [[V2 - Analyse initiale]] · [[Recherche - Stack GIS 3D]] · [[Recherche - UX mining ops]]

## Sources

[Rio Tinto OT](https://www.riotinto.com/en/operations/asia/oyu-tolgoi) · [NI 43-101 2020](https://s28.q4cdn.com/411854535/files/doc_financials/2020/AR/oyu_tolgoi_2020_technical_report_ni43-101_finalv2_unsecured.pdf) · [ACG shafts](https://papers.acg.uwa.edu.au/d/2205_43_Stegman/43_Stegman.pdf) · [eot.mn open pit](https://en.eot.mn/open-pit-mine) · [mining-technology](https://www.mining-technology.com/projects/oyu-tolgio/) · [IM fleet](https://im-mining.com/2024/02/13/hexagon-rolls-out-collision-avoidance-system-on-over-200-units-at-oyu-tolgoi-open-pit/) · [SKYbrary ZMKB](https://skybrary.aero/airports/zmkb)
