# BioSentinel

**Real-time disease surveillance and pandemic preparedness intelligence platform.**

BioSentinel continuously monitors global health sources — WHO, CDC, CIDRAP, ECDC, Google News, and X/Twitter — to detect, assess, and report on infectious disease outbreaks. It powers a REST API, a Telegram bot, and a Railway-hosted frontend dashboard with threat feeds, intelligence maps, and heatmap visualisation.

Built at the Imperial College London hackathon. ~8,200 lines of Python across 28 modules.

---

## Architecture

```
                          ┌─────────────────────────────┐
                          │   Railway Bio API Frontend   │
                          │  (dashboard, map, heatmap)   │
                          └──────────┬──────────────────┘
                                     │ HTTPS
                          ┌──────────▼──────────────────┐
                          │   Cloudflare Quick Tunnel    │
                          │  *.trycloudflare.com:443     │
                          └──────────┬──────────────────┘
                                     │ QUIC
┌───────────────────────────────────────────────────────────────┐
│  VPS (DigitalOcean)                                           │
│                                                               │
│  ┌─────────────┐    ┌──────────────────────────────────────┐  │
│  │ cloudflared  │───▶│  FastAPI Server (api_server.py)      │  │
│  │ tunnel       │    │  localhost:8000                       │  │
│  └─────────────┘    │                                       │  │
│                      │  /api/scrape      → biosentinel.py   │  │
│                      │  /api/threats     → threat_assessor  │  │
│                      │  /api/report      → report_builder   │  │
│                      │  /api/systematic  → systematizer     │  │
│                      │  /api/biosecurity → geocoded map     │  │
│                      │  /api/heatmap     → cross-variant    │  │
│                      │  /api/compute/*   → binder pipeline  │  │
│                      └──────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Analysis Pipeline                                       │  │
│  │                                                          │  │
│  │  scrape → relevance filter → assess → report → systemat │  │
│  │           (Flock.io LLM)    (local)   (join)  (Z.ai LLM)│  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────┐  ┌───────────────┐                         │
│  │ Telegram Bot  │  │ OpenClaw Agent │                        │
│  └──────────────┘  └───────────────┘                         │
└───────────────────────────────────────────────────────────────┘
```

---

## LLM Providers: Flock.io and Z.ai

BioSentinel uses two free-tier LLM providers for all AI-powered analysis. No OpenAI or Anthropic API keys are required.

### Flock.io (primary)

- **Endpoint**: `https://api.flock.io/v1/chat/completions`
- **Model**: `deepseek-v3.2` (DeepSeek V3.2, 131K context)
- **Fallbacks**: `qwen3-235b-a22b-thinking-2507`, `kimi-k2.5`
- **Used for**: Relevance filtering (batch classification of scraped entries), threat assessment reasoning, report narrative generation
- **Why primary**: Fastest response times, highest reliability across our workloads. DeepSeek V3.2 handles structured JSON output well and is strong at classification tasks.

### Z.ai (secondary / fallback)

- **Endpoint**: `https://api.z.ai/api/coding/paas/v4/chat/completions`
- **Model**: `glm-4.7-flash` (GLM-4.7 Flash, 204K context)
- **Fallbacks**: `glm-5`, `glm-4.7`, `glm-4.7-flashx`
- **Used for**: Systematizer (structured event extraction from raw reports), fallback for relevance filtering when Flock.io is unavailable
- **Why secondary**: Larger context window (204K vs 131K) makes it better for the systematizer which processes full reports. Slightly higher latency than Flock.io.

### How the fallback chain works

Every LLM call tries Flock.io first. If the request fails (timeout, rate limit, error), it automatically retries with Z.ai. This gives the pipeline resilience — if either provider goes down, the other picks up. The relevance filter, systematizer, and threat assessor all follow this pattern:

```python
for api_key, base_url, model, name in [
    (FLOCK_API_KEY, FLOCK_BASE_URL, FLOCK_MODEL, "Flock.io"),   # try first
    (ZAI_API_KEY, ZAI_BASE_URL, ZAI_MODEL, "Z.ai"),             # fallback
]:
```

### Where LLMs are used in the pipeline

| Stage | Script | LLM Provider | Purpose |
|-------|--------|-------------|---------|
| Relevance filtering | `relevance_filter.py` | Flock.io → Z.ai | Classify uncertain entries as relevant/irrelevant for disease surveillance |
| Systematisation | `systematizer.py` | Flock.io → Z.ai | Extract structured events (pathogen, location, severity, case counts) from raw entries |
| Threat assessment | `threat_assessor.py` | Local heuristic | Score and rank threats by confidence (no LLM — rule-based for speed) |
| Report building | `report_builder.py` | None | Join data from scraper + assessor (pure data transformation) |

---

## Data Sources

| Source | Type | Confidence | Feed |
|--------|------|-----------|------|
| WHO Disease Outbreak News | RSS (via Google) | High | `news.google.com/rss/search?q=site:who.int` |
| CDC Health Alert Network | RSS | High | `www2c.cdc.gov/podcasts/createrss.asp` |
| CIDRAP Avian Influenza | RSS | High | `cidrap.umn.edu/news/49/rss` |
| CIDRAP Antimicrobial Resistance | RSS | High | `cidrap.umn.edu/news/51/rss` |
| ECDC Disease Outbreak News | RSS | High | `ecdc.europa.eu/en/rss-feeds` |
| Google News — H5N1 | RSS proxy | Medium | Aggregated news search |
| Google News — Disease Outbreaks | RSS proxy | Medium | Aggregated news search |
| Google News — Avian Flu | RSS proxy | Medium | Aggregated news search |
| Google News — Mpox | RSS proxy | Medium | Aggregated news search |
| X/Twitter Outbreak Signals | API v2 | Medium | Filtered recent tweets |

Configured in `skills/biosentinel/feeds.json`. Sources are fetched politely (2s delay, custom User-Agent, robots.txt compliance).

---

## API Reference

All endpoints except `/api/health` and `/api/config/scraper-url` (GET) require the `X-API-Key` header.

### Core endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check (no auth) |
| `POST` | `/api/scrape` | Scrape all sources, return entry count. Relevance filter runs in background. |
| `GET` | `/api/threats/latest` | Latest raw feed data |
| `POST` | `/api/threats/assess` | Run threat assessment on current data |
| `GET` | `/api/threats` | Read cached threat verdict |
| `POST` | `/api/search` | Ad-hoc search (`{"query": "H5N1", "location": "China", "days": 90}`) |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/report/build` | Build unified report from scraped data + assessments |
| `GET` | `/api/report` | Read latest report (JSON) |
| `GET` | `/api/report/csv` | Download report as CSV |
| `POST` | `/api/systematic/build` | Run LLM systematiser on unified report |
| `GET` | `/api/systematic` | Read systematised report |
| `GET` | `/api/systematic/events` | Get aggregated events only |
| `GET` | `/api/systematic/csv` | Download systematic report as CSV |

### Frontend integration (Railway Bio API)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/threat-feed` | Threats grouped by pathogen for dashboard |
| `GET` | `/api/biosecurity` | Geocoded incidents for intelligence map |
| `GET` | `/api/heatmap` | Cross-variant matrix for heatmap view |
| `POST` | `/api/full-pipeline` | Scrape + filter + assess + report + systematise (one call) |

### Compute (binder design pipeline)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/compute/submit` | Submit a binder design job |
| `GET` | `/api/compute/status/{job_id}` | Check job progress |
| `GET` | `/api/compute/result/{job_id}` | Fetch completed job results + PDB files |

### Configuration

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/config/scraper-url` | Get current tunnel URL (no auth) |
| `POST` | `/api/config/scraper-url` | Set tunnel URL (called by tunnel wrapper) |

---

## Project Structure

```
.
├── api_server.py                 # FastAPI server — all REST endpoints
├── tunnel_wrapper.sh             # Cloudflare tunnel launcher + URL auto-push
├── relevance_filter.py           # Two-pass entry filter (heuristic + LLM)
├── report_builder.py             # Joins scraper data with assessments
├── systematizer.py               # LLM event extraction and normalisation
├── threat_assessor.py            # Rule-based threat scoring
├── trigger_bio_pipeline.py       # Conditional pipeline trigger with cooldown
├── trigger_pipeline.py           # Lightweight pipeline trigger
├── scripts/
│   └── update_biosentinel.sh     # Pull-and-restart deployment script
├── skills/
│   └── biosentinel/
│       ├── biosentinel.py        # Multi-source scraper (1,262 lines)
│       ├── feeds.json            # Source configuration
│       ├── telegram_bot.py       # Telegram bot interface
│       ├── demo_data.json        # Fallback data when feeds are down
│       ├── tests/
│       │   └── test_biosentinel.py
│       └── ...
│   ├── nutrigenomics/            # Nutrigenomics reporting skill
│   └── pharmgx-reporter/        # Pharmacogenomics reporting skill
├── test_*.py                     # Integration tests
└── *.md                          # Documentation and agent config
```

---

## Setup

### Requirements

- Python 3.10+
- A VPS or server with outbound HTTPS access

### Install

```bash
pip install fastapi uvicorn feedparser requests httpx
```

### Environment variables

```bash
export FLOCK_API_KEY='your-flock-api-key'        # Required — get from flock.io
export ZAI_API_KEY='your-zai-api-key'            # Required — get from z.ai
export TELEGRAM_BOT_TOKEN='your-bot-token'       # Optional — for Telegram bot
export TWITTER_BEARER_TOKEN='your-bearer-token'  # Optional — for X/Twitter source
export DEEPSEEK_API_KEY='your-deepseek-key'      # Optional — direct DeepSeek access
```

See `skills/biosentinel/.env.example` for the full list.

### Run

```bash
# Start the API server
python3 api_server.py

# In another terminal — start the Cloudflare tunnel
./tunnel_wrapper.sh
```

Or use the systemd services:

```bash
sudo systemctl start biosentinel-api
sudo systemctl start biosentinel-tunnel
```

### Telegram bot

```bash
cd skills/biosentinel
./start_bot.sh
```

---

## Pipeline Flow

A full pipeline run (`POST /api/full-pipeline`) executes these steps in order:

1. **Scrape** — Fetch all 10 sources, deduplicate, output `biosentinel_latest.json`
2. **Filter** — Heuristic pass removes obvious junk (WHO admin pages, lifestyle articles). In standalone scrape mode, LLM batch classification runs in the background via Flock.io.
3. **Assess** — Score each entry by source authority, keyword density, recency, and pathogen match. Group into threat clusters by pathogen.
4. **Report** — Join entries with assessments, add geocoding, generate unified JSON + CSV.
5. **Systematise** — LLM extracts structured events: normalised pathogen names, locations, case/death counts, severity levels. Outputs systematic JSON + CSV.

The scrape endpoint returns in ~40 seconds. The full pipeline takes 2–4 minutes depending on LLM response times.

---

## Deployment

The production setup runs on a DigitalOcean VPS with two systemd services:

- `biosentinel-api.service` — FastAPI server on port 8000
- `biosentinel-tunnel.service` — Cloudflare quick tunnel exposing port 8000

The tunnel wrapper (`tunnel_wrapper.sh`) captures the assigned `*.trycloudflare.com` URL on each start and pushes it to:
1. The local API (`/api/config/scraper-url`)
2. The Railway Bio API frontend, so it can discover the current scraper URL
