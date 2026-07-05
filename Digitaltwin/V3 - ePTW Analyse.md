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
| 1 | ✅ **Fait (2026-07-04)** — Supabase `digitaltwin` (us-east-1, schéma v3 + RLS), OSM Padeswood (871 bâtiments), 26 CWA Appendix H géoréférencées (plant-north 341°), shell ISA-101, `/v3` protégé |
| 2 | ✅ **Fait (2026-07-04)** — Seed partagé unique (16 permis ancrés 07:00 UK, 2 ICC, 40 événements), GET /api/v3/permits (DB→fallback seed) + POST /api/v3/seed (reset démo), board par état avec countdowns, pins carte, détail (chaîne signatures, checklist §4.2), feed audit. Déployé prod. |
| 3 | ✅ **Fait (2026-07-04)** — Machine à états partagée (9 actions §5/§6.2, rôles, signatures, raisons obligatoires, erreurs référencées §), POST /api/v3/action + /api/v3/create, boutons contextuels par persona, file « My approvals », formulaire Appendix I digital (placement carte, validité auto §4.1). Chaîne complète QA : requested→issued via 4 personas. Fix : validité par type dans le fallback local. |
| 4 | ✅ **Fait (2026-07-04)** — simops.js partagé (§6.4/§C.11 : hot×confined, exclusion levage, travaux de sol, risque cumulé ; high=2 live / medium=1 en approbation), overlay carte (liens pointillés + anneaux), panneau Daily SIMOPS avec conseils §6.3, badge/KPI rouges. Seed : PTW-0133 espace confiné dans l'absorber en soudure = conflit HIGH 0 m. Résolution live QA : suspension → KPI 1→0, audit tracé. Vérifié en prod. |
| 5 | ✅ **Fait (2026-07-04)** — isolationFlow.js partagé (apply/remove SAP-only, **garde §8.1.1** : dé-isolation bloquée si permis lié ouvert, nominatif), POST /api/v3/isolation, registre ICC (points aux couleurs de tag §8.9, lockbox+porteur §8.3, permis liés), points sur carte, persona SAP. QA : blocage → clôture PA → dé-isolation §8.12, KPI 2→1. STT/proving dead = phase 2. |
| 6 | ✅ **Fait (2026-07-04)** — Digest § de la procédure (api/_lib/v3/procedure.js) + POST /api/v3/query à double grounding (état live : permis expirés/docs manquants/SIMOPS/ICC + la procédure), réponses citées §, audit v2_ai_queries, chips de démo. Vérifié prod : « hot work CWA-0620 ? » → NO sur 3 fondements (§4.1+§1.4, §6.2.1, §6.4+§6.3) en 1.7 s. **POC v3 COMPLET : 6 jalons en 2 jours (plan : 2-3 semaines).** |
| 7 | ✅ **Fait (2026-07-04)** — **Wizard guidé narré** (22 étapes, 8 chapitres) : spotlight qui pilote la vraie UI (personas, permis, SIMOPS, ICC, requête IA live), citations § à chaque étape, sauts par chapitre, mode auto-play (présentation), auto-lancement 1ʳᵉ visite. Narration vocale féminine anglaise **pré-générée en MP3 statiques** (3,3 Mo) via /api/v3/tts — OpenRouter `gpt-audio-mini` (le Gemini TTS demandé n'est pas encore servi par OpenRouter), pipeline pcm16→WAV→ffmpeg→mp3. QA prod : tour complet déroulé, IA live « NO » cité §, audio streamé 206. |

## Positionnement client (décidé le 2026-07-05)

Le vrai système PTW de Worley tourne sur **Isometrix**. Cadrage de la démo, intégré à l'intro du tour :
- **Couche, pas remplacement** : le Digital Twin se branche par-dessus le système d'enregistrement existant ; en déploiement réel il **fédère** permis/isolations/SIMOPS depuis leur source de vérité (Isometrix), il ne la remplace pas.
- **Données factices** : sample data issue d'une petite base de démo (ne pas mentionner Supabase — non pertinent pour le client).
- **IA = frein client** : Worley réticent. Réponse retenue = **modèle local on-premise (ex. Gemma), aucune communication externe, aucune donnée ne quitte le réseau**. Annoncé dans le chapitre IA.
- **« faithful to RevB »** plutôt que « nothing invented » (procédure = RevB *Issued For Review*, non figée).
- Simplifications POC **nommées** dans le tour : persona switcher vs vrai multi-user (délégation/escalade), ICC = première tranche de §8 (LOTO/proving-dead en phase ultérieure).
- **Demande client : reporting / génération de documents.** Angle sécurité idéal car **déterministe, sans IA, rien ne sort du réseau**. Candidats (issus de la procédure) : certificat de permis (Appendix I rempli + signatures), brief SIMOPS quotidien (§6.4 look-ahead daté), shift handover, certificat d'isolation (§8), export d'audit (§9.1). Livraison pressentie : vue print-stylée → PDF navigateur, zéro service externe. **À construire.**

## Risques

| Risque | Mitigation |
|---|---|
| CWA digitalisées ≈ approximatives | Formes des zones schématiques (Appendix H), mais **placement géoréférencé le 4 juil** sur le DNS **Site Masterplan** (RSK Fig 1.2, grille OSGB 1:5000 au cadre, portail gallois CAS-02009-W1R1Z7) + dessin AGI eni (Sheet 14, corrélé OSM à ±5 m). Ancre = bassin d'orage (65,5×83,9 m), plant north = 019° vrai, échelle raster 0,3545 m/px, résidu ~10 m (révisions de layout différentes entre dessins). L'exactitude finale viendra du GIS client |
| Scope creep isolations (section 8 est énorme) | ICC minimal viable : registre + lockbox + lien permis ; STT/proving dead en phase 2 |
| Workflow multi-rôles sans multi-user | Persona switcher assumé — au POC c'est même mieux pour la démo |
| DB = single point of failure en démo | Seed re-jouable + cache local en lecture ; l'app affiche l'état même si l'écriture échoue |

## Décisions (Joachim, 2026-07-03)

- [x] **Supabase** : projet dédié à créer (coût confirmé avant création)
- [x] **Périmètre** : complet, 6 jalons
- [x] **Deadline** : ~2-3 semaines
- [x] `/v3/` séparé, v1 et v2 intouchés (convention établie)

Liens : [[Référence - PTW Padeswood RevB]] · [[V2 - Analyse initiale]]
