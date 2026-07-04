---
tags: [v3, référence, worley, ptw]
date: 2026-07-03
source: ePTW_Wor_RevB.pdf (215000-00190-000-HS-PRO-00002, Rev B IFR)
---

# Référence — Procédure Permit to Work HMCCP (Worley RevB)

> Résumé opérationnel du document Worley pour le **Heidelberg Materials Carbon Capture Project (HMCCP)** — usine de captage CO₂ adossée à la cimenterie de Padeswood (Flintshire, Pays de Galles). Consortium HyNet North West, Worley + Mitsubishi Heavy Industries. CO₂ exporté par pipeline vers stockage offshore (Eni UK). Sert de **spec fonctionnelle** pour le V3 et de **source de grounding IA**.

## Le projet

- Greenfield (usine CCC) + brownfield (tie-ins cimenterie existante Heidelberg)
- Kiln 4 + nouvelle CHP → Carbon Capture & Compression (CCC) plant
- **17 Construction Work Areas (CWA-0100 → CWA-1700)** avec code couleur (Appendix H = plot plan) : AGI compound, absorber, quencher, gas-gas heater, pipe racks, CHP, compression CO₂, substation, cooling tower, tank farm, tie-ins existants, control room, water treatment…

## Rôles (chaîne d'approbation)

| Rôle | Qui | Fait quoi |
|---|---|---|
| **WA** Work Authority | Senior Worley site (Construction Mgr) | Approuve tout travail, préside SIMOPS daily |
| **AA** Area Authority | Compétent par zone | Vérifie readiness plant/équipement, isolations, coordonne SIMOPS |
| **PI** Permit Issuer | Gestionnaire du permit office | Review/issue permits, vérifie RAMS+SIMOPS, tient le **Permit Tracker**, gère lockboxes |
| **PR** Permit Requestor | Contractor | Soumet la demande + pièces jointes |
| **PA** Performing Authority | Superviseur de la tâche | Accepte le permis, toolbox talk, supervise, peut cumuler plusieurs permis (si approuvé WA+AA+PI) |
| **PW** Permit Worker | Exécutant | Signe, travaille sous le permis |
| **SAP / AI** | Senior Authorised Person / Authorised Isolator (élec LV / process-méca) | Posent/retirent les isolations, ICC, proving dead |
| **AGT** | Authorised Gas Tester | Tests atmosphériques |

Flow d'approbation : **WA → AA → PI** (3 signatures avant que le PA signe l'acceptation). Aucun travail sans permis approuvé et émis.

## Types de permis & validités

| Type | Validité | Notes |
|---|---|---|
| Cold Work (général) | 7 jours | Revalidation quotidienne (PI + PA entrant) |
| Hot Work (early works/civil) | 7 jours | idem |
| **Hot Work (construction)** | **24 h** | Fire watch pendant + 30 min après (PA reste 1 h) |
| **Confined Space Entry** | **1 shift** | Standby person permanent, gas testing, entry log |
| Excavation | 7 jours | Utility drawings obligatoires, marquage services |
| Excavation (Piling) | 7 jours | Checklist pre-work par le PA (rig exclusion zones…) |

Codes couleur du formulaire : Excavation **noir**, Cold Work **bleu**, Hot Work **rouge**, Other **vert**.

## Cycle de vie (Set To Work, 8 étapes)

1. **Plan** (PA/PR) — scope + RAMS **J-14**
2. **Prepare** (PA/PR) — permis + RAMS/TRA (demande **≥24 h** avant, 7 j post-earthworks)
3. **Review** (AA/PI) — SIMOPS, isolations, planning
4. **Verify** (PA+AA+PI) — inspection conjointe du site
5. **Authorise** (WA+AA+PI) — approbation, enregistrement au Tracker
6. **Issue & Execute** (PA) — toolbox talk, POWRA, supervision
7. **Monitor** (PI+AA) — contrôles, gestion SIMOPS
8. **Close** (PA+PI) — zone propre, signature conjointe

**Suspension/retrait** : alarme d'urgence, changement de scope, SSoW non suivi… Revalidation d'un permis suspendu = re-approbation **WA+AA+PI**. Si AA/PI/PA quitte le site → permis retourné au permit office et réémis.

## Pièces jointes obligatoires (invalide sans)

RAMS (J-14) · TRA · POWRA · Take5 · **ICC** (si isolation) · Grid maps · Lift Plan (J-14, revu par Appointed Person) · Utility clearance drawings (excavation) · Engineering drawings. Permis invalide si docs manquants.

## SIMOPS

- **Daily look-ahead / Line of Sight meeting** : revue des permis vifs et demandes, identification SIMOPS, risque cumulé, couverture supervision, changements planifiés
- Le PI vérifie que les travaux qui interagissent sont identifiés et le conflit évité ou contrôlé (controlled areas)

## Isolations (section 8 — la plus dense)

- **ICC** (Isolation Confirmation Certificate) : isolation posée par SAP, enregistrée, clé de **lockbox** remise au PA — l'isolation ne peut être retirée tant que tous les permis liés ne sont pas clos
- 4 types : Process, Électrique, Instruments & Contrôles, Mécanique
- **LOTO** : locks + lockbox au permit office (single point of control), tags rouge/blanc « Do Not Operate » avec n° de point, n° ICC, équipement, raison, isolateur
- Registre d'isolation : points numérotés séquentiellement, plans markés (process : rouge=fermé, vert=ouvert, bleu=bleed ; élec : rouge=fermé, vert=ouvert, jaune=terre)
- **Cross-checking** par une 2e personne (sauf basse conséquence)
- **STT** Sanction To Test : ré-énergisation temporaire pour tests — cycle 10 étapes, suspend les autres permis liés à l'ICC
- **Proving dead** obligatoire (voltage indicator approuvé, pas de multimètre), tensions ELV/LV/HV, conformant vs non-conformant
- **Positive isolation** (spool removal, spade, spectacle plate) pour confined space, long terme, HP/LP, hot work sur hydrocarbures… (Appendix J : catégories I positive / II proved DBB-SBB / III non-proved)
- Isolations sur la cimenterie existante = contrôlées par les opérations Heidelberg (Transfer of Responsibility, cross-site boundary isolations)

## Audit & rétention

- Conservation permis + certificats **3 ans minimum**
- **Daily PTW register** tenu par le Permit Coordinator
- Life Saving Rules : « Work with a valid permit when required » + « Verify isolation and zero energy before work begins »
- Le PI affiche les copies de tous les permis émis de manière visible et cohérente (**permit board physique** — §C.16)

## Constat clé pour V3

Le document décrit un processus **entièrement papier** : formulaire Word (Appendix I), tracker manuel, permis affichés au mur, clés physiques au permit office. Le nom du fichier — **ePTW** — dit l'intention. Tout est spécifié pour être digitalisé : états, rôles, échéances, règles de conflit, registre.

Liens : [[V3 - ePTW Analyse]] · [[V2 - Analyse initiale]]
