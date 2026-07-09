---
name: deploy-front
description: Use when deploying frontend changes to Vercel (v1, v2 or /v3 console), or before any git push to main that touches index.html, js/, css/, v2/ or v3/ — stale ?v= cache-busters make deployed changes invisible.
disable-model-invocation: true
---

# Deploy Frontend (cache-buster checklist)

## Overview

This repo has NO build step: HTML references JS/CSS with `?v=` query params as
cache-busters. If they are not bumped, browsers keep the old files and the
deploy looks like it did nothing.

## Steps

### 1. Identify touched consoles

```bash
git diff --name-only origin/main...HEAD; git status --short
```

- `index.html`, `js/`, `css/` → v1
- `v2/` → v2
- `v3/` → v3

### 2. Bump cache-busters (touched consoles only)

Format: `YYYYMMDD` of today, append `a`, `b`, `c`… for same-day re-deploys (the
sequence resets each new day; any strictly new value works — the format is
convention, not mechanism). Granularity is per console: within a touched
console, bump ALL its entries to the same value, even files that didn't change;
the mistake to avoid is bumping consoles that didn't change at all.

| Console | File | Entries to bump (keep each console's entries in sync) |
|---------|------|-------------------------------------------------------|
| v1 | `index.html` | `js/main.js?v=` |
| v2 | `v2/index.html` | `/v2/css/main.css?v=` AND `/v2/js/main.js?v=` |
| v3 | `v3/index.html` | `/v3/css/main.css?v=`, `/v3/css/tour.css?v=` AND `/v3/js/main.js?v=` |

### 3. Pre-deploy checks (per console)

- **v1**: test BOTH data modes — production API is multi-structure
  (structureManager path), local/static is single-structure (levelFactory path).
- **v2**: if sim constants changed, confirm `v2/js/sim/FleetSimulator.js` and
  `api/_lib/v2/fleetSim.js` are identical (0.1 s cycle drift desyncs phases).
- **v3**: asset URLs must be absolute (`/v3/...`); if any tour `narration`
  changed, the tour-audio skill workflow must have been run first.
- AI endpoints (`/api/v2/query`, `/api/v3/query`) are NOT testable on preview
  deployments — OPENROUTER_API_KEY is Production-only.

### 4. Deploy

- Normal path: commit + push to `main` (Vercel auto-deploys from GitHub).
- Manual: `vercel` (preview) or `vercel --prod`.

### 5. Verify

```bash
curl -s https://mining-risk-visualization.vercel.app/v3/ | grep -o 'v=[0-9a-z]*'
```

ALL entries of the touched console must show the new value (3 matches for v3,
2 for v2, 1 for v1) — a partial match means a forgotten entry. If old values
are still served, the build may still be propagating: wait and re-run. Then
hard-reload in the browser (`?skip-intro=true` bypasses the v1 cinematic).

## Common mistakes

- Bumping only `main.js` in v3 and forgetting the two CSS entries.
- Bumping consoles that did not change (noisy diffs).
- Testing v1 only against the local single-structure backend.
