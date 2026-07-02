---
tags: [v2, recherche, design]
date: 2026-07-02
statut: terminé
---

# Recherche — UX des logiciels d'opérations minières

> Objectif : design **fonctionnel, pas tape-à-l'œil** pour le POC Worley. Sources : Cat MineStar, Modular DISPATCH, Hexagon MineOperate, Sandvik OptiMine, Wenco, Epiroc Mobilaris, Micromine Pitram, GMG, ISA-101, Worley, Bentley iTwin.

## Patterns UI récurrents dans les FMS réels

- **Carte d'abord** : canvas central = plan de mine (2D en surface, 3D en souterrain — OptiMine 3D Visualizer, Mobilaris). Équipements = icônes simples + **ID court** (`DT101`, `EX03`) coloré par statut.
- **Rail gauche** : liste d'équipements filtrable par type/zone/statut.
- **Bandeau KPI** : tonnes/h, cycle times (load/haul/dump/return), queue & hang time, utilisation, réel vs cible du shift.
- **Feed d'alertes/événements** chronologique temps réel.
- **Vue shift** : planifié vs réalisé, handoff notes.
- **Panneau détail asset** au clic : statut, opérateur, tâche, payload, santé machine.
- **Time Usage Model (GMG/ASARCO)** : `Operating / Standby / Delay / Down` — l'afficher rend l'app immédiatement crédible aux yeux d'un minier.

## Langage visuel « pro » vs « tech demo »

| Signal | Convention |
|---|---|
| Operating | vert |
| Standby / Delay | jaune / ambre |
| Down | rouge |
| Maintenance planifiée | gris / bleu |
| Risque | rampe vert → jaune → orange → rouge |

- **ISA-101 (HMI)** : fond gris neutre désaturé ; la couleur signale **uniquement l'anormal**. Un écran « tout vert » est un anti-pattern.
- **Densité élevée** : tableaux serrés, typo mono/condensée, IDs en majuscules, unités explicites (t, t/h, min), timestamps partout. Pas de gros chiffres décoratifs, pas de gradients ni glow.

## 4 principes de design pour v2

1. **Control-room gris/sombre, palette muette** — couleur = états sémantiques et alertes seulement (ISA-101).
2. **Canvas carte/3D central + rail gauche dense** + bandeau KPI haut + feed événements droite/bas.
3. **Tout ancré au temps** : shift courant, réel vs plan, décomposition Operating/Standby/Delay/Down.
4. **Drill-down contextuel** : chaque objet cliquable → panneau détail sans quitter la carte.

## Précédents digital twin

- **Worley** : positionne le twin comme « single source of truth » (ingénierie + IoT + maintenance prédictive). Insiste sur l'**intégrité des données**, pas le visuel. Partenariat AVEVA.
- **Bentley iTwin + Seequent** : OceanaGold Waihi — twin 3D stabilité pentes/tailings, capteurs temps réel superposés au modèle géologique. **Très proche de notre cas d'usage risque.**
- **Unity/Unreal** (LlamaZOO) : immersif mais cantonné formation/communication. Les vraies ops = UIs denses et sobres.

## Conclusion

La crédibilité vient des **conventions métier** (time model, couleurs statut, IDs, shift) + **sobriété ISA-101** — pas des effets visuels. C'est exactement l'inverse du parti pris cinématique de v1.

Liens : [[V2 - Analyse initiale]] · [[Recherche - Stack GIS 3D]] · [[Recherche - Oyu Tolgoi]]

## Sources

[Cat MineStar](https://www.cat.com/en_US/by-industry/mining/minestar-solutions.html) · [Modular DISPATCH](https://www.mining-technology.com/products/dispatch-fleet-management/) · [HxGN MineOperate](https://hexagon.com/products/product-groups/hxgn-mineoperate) · [Sandvik OptiMine 3D](https://www.rocktechnology.sandvik/en/products/automation/optimine-information-management-system/optimine-3d-mine-visualizer/) · [Wenco](https://www.wencomine.com/our-solutions/mining-fleet-management) · [Epiroc Mobilaris](https://www.epiroc.com/en-us/customer-stories/2023/optimizing-flows) · [Micromine Pitram](https://www.micromine.com/pitram/) · [GMG Time Classification](https://gmggroup.org/wp-content/uploads/2024/07/20200713_Time_Classification_Framework-GMG-DAU-v01-r01-1.pdf) · [ISA-101 HMI](https://plcprogramming.io/blog/hmi-design-best-practices-complete-guide) · [Worley digital twin](https://www.worley.com/en/insights/our-thinking/digital-and-technology/transforming-mining-operations-with-digital-twin-technology) · [Bentley mining twins](https://blog.bentley.com/software/digital-twins-iot-mining-transformation/) · [LlamaZOO MineLife](https://llamazoo.com/minelife/)
