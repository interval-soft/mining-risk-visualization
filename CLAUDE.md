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

## Project Phases

Phase 1 (done): 3D visualization POC
Phase 2 (current): Operational intelligence, time-series, risk engine
Phase 3 (planned): AI predictions, anomaly detection, NL queries
