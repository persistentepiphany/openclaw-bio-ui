# V2 API Rewire — Component Tracking

Branch: `v2-api-integration`
V2 Base: `https://divine-cat-v2-v2.up.railway.app/api/v2`

> Note: As of rewire start, v2 backend returns Railway 404 ("Application not found") —
> the service is not yet deployed. All v2 endpoint calls will fail gracefully until the
> backend is live. UI shows appropriate fallback states.

## API Path Mapping

| Old Path | V2 Path | Status |
|---|---|---|
| `/api/threat-feed` | `/api/v2/threats` | ✅ Rewired |
| `/api/candidates` | `/api/v2/candidates` | ✅ Rewired |
| `/api/heatmap` | `/api/v2/heatmap` | ✅ Rewired |
| `/api/biosecurity` | `/api/v2/biosecurity` | ✅ Rewired |
| `/api/chat` | `/api/v2/chat` | ✅ Rewired |
| `/api/run-pipeline` | `/api/v2/pipeline/run` | ✅ Rewired |
| `/api/pipeline-status/:id` | `/api/v2/pipeline/status/:id` | ✅ Rewired |
| `/api/protein/list` | `/api/v2/protein/list` | ✅ Rewired |
| `/api/protein/bundle` | `/api/v2/protein/bundle` | ✅ Rewired |
| `/api/protein/bundle/:id/pdb` | `/api/v2/protein/bundle/:id/pdb` | ✅ Rewired |
| `/api/protein/bundle/:id` | `/api/v2/protein/bundle/:id` | ✅ Rewired |
| `/api/health` | `/api/v2/health` | ✅ Rewired |
| `POST /api/search` (Scraper) | `GET /api/v2/threats?q=...` | ✅ Rewired |
| `POST /api/scrape` (Scraper) | `POST /api/v2/sync-scraper` | ✅ Rewired |
| Scraper health check | `/api/v2/health` | ✅ Rewired |
| `/api/config/scraper-url` | REMOVED (no longer needed) | ✅ Removed |

## Components

### ✅ Rewired
- `src/api/client.js` — full v2 rewrite, scraper tunnel removed
- `src/App.jsx` — scraper polling replaced with v2 threats polling, handleGatherIntel updated
- `src/api/zai.js` — tool definitions updated for v2

### ⏳ Pending / Not yet touched
- `src/components/ChatInterface.jsx` — uses sendChat from client (auto-gets v2 via client)
- `src/components/MoleculeViewer.jsx` — uses fetchPdb from client (auto-gets v2 via client)
- `src/components/PipelineConfigPanel.jsx` — passes config to handleRun in App.jsx (no direct API calls)
- `src/components/ActivityFeed.jsx` — display only, no direct API calls
- `src/components/intelligence/` — uses Mapbox + scraper report state passed from App.jsx
- `src/hooks/useProteinDiscovery.js` — uses fetchProteinList from client (auto-gets v2 via client)

## Known Issues / TODOs
- V2 backend not yet deployed (Railway 404) — all live-mode API calls will fail gracefully
- `/api/v2/sync-scraper` endpoint existence unverified (backend not live)
- `/api/v2/threats?q=` query param filtering unverified (backend not live)
- Response schema for threats, candidates, heatmap not verified against v2 backend
