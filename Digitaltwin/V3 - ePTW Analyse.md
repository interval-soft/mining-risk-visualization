---
tags: [v3, analyse, décision]
date: 2026-07-03
statut: direction validée le 2026-07-03 — Supabase dédié, périmètre complet 6 jalons, ~2-3 semaines
---

# V3 — ePTW : analyse & direction proposée

> **Le signal client** : Worley envoie sa procédure PTW (RevB, « Issued For Review ») pour son chantier réel HMCCP à Padeswood. Le fichier s'appelle **ePTW** mais la procédure est 100 % papier (formulaire Word, tracker manuel, permis affichés au mur, clés physiques). L'intention est transparente : **ils veulent voir cette procédure tourner en électronique.** Détail du contenu : [[Référence - PTW Padeswood RevB]].

## Vision en une phrase

**« Votre procédure RevB, en marche »** : un Control of Work console où les permis vivent sur la carte du vrai site de Padeswood — cycle de vie complet, détection SIMOPS géométrique, registre d'isolations, et une IA qui applique *leur* procédure en citant *leurs* sections.

## Pourquoi c'est le bon coup

1. **Pain réel, projet réel** : un mégaprojet CCS (HyNet) qui démarre avec un PTW papier — la douleur est immédiate et chiffrable (24 h de délai de permis, conflits SIMOPS détectés en réunion et non en amont).
2. **Continuité parfaite avec v2** : même stack GIS + ISA-101, mais on passe de la **visualisation** (v2, données simulées) à l'**application** (v3, état réel, workflows, audit). C'est la marche que Worley veut voir monter.
3. **Le document EST la spec** : rôles, états, validités, règles, checklists — tout est écrit. Zéro invention fonctionnelle.

## Le saut architectural (vs v2)

| | v2 | v3 |
|---|---|---|
| État | `f(clock)` déterministe, rien à persister | **Permis = état créé par l'utilisateur** → DB obligatoire |
| Interaction | Lecture seule | CRUD + workflow + signatures |
| IA | Grounding sur sim | Grounding sur **DB live + la procédure elle-même** (citations §) |
| DB | Optionnelle (audit) | **Cœur du système** (permits, events, isolations, audit 3 ans) |

⚠️ Conséquence : **il faut créer la base Supabase dédiée** (aucun projet DigitalTwin n'existe — constat du 3 juil).

## Concept produit — `/v3/` « HMCCP Control of Work »

```
┌─────────────────────────────────────────────────────────────┐
│ KPI: permits active · pending review · expiring <2h ·       │
│      SIMOPS conflicts · isolations live                     │
├───────────┬──────────────────────────────┬──────────────────┤
│ PERMIT    │   CARTE Padeswood            │ File d'approba-  │
│ BOARD     │   satellite UK + bâtiments   │ tion (selon      │
│ (par état │   + 17 CWA colorées (leur    │ persona) +       │
│ et type,  │   Appendix H) + permis épin- │ événements +     │
│ couleurs  │   glés + zones d'exclusion   │ IA assistant     │
│ du form.) │   + conflits SIMOPS visibles │                  │
├───────────┴──────────────────────────────┴──────────────────┤
│ Timeline: échéances de revalidation (07:00) · expirations   │
│ Persona: [WA ▾] [AA ▾] [PI ▾] [PA ▾]  · site time UK        │
└─────────────────────────────────────────────────────────────┘
```

### Les 6 piliers

1. **Carte + CWA** : Padeswood réel (OSM vérifié : polygone du site, 871 bâtiments, rail). Les **17 CWA digitalisées depuis leur Appendix H** (schématiques, caveat « à remplacer par le GIS client ») avec leur code couleur. Reconnaissance instantanée pour l'audience Worley.
2. **Permit lifecycle engine** : machine à états fidèle aux 8 étapes (Plan→Close) + Suspended/Withdrawn. Chaîne WA→AA→PI→PA avec **persona switcher** (pas de vrai multi-user au POC). Validités réelles : hot work 24 h, confined space 1 shift, 7 j avec revalidation quotidienne — comptes à rebours visibles, expiration automatique.
3. **Formulaire digitalisé** : l'Appendix I (Permit Request Form) en écran, avec checklist des pièces obligatoires (RAMS J-14, TRA, lift plan…) — permis « invalide si docs manquants » appliqué par le système.
4. **SIMOPS engine** ⭐ : détection **géométrique + réglée** des conflits — permis incompatibles dans la même CWA ou adjacents (hot work ↔ confined space, levage ↔ tout, excavation ↔ services), densité de permis = risque cumulé. Conflits dessinés sur la carte + brief quotidien auto-généré pour le SIMOPS meeting.
5. **Registre d'isolations (ICC)** : points d'isolation épinglés (tags rouge/vert/bleu), lockbox/clés trackées, liens ICC ↔ permis (de-isolation bloquée tant qu'un permis lié est ouvert), STT en stretch.
6. **IA Control of Work** ⭐⭐ : grounding double — **permis live + texte intégral de la procédure**. « Puis-je démarrer un hot work en CWA-0800 ? » → réponse avec état des lieux ET citation (« §7.4 : fire watch requis… §6.2.1 : 3 signatures avant acceptation PA »). Génère le brief SIMOPS et le shift handover. C'est le différenciateur que personne d'autre ne montre.

### Stratégie données de démo

Hybride : **seed déterministe** (~18 permis réalistes répartis sur états/CWA/types, échéances calées sur l'heure de la démo — un hot work qui expire dans 90 min, une revalidation due à 07:00, un conflit SIMOPS latent) + **création interactive** persistée. La démo raconte une journée de chantier qui vit.

## Stack

- Front `/v3/` : identique (MapLibre + deck.gl PolygonLayer pour CWA/zones + vanilla, zéro build). Imagerie Esri UK (sub-métrique).
- API `/api/v3/*` : CRUD permits, transitions d'état (validation des règles côté serveur), SIMOPS check, IA query.
- **Supabase (nouveau projet dédié)** : `permits`, `permit_events` (audit), `isolations`, `isolation_points`, `attachments`, RLS on.
- IA : OpenRouter (claude-sonnet-5) + le texte de la procédure embarqué comme contexte (48 p ≈ 20 k tokens — tient directement dans le prompt, pas besoin de RAG au POC).
- Auth : même cookie site + persona switcher.

## Jalons proposés (~2,5 semaines)

| # | Livrable |
|---|---|
| 1 | Données Padeswood (OSM + CWA digitalisées) + carte + shell + **schéma DB + Supabase** |
| 2 | Modèle permis + seed + permit board + permis sur carte + détail |
| 3 | Workflow complet (personas, signatures, revalidation, expiration) + formulaire Appendix I |
| 4 | SIMOPS engine + vue meeting quotidien |
| 5 | Isolations/ICC + lockbox |
| 6 | IA CoW (procédure citée) + audit trail + polish ISA-101 + deploy |

## Risques

| Risque | Mitigation |
|---|---|
| CWA digitalisées ≈ approximatives | Caveat explicite « schématique » ; l'exactitude viendra du GIS client |
| Scope creep isolations (section 8 est énorme) | ICC minimal viable : registre + lockbox + lien permis ; STT/proving dead en phase 2 |
| Workflow multi-rôles sans multi-user | Persona switcher assumé — au POC c'est même mieux pour la démo |
| DB = single point of failure en démo | Seed re-jouable + cache local en lecture ; l'app affiche l'état même si l'écriture échoue |

## Décisions (Joachim, 2026-07-03)

- [x] **Supabase** : projet dédié à créer (coût confirmé avant création)
- [x] **Périmètre** : complet, 6 jalons
- [x] **Deadline** : ~2-3 semaines
- [x] `/v3/` séparé, v1 et v2 intouchés (convention établie)

Liens : [[Référence - PTW Padeswood RevB]] · [[V2 - Analyse initiale]]
