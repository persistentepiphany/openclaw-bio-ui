# BioSentinel UI — Biosurveillance Dashboard

Vite + React frontend. Mapbox threat map, 3D protein viewer, Z.AI chat with tool-calling.

## Environments
- **Production (DO NOT TOUCH)**: main branch, deployed on Vercel, connected to old Railway API
- **V2 integration (work here)**: branch `v2-api-integration`, separate Vercel preview deployment

## Commands
- `npm run dev` — local dev server (port 5174), run from `vite-app/`
- `npm run build` — production build
- `npm run preview` — preview production build locally

## API Backend
- V2 API: `https://divine-cat-v2-v2.up.railway.app/api/v2/*`
- Old API: `divine-cat-production-94fe.up.railway.app` — DEPRECATED, do not use
- Cloudflare tunnel scraper: RETIRED, replaced by v2 ingestion pipeline

## Critical Rules
- NEVER push to main
- NEVER modify existing Vercel project settings
- All work on `v2-api-integration` branch
- Single API client for all backend calls (`src/api/client.js`) — no hardcoded URLs
- Update CHANGELOG.md after changes
- See CONTEXT.md for component rewire tracking

## Architecture
- `src/api/client.js` — single API client, all endpoints via `VITE_BIO_API_URL`
- `src/api/zai.js` — Z.AI GLM-4.5 chat client with tool-calling
- `src/App.jsx` — root component, orchestrates all state and data fetching
- `src/components/` — UI panels (ActivityFeed, ChatInterface, MoleculeViewer, etc.)
- `src/hooks/` — useJobQueue, useProteinDiscovery
- `src/data/mockData.js` — demo mode fallback data

## Env Variables
- `VITE_BIO_API_URL` — v2 API base URL (no trailing slash)
- `VITE_Z_AI_API_KEY` — Z.AI GLM-4.5 API key
- `VITE_MAPBOX_TOKEN` — Mapbox GL token for intelligence map
- ~~`VITE_SCRAPER_API_URL`~~ — REMOVED (scraper retired)
- ~~`VITE_SCRAPER_API_KEY`~~ — REMOVED (scraper retired)
