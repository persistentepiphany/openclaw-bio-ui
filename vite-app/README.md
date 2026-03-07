# BioSentinel Dashboard

A real-time biosurveillance and drug candidate analysis dashboard built with React + Vite. BioSentinel combines threat intelligence scraping, computational biology pipelines, and AI-assisted analysis in a single interface.

## Features

- **Real-time threat feed** — aggregated biosecurity alerts from a scraper backend
- **Intelligence Map** — Mapbox-powered global incident heatmap and arc visualizations
- **Molecule Viewer** — 3D protein structure rendering via 3Dmol/Molstar
- **Pipeline runner** — 5-stage computational biology pipeline (Detect → Characterize → Design → Validate → Report)
- **Candidate table & heatmap** — cross-variant interaction matrix for drug candidates
- **AI chat assistant** — context-aware biosecurity analyst powered by Z.AI (with Flock.io fallback)
- **Protein discovery** — protein bundle fetch, structural analysis, and AI-generated science summaries

## Architecture

```
vite-app/
├── src/
│   ├── api/
│   │   ├── client.js      # Unified REST client (Bio API + Scraper API)
│   │   ├── zai.js         # Z.AI (Zhipu) LLM client — primary AI backend
│   │   └── flock.js       # Flock.io LLM client — fallback AI backend
│   ├── components/        # React UI panels
│   ├── hooks/             # Custom React hooks
│   ├── data/              # Mock/seed data
│   └── utils/             # Helpers (geocoding, protein cache, etc.)
```

### Backends

| Service | Description |
|---------|-------------|
| **Bio API** (Railway) | Computational biology endpoints — pipeline, candidates, heatmap, PDB files |
| **Scraper API** (Cloudflare tunnel) | Threat intelligence — scrape, search, reports, health |

The Scraper API URL is auto-discovered from Railway at startup and validated with a health check; it falls back to the `.env` value if discovery fails.

## AI Integration

### Z.AI (`src/api/zai.js`) — Primary

[Z.AI](https://z.ai) (Zhipu) provides the primary AI backbone using the `glm-4.5` model. It powers two features:

**1. BioSentinel Chat Assistant**

The chat interface sends full conversation history to Z.AI with a live-injected system prompt containing current dashboard state (active candidates, recent alerts, feed summary, pipeline status). The model is given 7 tool definitions it can call to take real actions on the dashboard:

| Tool | What it does |
|------|-------------|
| `run_pipeline` | Starts the 5-stage bio analysis pipeline with configurable protein target and candidate count |
| `targeted_scrape` | Triggers a focused scrape on a specific pathogen, region, or topic |
| `suggest_pipeline_target` | Analyzes current threat intel and recommends the best protein target to run |
| `search_threats` | Queries the threat intelligence database |
| `get_report` | Fetches the latest scraper intelligence report |
| `refresh_dashboard` | Pulls fresh data into all dashboard panels |
| `get_candidate_details` | Looks up a specific drug candidate by CLW ID or index |

When the model returns `tool_calls`, `ChatInterface.jsx` executes them against the real API and feeds results back into the conversation.

**2. Protein Science Summaries**

When a protein is selected in the Protein Discovery panel, `generateProteinSummary()` sends structural metadata (residues, chains, MW, organism) plus computed analysis data (SASA, B-factor, Ramachandran statistics) to Z.AI and receives a structured JSON summary with four sections: `overview`, `structure`, `binding`, and `risks`.

**Configuration:** Set `VITE_Z_AI_API_KEY` in `.env`.

---

### Flock.io (`src/api/flock.js`) — Fallback

[Flock.io](https://flock.io) provides an OpenAI-compatible fallback using the `qwen3-30b-a3b-instruct-2507` model. It uses a non-standard auth header (`x-litellm-api-key` instead of `Authorization: Bearer`) routed through LiteLLM.

Flock.io is used when Z.AI is unavailable or unconfigured — the chat interface and any protein summary generation that fails with Z.AI can route through Flock instead.

**Configuration:** Set `VITE_FLOCK_API_KEY` in `.env`.

## Setup

### Prerequisites

- Node.js 18+
- A `.env` file in `vite-app/` with the following variables:

```env
VITE_BIO_API_URL=https://your-bio-api.railway.app
VITE_SCRAPER_API_URL=https://your-scraper.trycloudflare.com
VITE_SCRAPER_API_KEY=your-scraper-key
VITE_Z_AI_API_KEY=your-zai-key
VITE_FLOCK_API_KEY=your-flock-key
VITE_MAPBOX_TOKEN=your-mapbox-token
```

> **Note:** API keys are embedded in the browser bundle via the `VITE_` prefix. For production, proxy AI calls through the Railway Bio API instead of calling Z.AI/Flock directly from the browser.

### Install & Run

```bash
cd vite-app
npm install
npm run dev
```

### Build

```bash
npm run build
```

## Dashboard Modes

| Mode | Description |
|------|-------------|
| **Demo** | Loads mock seed data — no backend required |
| **Live** | Pulls real data from Bio API and Scraper API |

Toggle between modes using the switch in the dashboard header.

## Protein Targets

Pre-configured threat-to-protein mappings used by the AI assistant:

| Threat | PDB ID | Target |
|--------|--------|--------|
| H5N1 / Influenza | 4NQJ | H5N1 Neuraminidase |
| Nipah / Henipavirus | 7L1F | Nipah G glycoprotein |
| Ebola | 5T6N | Ebola VP40 matrix protein |
| SARS-CoV-2 / COVID | 6VMZ / 7BV2 / 6LU7 | Mpro, Spike RBD |
| Anthrax | 3I6G | Anthrax protective antigen |

## Tech Stack

- **React 19** + **Vite 7**
- **Tailwind CSS 4** + **Framer Motion**
- **Mapbox GL** / **react-map-gl** — intelligence map
- **3Dmol** / **Molstar** — molecule visualization
- **Recharts** — heatmap and charts
- **Z.AI GLM-4.5** — primary AI (chat + protein summaries)
- **Flock.io Qwen3** — fallback AI
