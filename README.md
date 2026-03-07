# BioSentinel

Real-time biosurveillance dashboard for monitoring global biological threats, designing therapeutic candidates, and screening them for biosecurity risks. Built for the OpenClaw hackathon.

**Live demo:** [openclawui-gilt.vercel.app](https://openclawui-gilt.vercel.app)

## What It Does

BioSentinel is an end-to-end platform that connects threat intelligence gathering to computational drug design. An analyst can:

1. **Monitor** global biosecurity threats via automated scraping of public health sources
2. **Identify** target proteins from emerging pathogens (H5N1, Nipah, Ebola, SARS-CoV-2, Anthrax)
3. **Design** therapeutic binder candidates using RFdiffusion + ProteinMPNN
4. **Validate** candidates against multiple pathogen variants via Boltz-2 structure prediction
5. **Screen** all candidates for biosecurity risks against a curated toxin database
6. **Analyze** results through an AI-powered chat assistant that can drive the entire workflow

## Architecture

```
                        +------------------+
                        |   Vercel (CDN)   |
                        |  React Frontend  |
                        +--------+---------+
                                 |
                  +--------------+--------------+
                  |                             |
         +--------v--------+          +--------v--------+
         |  Bio API         |          |  Scraper API     |
         |  (Railway)       |          |  (Cloudflare)    |
         |                  |          |                  |
         |  Pipeline runner |          |  Threat scraping |
         |  Candidates API  |          |  Intelligence    |
         |  Protein bundles |          |  reports         |
         |  Heatmap data    |          |                  |
         +--------+---------+          +-----------------+
                  |
         +--------v--------+
         |  Compute Tools   |
         |                  |
         |  RFdiffusion     |
         |  ProteinMPNN     |
         |  Boltz-2         |
         |  Foldseek        |
         +------------------+
```

### Frontend (this repo)

React 19 + Vite 7 single-page application with two main views:

- **Dashboard** -- resizable CSS Grid layout with activity feed, 3D molecule viewer, candidate table, heatmap, biosecurity panel, and AI chat
- **Intelligence Map** -- Mapbox GL globe with incident markers, threat arcs, severity filters, temporal timeline, and AI threat summary

### Backend (separate repo)

FastAPI server on Railway running the computational biology pipeline:

- **Epitope detection** -- identifies conserved antigenic surface regions across HA strains
- **Binder generation** -- RFdiffusion backbone design + ProteinMPNN sequence optimization
- **Cross-variant validation** -- Boltz-2 structure prediction with pLDDT/PAE scoring
- **Biosecurity screening** -- Foldseek TM-align against curated toxin structure database

### AI Integration

| Provider | Model | Role |
|----------|-------|------|
| [Z.AI](https://z.ai) (Zhipu) | GLM-4.5 | Primary -- chat assistant, protein summaries, threat landscape analysis |
| [Flock.io](https://flock.io) | Qwen3-30B | Fallback -- used when Z.AI is unavailable |

The chat assistant has access to 7 tools it can invoke to take real actions on the dashboard (run pipeline, trigger scrapes, search threats, suggest targets, etc).

## Features

### Pipeline System

The pipeline runs a configurable set of computational biology tasks:

| Task | Tool | Purpose |
|------|------|---------|
| Epitope Detection | BioPython | Find conserved surface epitopes on target protein |
| SASA Analysis | Shrake-Rupley | Compute per-residue solvent accessibility |
| Binder Generation | RFdiffusion + ProteinMPNN | De novo therapeutic protein design |
| Cross-Variant Validation | Boltz-2 | Predict binding across pathogen variants |
| Biosecurity Screen | Foldseek | Check candidates against toxin database |

**Presets:**
- **Full Pipeline** -- all 5 tasks
- **Standard** -- epitope + SASA (independent analysis, no generation required)
- **Quick Scan** -- epitope only
- **Design Only** -- SASA + generation + validation
- **Custom** -- toggle individual tasks

**Resilient execution:** The pipeline continues on step failure. Steps with unmet dependencies (e.g., validation requires generation) are automatically skipped. The job completes with partial results and warnings rather than failing entirely.

**Results overlay:** Step-by-step walkthrough of findings with per-step status badges (completed/failed/skipped), detailed findings for each analysis type, and a download button that exports the full report as JSON.

### Intelligence Map

- Global threat visualization on a 3D Mapbox globe
- Incident markers colored by severity with click-to-inspect detail panels
- Threat arcs connecting locations that share a pathogen
- Severity filters and temporal brushing on a 30-day timeline
- KPI row with live incident counts
- **AI Summary panel** -- Z.AI generates a 4-bullet threat landscape analysis from current incidents

### Molecule Viewer

- Dual-engine: 3Dmol.js (lightweight) and Molstar (full-featured) with lazy-loaded switching
- Multiple visualization modes: cartoon, surface, ball-and-stick, analysis overlays
- Protein selector dropdown with server-resident and RCSB-bundled proteins
- AI-generated science summaries (overview, structure, binding sites, biosecurity risks)

### Biosecurity Panel

Collapsible panel in the right sidebar showing:
- Screening summary (X candidates screened, Y flagged)
- Per-candidate cards with best toxin hit, TM-score, e-value
- Risk level indicator bar (threshold: TM-score 0.5)

### Protein Discovery

- Auto-discovers protein targets from scraper threat reports
- Maps pathogens to known protein structures (H5N1 -> 4NQJ, Nipah -> 7L1F, etc.)
- Fetches and bundles proteins from RCSB PDB on demand
- Triggers onboarding guide after first protein selection

### Design Tools (Job Panel)

Modal-based interface for submitting individual computational jobs outside the main pipeline flow.

## Protein Targets

Pre-bundled proteins available for pipeline targeting:

| Pathogen | PDB ID | Structure |
|----------|--------|-----------|
| H5N1 Influenza | 4NQJ | Neuraminidase |
| Nipah virus | 7L1F | G glycoprotein |
| Ebola virus | 5T6N | VP40 matrix protein |
| SARS-CoV-2 | 6VMZ | Main protease (Mpro) |
| SARS-CoV-2 | 7BV2 | Spike RBD |
| SARS-CoV-2 | 6LU7 | Mpro + N3 inhibitor |
| Anthrax | 3I6G | Protective antigen |

Additional strains proteins: 4KTH, 4KWM, 4MHI, 5E2Y, 9MQ2

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Environment Setup

Copy the example env file and fill in your keys:

```bash
cd vite-app
cp .env.example .env
```

Required variables:

| Variable | Service | Required |
|----------|---------|----------|
| `VITE_BIO_API_URL` | Railway Bio API base URL | Yes |
| `VITE_MAPBOX_TOKEN` | Mapbox GL access token | Yes (for map) |
| `VITE_SCRAPER_API_URL` | Scraper API base URL | For live mode |
| `VITE_SCRAPER_API_KEY` | Scraper API authentication key | For live mode |
| `VITE_Z_AI_API_KEY` | Z.AI (Zhipu) API key | For AI chat |
| `VITE_FLOCK_API_KEY` | Flock.io API key | For AI fallback |

> **Security note:** `VITE_`-prefixed variables are embedded in the browser bundle at build time. For production, proxy AI calls through the backend.

### Install and Run

```bash
cd vite-app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build for Production

```bash
npm run build
```

Output is in `vite-app/dist/`.

### Deploy to Vercel

The repo includes a `vercel.json` configuration. To deploy:

```bash
vercel login
vercel link --yes
vercel --prod
```

Set the `VITE_*` environment variables in the Vercel dashboard or via CLI:

```bash
echo "your-value" | vercel env add VITE_BIO_API_URL production
```

## Dashboard Modes

| Mode | Data Source | Backend Required |
|------|-----------|------------------|
| **Demo** | Built-in mock data | No |
| **Live** | Real API endpoints | Yes |

Toggle in the header bar. Demo mode loads immediately with sample data. Live mode connects to the Bio API and Scraper API, with auto-discovery of the scraper tunnel URL.

## Project Structure

```
openclaw-bio-ui/
├── README.md
├── vercel.json                  # Vercel deployment config
└── vite-app/
    ├── .env.example             # Environment template
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx              # Root component, state management, pipeline orchestration
        ├── App.css              # Global styles
        ├── api/
        │   ├── client.js        # Unified REST client (Bio API + Scraper API)
        │   ├── zai.js           # Z.AI chat, protein summaries, threat summaries
        │   └── flock.js         # Flock.io fallback AI client
        ├── components/
        │   ├── ActivityFeed.jsx         # Left sidebar threat/activity feed
        │   ├── AnalysisPanel.jsx        # Protein analysis data display
        │   ├── BiosecurityPanel.jsx     # Biosecurity screening results
        │   ├── ChatInterface.jsx        # AI chat with tool execution
        │   ├── DataTable.jsx            # Candidate compounds table
        │   ├── Heatmap.jsx              # Cross-variant interaction matrix
        │   ├── LandingPage.jsx          # Login/landing screen
        │   ├── MoleculeViewer.jsx       # 3D protein viewer (3Dmol + Molstar)
        │   ├── OnboardingGuide.jsx      # First-run tutorial overlay
        │   ├── PipelineConfigPanel.jsx  # Pipeline task/preset configuration modal
        │   ├── PipelineResultsOverlay.jsx  # Post-pipeline results walkthrough
        │   ├── ProteinDiscoveryPanel.jsx   # Protein target discovery from threats
        │   ├── ViewerOverlay.jsx        # Candidate info overlay on viewer
        │   ├── WorkflowStatus.jsx       # Pipeline step progress indicator
        │   ├── intelligence/            # Intelligence Map sub-components
        │   │   ├── IntelligenceMapPage.jsx  # Map orchestrator + AI summary
        │   │   ├── MapContainer.jsx     # Mapbox GL globe renderer
        │   │   ├── KpiRow.jsx           # Key metric cards
        │   │   ├── LeftSidebar.jsx      # Incident list + timeline
        │   │   ├── DetailPanel.jsx      # Incident detail flyout
        │   │   ├── BottomBar.jsx        # Status bar
        │   │   └── ...                  # Filters, mini-maps, charts
        │   ├── jobs/                    # Design Tools modal
        │   │   ├── JobPanel.jsx
        │   │   └── ...
        │   └── viewer/                  # Viewer sub-components
        ├── hooks/
        │   ├── useFilteredIncidents.js  # Map incident filtering
        │   ├── useJobQueue.js           # Design tool job management
        │   ├── useMapAutoRotate.js      # Globe auto-rotation
        │   └── useProteinDiscovery.js   # Protein suggestion extraction
        ├── data/
        │   ├── mockData.js              # Demo mode seed data
        │   ├── mockMapData.js           # Demo mode map incidents
        │   └── mockDesignData.js        # Design tool catalog
        └── utils/
            ├── pathogenProteinMap.js     # Threat-to-protein mapping
            ├── proteinDataCache.js       # Protein metadata cache
            ├── download.js              # File download helpers
            └── mapConstants.js          # Map styling constants
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19, Vite 7 |
| Styling | Tailwind CSS 4, Framer Motion |
| Maps | Mapbox GL JS, react-map-gl |
| 3D Visualization | 3Dmol.js, Molstar |
| Charts | Recharts |
| AI (Primary) | Z.AI GLM-4.5 |
| AI (Fallback) | Flock.io Qwen3-30B |
| Backend | FastAPI on Railway |
| Scraper | Cloudflare Workers + Tunnel |
| Deployment | Vercel |

## API Endpoints

### Bio API (Railway)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/threat-feed` | Aggregated threat intelligence feed |
| GET | `/api/candidates` | Pipeline-generated drug candidates |
| GET | `/api/heatmap` | Cross-variant interaction matrix |
| GET | `/api/biosecurity` | Biosecurity screening results |
| GET | `/api/pdb/:id` | Raw PDB text for 3D viewer |
| POST | `/api/run-pipeline` | Start computational pipeline |
| GET | `/api/pipeline-status/:id` | Poll pipeline job status |
| POST | `/api/chat` | AI chat (server-side) |
| GET | `/api/protein/list` | Available protein catalog |
| POST | `/api/protein/bundle` | Fetch + analyze protein from RCSB |
| GET | `/api/protein/bundle/:id/pdb` | Download bundled PDB text |

### Scraper API (Cloudflare)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/report` | Latest intelligence report |
| GET | `/api/threats` | Current threat list |
| POST | `/api/search` | Search threat data |
| POST | `/api/scrape` | Trigger manual scrape |
| GET | `/api/health` | Health check |

## Pipeline Execution Flow

```
                    +-----------+
                    | epitope   |     +-----------+
                    | detection +---->| generate  |
                    +-----------+     | binders   |
                                      +-----+-----+
                    +-----------+           |
                    | SASA      |     +-----v-----+     +-----------+
                    | analysis  |     | validation +---->| complete  |
                    +-----------+     +-----+-----+     | (partial  |
                                            |           |  or full) |
                                      +-----v-----+     +-----------+
                                      | biosecurity|
                                      | screening  |
                                      +-----------+

  Steps run sequentially. On failure, the step is marked failed
  and downstream dependencies are skipped. The job completes
  with partial results rather than failing entirely.
```
