# DigitalTwin - Mining Risk Visualization

## Quick Start

Frontend (no build step - static files):
  npx serve .              # or any static file server on port 8080
  vercel dev               # alternative: serves frontend + serverless API together

Backend:
  docker compose up -d     # PostgreSQL on localhost:5432
  cd backend && cp .env.example .env
  npm install && npm run migrate && npm run seed
  npm run dev              # Express API on port 3000

## Architecture

Vanilla JS + Three.js 3D visualization with dual API backends:
- `index.html` → `js/main.js` entry point (ES modules, no bundler, cinematic intro)
- `api/` → Vercel serverless functions (production API)
- `backend/` → TypeScript Express server (local dev API)
- `css/` → Modular stylesheets (one per UI panel)
- `data/mine-data.json` → Static fallback data
- `js/` subdirectories: core/, geometry/, effects/, objects/, interaction/, ui/, demo/, cinematic/

Three.js and GSAP loaded via CDN import maps in index.html, NOT npm.

## Key Files

- `js/main.js` - App entry, MineVisualizationApp class (includes cinematic intro)
- `js/cinematic/CinematicIntro.js` - GSAP-driven 27s opening sequence
- `js/geometry/StructureManager.js` - Multi-structure orchestrator (creates per-structure groups)
- `js/geometry/StructuralElements.js` - Shafts, ramps, connectors between levels
- `js/geometry/LevelFactory.js` - Level mesh creation, pillars, risk coloring
- `js/core/StateManager.js` - Central state, event-driven
- `js/core/SceneManager.js` - Three.js scene setup
- `js/config.js` - All constants (geometry, camera, colors)
- `js/env.js` - Runtime API URL config
- `api/_lib/` - Shared serverless utilities (db, AI, queries)
- `backend/src/engine/RiskEngine.ts` - Risk calculation rules
- `middleware.js` - Vercel Edge auth (cookie: site_auth)

## Code Style

- Frontend: vanilla JS, ES modules, class-based (no framework)
- Backend: TypeScript, strict mode, ES2022 target
- CSS: one file per panel/feature, no preprocessor
- No build step for frontend - files served as-is
- Imports use `.js` extension in frontend code

## Database

PostgreSQL 16 via Docker. Schema managed by Knex migrations in `backend/`.
Production uses `DATABASE_URL` env var (single connection string).

Key tables: snapshots, snapshot_levels, snapshot_activities, events,
measurements, alerts, structures

Run migrations: cd backend && npm run migrate
Seed demo data: cd backend && npm run seed
Rollback:       cd backend && npm run migrate:rollback

## Testing

cd backend && npm test           # Vitest (one-shot)
cd backend && npm run test:watch

Frontend has no test suite - manual testing only.

## Gotchas

- Production Vercel API returns multi-structure data (3 structures).
  Local backend/static JSON returns single-structure. Code paths differ
  (structureManager vs levelFactory) — test both modes.
- Append `?skip-intro=true` to bypass the cinematic opening sequence.
- `index.html` loads `js/main.js?v=YYYYMMDD`. Bump the `?v=` cache-buster
  query param when deploying frontend changes, or changes may not appear.
- Fonts (Roboto Mono) and icons (Material Symbols Rounded) load from
  Google Fonts CDN. No local fallback.
- Frontend has NO build step. Don't add webpack/vite to root.
- Three.js (v0.160.0) and GSAP (v3.12.5) come from jsdelivr CDN
  via import maps in index.html - not from node_modules.
- Root package.json only has `pg` dep (used by Vercel serverless).
- Backend package.json is separate (cd backend first).
- Auth is cookie-based via Vercel Edge middleware - only protects
  / and /index.html routes.
- API endpoints exist in TWO places: api/ (Vercel) and
  backend/src/api/ (Express). Keep them in sync.
- Node >= 20 required for backend.
- Level meshes use ExtrudeGeometry + rotateX(-π/2). After rotation, geometry
  spans local Y from 0 to LEVEL_HEIGHT (not centered at origin). When
  positioning objects relative to levels, use `position.y` as the bottom face
  and `position.y + LEVEL_HEIGHT` as the top face.

## V2 — Oyu Tolgoi Operations Console (/v2/)

Standalone page, POC for Worley. Does NOT touch v1 code paths.
- `v2/` static files: MapLibre v5 + deck.gl v9 (UMD script tags) + Three.js
  (import map) — no build step, same as v1.
- TWIN deterministic simulators: `v2/js/sim/FleetSimulator.js` (browser) and
  `api/_lib/v2/fleetSim.js` (serverless). State = pure f(clock). KEEP CONSTANTS
  IN SYNC — cycle math must use the integer lengthM from v2/data/routes.json
  (a 0.1 s cycle drift fully desyncs phases via t % cycle).
- AI: POST /api/v2/query grounds the LLM on the server sim + site facts.
  Audit trail self-provisions table v2_ai_queries when DATABASE_URL exists;
  silently skipped otherwise (demo must never break on DB).
- /v2 is gated by the same site_auth cookie (middleware.js matcher).
- All v2 asset URLs are ABSOLUTE (/v2/...) — Vercel serves /v2 without a
  trailing slash, so relative paths would resolve into v1 files.
- OPENROUTER_API_KEY is marked Sensitive in Vercel (unreadable) and only set
  for Production — the AI cannot be tested on preview deployments.
- Bump the ?v= cache-busters in v2/index.html when deploying v2 changes.

## V3 — HMCCP ePTW Console (/v3/)

Digital Permit to Work for Worley's Padeswood carbon-capture project (UK).
The Worley procedure 215000-00190-000-HS-PRO-00002 RevB IS the functional
spec (digest note in the Digitaltwin/ Obsidian vault).
- Same no-build stack as v2 (MapLibre UMD + vanilla ESM). /v3 gated by
  the site_auth cookie. All asset URLs absolute (/v3/...).
- SHARED pure-JS modules in v3/js/data/ (permitSeed, permitFlow, simops,
  isolationFlow) are imported by BOTH the browser and api/v3/* functions —
  single source of truth, no twin files to sync. Demo seed anchors to
  today's 07:00 UK so countdowns are always alive.
- api/v3/* read the Supabase project "digitaltwin" (mpytqivbpzbsurykvmlr,
  us-east-1) when DATABASE_URL is set; otherwise they serve/validate
  against the deterministic seed. POST /api/v3/seed re-anchors demo data.
  DATABASE_URL must be added to Vercel by hand (Supabase MCP cannot read
  the DB password).
- AI: POST /api/v3/query grounds the LLM on live permits/SIMOPS/ICC plus
  the procedure digest (api/_lib/v3/procedure.js) and cites § sections.
- CWA polygons: zone SHAPES are schematic (traced from Appendix H) but the
  plot-plan PLACEMENT is georeferenced (2026-07-04) against the DNS Site
  Masterplan (RSK Fig 1.2, OSGB grid frame, 1:5000) + eni AGI drawing
  Sheet 14 — anchor = stormwater pond, plant north = 019° true, raster
  0.3545 m/px. PLOT_PLAN corners in v3/js/config.js MUST stay in sync with
  the CORNERS block of the generator (v3/tools/gen-cwa.cjs) and
  the PIN table in permitSeed.js (CWA centroids). SIMOPS radii (simops.js)
  are calibrated to these distances — re-check the 1 HIGH + 2 MEDIUM demo
  narrative after any re-anchor.

## Project Phases

Phase 1 (done): 3D visualization POC
Phase 2 (current): Operational intelligence, time-series, risk engine
Phase 3 (planned): AI predictions, anomaly detection, NL queries
