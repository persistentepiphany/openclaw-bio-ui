<div align="center">

```
██████╗ ██╗ ██████╗ ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗
██╔══██╗██║██╔═══██╗██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║
██████╔╝██║██║   ██║███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║
██╔══██╗██║██║   ██║╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║
██████╔╝██║╚██████╔╝███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗
╚═════╝ ╚═╝ ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝
```

**Real-time pandemic intelligence. Autonomous binder design. Biosecurity at every step.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-openclawui--gilt.vercel.app-30d158?style=for-the-badge&logo=vercel&logoColor=white)](https://openclawui-gilt.vercel.app)
[![Built at Imperial](https://img.shields.io/badge/Built%20at-Imperial%20College%20London-003E74?style=for-the-badge)](https://www.imperial.ac.uk)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.1.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Powered by Flock.io](https://img.shields.io/badge/AI-Flock.io%20%2B%20Z.ai-ff6b35?style=for-the-badge)](https://flock.io)
[![Telegram Bot](https://img.shields.io/badge/Telegram-@biosentinelbot-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/biosentinelbot)
[![Discord](https://img.shields.io/badge/Discord-BioSentinel%20Bot%236755-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com)

</div>

---
**SGD Statement**
BioSentinel directly addresses SDG 3 (Good Health and Well-Being) as its core mission continuous surveillance of WHO, CDC, CIDRAP, and ECDC feeds for emerging infectious disease signals, automated threat assessment, and accelerated therapeutic candidate generation directly contributes to pandemic preparedness and the goal of reducing mortality from epidemic and pandemic disease (Target 3.3 and 3.d). It also speaks to SDG 9 (Industry, Innovation and Infrastructure) by demonstrating that cutting-edge computational biology tools RFdiffusion, ProteinMPNN, Boltz-2, Foldseek can be integrated into a fully automated, accessible platform using free-tier LLM providers (Flock.io, Z.ai), lowering the infrastructure barrier for therapeutic design in under-resourced settings. SDG 17 (Partnerships for Goals) is relevant through the platform's architecture: it aggregates and acts on data from ten global public health institutions simultaneously, operationalising multi-stakeholder health intelligence in a single system. Finally, the mandatory biosecurity screening layer Foldseek TM-align against a curated toxin database on every candidate, with no bypass path directly engages SDG 16 (Peace, Justice and Strong Institutions) by embedding dual-use oversight into the design workflow itself rather than treating it as an optional post-hoc review, a concrete technical contribution to responsible science governance.

BioSentinel is an end-to-end biosurveillance and therapeutic design platform. It ingests live threat intelligence from ten global health data sources, applies LLM-powered analysis to rank and contextualize outbreaks, identifies structural protein targets, designs therapeutic binder candidates *de novo* using RFdiffusion + ProteinMPNN, validates them across pathogen variants using Boltz-2 structure prediction, and screens every candidate for biosecurity risk — all orchestrated through a single analyst-facing dashboard.

The system runs continuously. Scraping, filtering, and assessment happen in the background without human intervention. When a new outbreak signal meets the confidence threshold, the threat feed updates, new protein targets are surfaced, and the dashboard prompts the analyst to act. From first alert to candidate PDB in minutes.

### Documentation

| Document | Description |
|----------|-------------|
| [Bio API Reference](docs/bio-api.md) | FastAPI backend — pipeline, candidates, AminaAnalytica, Z.AI chat, PDB serving |
| [Intelligence Scraper Reference](docs/scraper.md) | VPS scraper — data sources, LLM pipeline, Flock.io + Z.ai, Telegram bot, deployment |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│    ANALYST                                                                      │
│      │                                                                          │
│      ▼                                                                          │
│  ┌──────────────────────────────────────────────────────────┐                  │
│  │  React Dashboard (Vercel CDN)                            │                  │
│  │                                                          │                  │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │                  │
│  │  │  Threat    │  │  Intelligence│  │  Molecule       │  │                  │
│  │  │  Feed      │  │  Map (Globe) │  │  Viewer         │  │                  │
│  │  │            │  │  Mapbox GL   │  │  3Dmol + Molstar│  │                  │
│  │  └────────────┘  └──────────────┘  └─────────────────┘  │                  │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │                  │
│  │  │  Candidate │  │  Cross-      │  │  AI Chat        │  │                  │
│  │  │  Table     │  │  Variant     │  │  (Z.ai GLM)     │  │                  │
│  │  │            │  │  Heatmap     │  │  7 live tools   │  │                  │
│  │  └────────────┘  └──────────────┘  └─────────────────┘  │                  │
│  └──────────────────────────────────────────────────────────┘                  │
│           │                          │                                          │
│           │ REST                     │ REST                                     │
│           ▼                          ▼                                          │
│  ┌────────────────────┐   ┌──────────────────────────┐                         │
│  │  Bio API           │   │  Intelligence Scraper     │                         │
│  │  (Railway)         │   │  (VPS + Cloudflare Tunnel)│                         │
│  │                    │   │                           │                         │
│  │  Pipeline runner   │   │  10 live data sources     │                         │
│  │  Candidate store   │   │  Flock.io + Z.ai LLMs     │                         │
│  │  PDB bundle fetch  │   │  Threat assessment        │                         │
│  │  AminaAnalytica    │   │  Telegram bot             │                         │
│  │  Z.ai chat proxy   │   │  Background sync          │                         │
│  └────────┬───────────┘   └──────────────────────────┘                         │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────────────────────────────────────────┐                       │
│  │  Compute Layer                                       │                       │
│  │                                                      │                       │
│  │   RFdiffusion      ProteinMPNN      Boltz-2          │                       │
│  │   (backbone gen)   (seq design)     (validation)     │                       │
│  │                                                      │                       │
│  │   BioPython        Shrake-Rupley    Foldseek          │                       │
│  │   (epitope)        (SASA)           (biosecurity)     │                       │
│  └─────────────────────────────────────────────────────┘                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Intelligence Pipeline

Every scrape cycle processes raw entries through five sequential stages before they appear in the dashboard. The pipeline is fully automated, resilient to partial failure, and produces structured JSON at each stage.

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                                                                          │
  │  Stage 1 · SCRAPE                                                        │
  │  ─────────────────                                                       │
  │  10 sources polled simultaneously: WHO DON · CDC HAN · CIDRAP ×2 ·      │
  │  ECDC · Google News ×4 · X/Twitter API v2                                │
  │  ~200-400 raw entries per run · 2s polite delay per source               │
  │                                          │                               │
  │                                          ▼                               │
  │  Stage 2 · FILTER                                                        │
  │  ─────────────────                                                       │
  │  Pass 1: Heuristic (keyword density, domain authority, path exclusions)  │
  │  Pass 2: Flock.io LLM batch classification — relevant vs irrelevant      │
  │          Fallback: Z.ai when Flock.io is unavailable                     │
  │          Result: 40-80 high-signal entries retained                      │
  │                                          │                               │
  │                                          ▼                               │
  │  Stage 3 · ASSESS                                                        │
  │  ──────────────────                                                      │
  │  Rule-based threat scorer (no LLM — optimised for speed and cost)        │
  │  Scores on: source authority · keyword density · recency ·               │
  │             pathogen match · geographic spread                            │
  │  Groups entries into pathogen clusters · assigns confidence 0-100        │
  │                                          │                               │
  │                                          ▼                               │
  │  Stage 4 · REPORT                                                        │
  │  ─────────────────                                                       │
  │  Joins entries + assessments + geocoding → unified JSON + CSV            │
  │  Picks top_pathogen, overall_severity, threats_detected                  │
  │  Feeds dashboard threat-feed, biosecurity map, heatmap                   │
  │                                          │                               │
  │                                          ▼                               │
  │  Stage 5 · SYSTEMATISE                                                   │
  │  ──────────────────────                                                  │
  │  Flock.io (primary) / Z.ai (fallback) extracts structured events:        │
  │  → normalised pathogen name · canonical location · case counts ·         │
  │    death toll · severity level · source citations                        │
  │  Output: machine-readable event objects for API consumers                │
  │                                                                          │
  └──────────────────────────────────────────────────────────────────────────┘
```

Full pipeline runtime: **~40s scrape · 2–4 min complete pipeline** depending on LLM response times.

---

## AI Provider Stack

BioSentinel uses three distinct AI systems, each chosen for a specific role. No OpenAI or Anthropic keys are required anywhere in the stack.

---

### ⚡ Flock.io — Primary Reasoning Engine

```
  Provider   :  Flock.io
  Model      :  deepseek-v3.2 (DeepSeek V3.2 · 131K context)
  Fallbacks  :  qwen3-235b-a22b-thinking-2507 · kimi-k2.5
  Auth       :  x-litellm-api-key header (LiteLLM routing)
  Config     :  VITE_FLOCK_API_KEY / FLOCK_API_KEY
```

Flock.io is the workhorse of the intelligence pipeline. Its primary function is **batch classification** — given a set of scraped entries, it decides within a single API call which ones are relevant disease surveillance signals and which are noise (lifestyle content, administrative notices, false positives). At 131K context, the entire batch can be sent in one shot.

It is also invoked by the systematiser to extract structured outbreak events from narrative text: normalised pathogen names, geocoded locations, confirmed case counts, death tolls, and WHO/CDC severity classifications.

**Why Flock.io as primary:** Lowest latency across workloads, strong structured JSON output from DeepSeek V3.2, and excellent classification performance on public health text. The fallback chain (`qwen3-235b → kimi-k2.5`) provides additional resilience within the provider before failing over to Z.ai.

**Frontend usage (`src/api/flock.js`):** When Z.ai is unavailable or unconfigured, Flock.io handles chat completions and protein summaries for the dashboard. The AI chat interface seamlessly reroutes through Flock with no UX change for the analyst.

---

### 🧠 Z.ai — Chat Interface & Secondary Reasoning

```
  Provider   :  Z.ai (Zhipu AI)
  Model      :  glm-4.7-flash (GLM-4.7 Flash · 204K context)
  Fallbacks  :  glm-5 · glm-4.7 · glm-4.7-flashx
  Auth       :  Authorization: Bearer header
  Config     :  VITE_Z_AI_API_KEY / ZAI_API_KEY
```

Z.ai powers two distinct surfaces:

**1. BioSentinel Chat Assistant**

The chat interface (`src/components/ChatInterface.jsx`) sends the full conversation history to Z.ai with a dynamically-injected system prompt containing live dashboard state — active candidates, recent alerts, feed summary, pipeline status, highlighted strains. The model has access to **7 tools** it can invoke to take real actions:

| Tool | Action |
|------|--------|
| `run_pipeline` | Starts the 5-stage bio pipeline with a specified protein target and candidate count |
| `targeted_scrape` | Triggers a focused scrape for a pathogen, region, or topic |
| `suggest_pipeline_target` | Analyzes current threat intel and recommends the optimal protein target |
| `search_threats` | Queries the structured threat intelligence database |
| `get_report` | Fetches the latest intelligence report from the scraper |
| `refresh_dashboard` | Pulls fresh data into all panels simultaneously |
| `get_candidate_details` | Looks up a specific drug candidate by CLW ID or index |

When the model returns `tool_calls`, `ChatInterface.jsx` executes them against the real API, feeds results back into the conversation, and re-queries the model — a tight agentic loop that lets the analyst drive the entire platform through natural language.

**2. Protein Science Summaries**

When a protein is selected in the viewer, `generateProteinSummary()` sends structural metadata (residue count, chain topology, molecular weight, organism) alongside computed analysis (SASA distribution, B-factor statistics, Ramachandran geometry) to Z.ai. The response is a structured JSON object with four sections rendered directly in the UI:

```
overview    →  Target biology and disease relevance
structure   →  Domain architecture, fold topology, key motifs
binding     →  Active/binding site residues, druggability
risks       →  Dual-use biosecurity considerations
```

**Why Z.ai as secondary:** The 204K context window (vs. Flock.io's 131K) makes it better suited for the systematiser when processing large unified reports. It is also the primary interface for real-time interactive chat given its lower inter-token latency on conversational workloads.

---

### 🔬 AminaAnalytica — Computational Tool Executor

```
  Interface  :  /api/amina/* (Bio API)
  Role       :  Generic bioinformatics tool execution
  Auth       :  X-API-Key header
```

AminaAnalytica is the Bio API's generic computational tool execution layer — a structured interface for dispatching discrete bioinformatics tasks asynchronously, polling their status, and retrieving multi-file outputs.

**Available endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/amina/tools` | GET | List all allowed tools |
| `/api/amina/run` | POST | Submit one or many tool tasks |
| `/api/amina/result/{job_id}` | GET | Fetch result manifest and status |
| `/api/amina/result/{job_id}/files/{step}/{filename}` | GET | Download step output file |

**Example — convert a strain PDB to FASTA:**

```bash
curl -X POST https://your-bio-api/api/amina/run \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "pdb-to-fasta",
    "args": {"input": "strains/6VMZ.pdb"}
  }'
```

AminaAnalytica decouples tool execution from the main pipeline loop, enabling parallel tool runs, per-step file retrieval, and clean result manifests that the frontend can consume directly. It is the interface through which the Amina agent can invoke computational tasks on demand, separate from the scheduled pipeline.

---

### The Fallback Chain

Every LLM call in the platform follows the same resilience pattern:

```python
for provider in [
    ("Flock.io", FLOCK_API_KEY, FLOCK_BASE_URL, FLOCK_MODEL),   # try first
    ("Z.ai",    ZAI_API_KEY,   ZAI_BASE_URL,   ZAI_MODEL),      # automatic fallback
]:
    try:
        return call_llm(*provider)
    except (Timeout, RateLimitError, ProviderError):
        continue   # next provider
```

If both providers fail, the pipeline continues with heuristic-only output — no hard stop. Partial results are always preferred to a failed run.

---

## Protein Visualisation

The molecule viewer supports dual rendering engines with hot-swap between them at runtime. Both engines are loaded lazily — Molstar's 6 MB bundle only initialises when the user requests high-fidelity rendering.

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │  3Dmol.js (lightweight · instant)                                   │
  │  ───────────────────────────────                                    │
  │  Modes: cartoon · surface · ball-and-stick · stick                  │
  │  Features: residue coloring · rotation · zoom · chain isolation     │
  │  Use when: rapid candidate review, live feed exploration            │
  │                                                                     │
  │  Molstar (full-featured · research-grade)                           │
  │  ─────────────────────────────────────────                          │
  │  Modes: all 3Dmol modes + electrostatic surface · quality overlays  │
  │  Features: B-factor coloring · trajectory support · label rendering │
  │  Use when: binding site analysis, publication-quality views         │
  └─────────────────────────────────────────────────────────────────────┘
```

**AI-generated structure narratives** are produced on demand for any loaded protein. Z.ai receives:
- Residue count, chain count, molecular weight
- Per-chain SASA distribution (hydrophobic / polar / charged surface fractions)
- B-factor profile (structural flexibility mapping)
- Ramachandran statistics (fold quality indicators)
- Known annotations from the pathogen-protein map

It returns four structured summary sections rendered inline in the viewer panel.

---

## Protein Targets

BioSentinel ships with a curated set of high-priority pathogen protein targets pre-bundled and immediately available for pipeline runs. Additional proteins can be fetched live from RCSB PDB at runtime via the bundle endpoint.

<table>
<tr>
<td align="center" width="25%">

**H5N1 Neuraminidase**<br>
`4NQJ` · 470 residues/chain<br>
Tetrameric surface glycoprotein<br>
Sialic acid cleavage active site<br>
*Source: H5N1 Influenza*

</td>
<td align="center" width="25%">

**SARS-CoV-2 Mpro**<br>
`6VMZ` · 306 residues<br>
Cysteine protease<br>
Catalytic dyad: His41 · Cys145<br>
*Source: SARS-CoV-2*

</td>
<td align="center" width="25%">

**Nipah G Glycoprotein**<br>
`7L1F` · Ephrin receptor binding<br>
Attachment surface protein<br>
β-propeller fold, 6-blade<br>
*Source: Nipah virus*

</td>
<td align="center" width="25%">

**Anthrax PA Domain 4**<br>
`3I6G` · Cell receptor binding<br>
Heptameric pore-forming toxin<br>
CMG2/TEM8 receptor interface<br>
*Source: B. anthracis*

</td>
</tr>
</table>

### Structure Gallery

| PDB | Target | Pathogen | Domain Architecture |
|-----|--------|----------|---------------------|
| [6VMZ](https://www.rcsb.org/structure/6VMZ) | Main Protease (Mpro) | SARS-CoV-2 | β-barrel I–II + α-helical III · catalytic dyad |
| [7BV2](https://www.rcsb.org/structure/7BV2) | Spike RBD | SARS-CoV-2 | Receptor binding domain · ACE2 interface |
| [6LU7](https://www.rcsb.org/structure/6LU7) | Mpro + N3 inhibitor | SARS-CoV-2 | Mpro in complex · drug binding pose |
| [4NQJ](https://www.rcsb.org/structure/4NQJ) | Neuraminidase | H5N1 Influenza | Tetrameric surface enzyme · sialic acid binding |
| [7L1F](https://www.rcsb.org/structure/7L1F) | G glycoprotein | Nipah virus | β-propeller · ephrin-B2/B3 receptor binding |
| [5T6N](https://www.rcsb.org/structure/5T6N) | VP40 matrix protein | Ebola virus | Octameric ring · RNA-binding interface |
| [3I6G](https://www.rcsb.org/structure/3I6G) | Protective antigen | Anthrax | Heptameric pore · domain 4 receptor contact |

Additional strains available: `4KTH`, `4KWM`, `4MHI`, `5E2Y`, `9MQ2`

---

## Protein Discovery

In live mode, BioSentinel automatically extracts protein targets from incoming scraper reports without any analyst input. The flow:

```
  Scraper report received
        │
        ▼
  Extract threat entries where threat_detected=true AND confidence ≥ 20
        │
        ▼
  Regex match pathogen names from entry titles
  H5N1 · Nipah · Ebola · SARS-CoV-2 · Mpox · Marburg · Zika · Dengue
        │
        ▼
  Map pathogen → PDB ID via pathogenProteinMap.js
        │
        ▼
  Fetch and bundle protein from RCSB PDB if not cached locally
        │
        ▼
  Protein Discovery panel surfaces suggested targets
  AI chat notified · dashboard flashes discovery indicator
```

Proteins unknown to the local cache are bundled on demand: the frontend calls `/api/protein/bundle`, the Bio API fetches the PDB from RCSB, runs structural analysis, and stores the result. The analyst can select any suggested protein as the pipeline target with a single click.

---

## Computational Pipeline

Once a protein target is selected, the five-stage computational pipeline can be triggered from the dashboard, the chat assistant, or via API. Steps are configured per-run; failed steps are skipped gracefully rather than aborting the job.

```
  ┌──────────────────┐
  │  Epitope         │  BioPython · Shrake-Rupley SASA
  │  Detection       │  → conserved antigenic surface residues
  └────────┬─────────┘  → solvent-accessible epitope map
           │
           ▼
  ┌──────────────────┐
  │  Binder          │  RFdiffusion (backbone diffusion)
  │  Generation      │  + ProteinMPNN (sequence optimisation)
  └────────┬─────────┘  → N candidate protein binder PDBs
           │
           ▼
  ┌──────────────────┐
  │  Cross-Variant   │  Boltz-2 structure prediction
  │  Validation      │  → pLDDT, PAE, iPTM per candidate per variant
  └────────┬─────────┘  → cross-variant interaction matrix (heatmap)
           │
           ▼
  ┌──────────────────┐
  │  Biosecurity     │  Foldseek TM-align
  │  Screening       │  → compare all candidates vs. curated toxin DB
  └──────────────────┘  → TM-score, e-value, risk flag per candidate
```

**Presets:**

| Preset | Stages | Use Case |
|--------|--------|----------|
| Full Pipeline | All 5 | Complete discovery-to-screen workflow |
| Standard | Epitope + SASA | Independent structural analysis |
| Quick Scan | Epitope only | Rapid surface mapping |
| Design Only | SASA + Generation + Validation | Skip epitope, use known site |
| Custom | Toggle any combination | Advanced users |

Pipeline jobs run asynchronously. The dashboard polls status every 2 seconds and renders partial results as each step completes — you can see candidates appearing in the table before the biosecurity screen is done.

---

## Biosecurity Screening

Every candidate protein designed by BioSentinel is automatically screened for biosecurity risk before being surfaced to the analyst. This is not optional and cannot be bypassed from the UI.

Screening is performed by **Foldseek** using TM-align against a curated structural database of known toxins, select agents, and dual-use biological agents. The key metric is TM-score (structural similarity, 0–1), which is structure-sequence-agnostic — a binder can share zero sequence identity with a toxin while still having a concerning structural resemblance.

```
  Per-candidate screening output:
  ─────────────────────────────────────────────────────
  best_toxin_hit   :  closest structural match in toxin database
  tm_score         :  structural similarity (threshold: 0.5)
  e_value          :  statistical significance of the alignment
  risk_flag        :  true if TM-score ≥ 0.5
  risk_level       :  LOW · MODERATE · HIGH · CRITICAL
  ─────────────────────────────────────────────────────
```

The Biosecurity Panel in the right sidebar shows per-candidate cards with risk indicators. High-risk candidates are visually flagged and a warning is added to the pipeline results overlay. The screening summary (X screened, Y flagged) is shown at a glance without needing to open the detail view.

The biosecurity screen also feeds back into the Z.ai protein summary — the `risks` section of the AI-generated narrative explicitly addresses dual-use concerns for the selected protein based on its structural class, organism of origin, and known weaponisation history.

---

## Intelligence Map

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                                                                          │
  │   3D Mapbox GL Globe                                                     │
  │   ─────────────────                                                      │
  │   Incident markers     →  colored by severity (green · amber · red)      │
  │   Threat arcs          →  connect locations sharing a pathogen           │
  │   Click to inspect     →  detail panel: pathogen, confidence, source     │
  │                                                                          │
  │   Filters              →  severity · pathogen type · time window         │
  │   Timeline brushing    →  30-day temporal range selector                 │
  │   KPI row              →  live incident counts per severity level         │
  │                                                                          │
  │   AI Threat Summary    →  Z.ai 4-bullet landscape analysis               │
  │                            generated from current visible incidents       │
  │                                                                          │
  └──────────────────────────────────────────────────────────────────────────┘
```

Incident data is geocoded from scraper reports. Each incident carries: pathogen name, location coordinates, severity, confidence score, source citation, and case/death metadata where available from the systematiser.

The AI threat summary auto-regenerates when the user changes the active filters or time window, giving a continuously-updated narrative view of the current threat landscape without the analyst needing to read individual incidents.

---

## Data Sources

The intelligence scraper monitors ten live data sources on a configurable interval:

| Source | Authority | Feed Type |
|--------|-----------|-----------|
| WHO Disease Outbreak News | Institutional | RSS (via Google News proxy) |
| CDC Health Alert Network | Institutional | RSS |
| CIDRAP Avian Influenza | Academic | RSS |
| CIDRAP Antimicrobial Resistance | Academic | RSS |
| ECDC Disease Outbreak News | Institutional | RSS |
| Google News — H5N1 | Aggregator | RSS search proxy |
| Google News — Disease Outbreaks | Aggregator | RSS search proxy |
| Google News — Avian Flu | Aggregator | RSS search proxy |
| Google News — Mpox | Aggregator | RSS search proxy |
| X / Twitter | Social signal | API v2 (filtered stream) |

Sources are polled with polite rate limiting (2s delay, custom User-Agent, robots.txt compliance). Deduplication runs on URL hash before any LLM is invoked, keeping downstream token costs minimal. High-authority sources (WHO, CDC, CIDRAP, ECDC) are weighted more heavily in the threat assessment scorer.

---

## Community & Notifications

### Telegram Bot — [@biosentinelbot](https://t.me/biosentinelbot)

The intelligence scraper includes a production-ready Telegram bot (`skills/biosentinel/telegram_bot.py`) available at **[@biosentinelbot](https://t.me/biosentinelbot)**. It delivers threat alerts directly to analysts or team channels without requiring the dashboard to be open.

The bot surfaces the same data as the threat feed — pathogen, severity, confidence score, source, and a brief summary — formatted for mobile consumption. It is registered as a separate systemd service and runs independently of the API server.

```bash
# Start the Telegram bot
cd skills/biosentinel
./start_bot.sh

# Or via systemd
sudo systemctl start biosentinel-bot
```

Configure with `TELEGRAM_BOT_TOKEN` in your environment. The bot can be targeted to specific pathogen keywords or severity thresholds, delivering only the signals that meet your operational alert criteria. Full scraper setup is documented in [docs/scraper.md](docs/scraper.md).

### Discord — BioSentinel Bot#6755

**BioSentinel Bot#6755** posts threat alerts and pipeline completion notifications to Discord. High-severity events (CRITICAL / HIGH from the Flock.io classifier) trigger immediate posts with pathogen details, geographic spread, and a direct link to the dashboard for follow-up analysis.

The bot allows teams to centralise operational awareness in their existing Discord workspace — BioSentinel events appear in a dedicated `#biosurveillance` channel alongside any other operational channels the team uses.

Both Telegram and Discord notifications are non-blocking — the core pipeline continues regardless of notification delivery status. If a webhook or bot call fails, the failure is logged and the pipeline result is still written to the cache for the dashboard to consume.

---

## Dashboard Modes

| Mode | Data Source | Backend Required | Description |
|------|-------------|------------------|-------------|
| **Demo** | Built-in mock data | No | Loads immediately with representative seed data — candidates, heatmap, threat feed, biosecurity panel all populated. Use this for onboarding or UI review. |
| **Live** | Real API endpoints | Yes | Connects to the Bio API and scraper, runs the staged initialization flow, highlights detected strains in the threat feed, and enables the Gather Intel action. |

Toggle in the header bar. Live mode runs a staged initialization sequence:

1. **Scraping** — scraper contacted, threat report fetched
2. **Strains Found** — matched pathogens highlighted in the feed with green text
3. **Ready to Run** — protein targets surfaced, pipeline button enabled

When the analyst clicks **Gather Intel**, the scraper is triggered immediately, the feed shows skeleton rows while results are incoming, and items trickle in with staggered animation as the scraper pipeline produces output.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Environment Setup

```bash
cd vite-app
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BIO_API_URL` | Yes | Railway Bio API base URL |
| `VITE_MAPBOX_TOKEN` | Yes (for map) | Mapbox GL access token |
| `VITE_SCRAPER_API_URL` | Live mode | Scraper API base URL |
| `VITE_SCRAPER_API_KEY` | Live mode | Scraper API auth key |
| `VITE_Z_AI_API_KEY` | For AI chat | Z.ai API key |
| `VITE_FLOCK_API_KEY` | For AI fallback | Flock.io API key |

> **Security note:** `VITE_`-prefixed variables are bundled into the browser at build time. For production deployments, proxy AI calls through the Railway Bio API rather than calling Z.ai or Flock.io directly from the browser.

### Install and Run

```bash
cd vite-app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dashboard loads in Demo mode instantly — no backend required.

### Build for Production

```bash
npm run build
# Output: vite-app/dist/
```

### Deploy to Vercel

```bash
vercel login
vercel link --yes
vercel --prod
```

Set environment variables via CLI:

```bash
echo "https://your-api.railway.app" | vercel env add VITE_BIO_API_URL production
```

---

## Bio API Reference

The Bio API (`version 1.1.0`) is a FastAPI server providing all computational endpoints. It manages local caches, runs pipeline jobs, proxies AI chat through Z.ai, and exposes the AminaAnalytica tool executor.

### Core Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/health/deps` | Dependency diagnostics (`amina`, `mafft`, `clustalo`, `zai_api_key_set`) |
| `POST` | `/api/chat` | AI chat via Z.ai |
| `GET` | `/api/threat-feed` | Aggregated threat feed |
| `GET` | `/api/candidates` | Candidate manifest |
| `GET` | `/api/heatmap` | Cross-variant matrix |
| `GET` | `/api/biosecurity` | Biosecurity screening results |
| `GET` | `/api/pdb/{filename}` | PDB file (candidate dir, fallback to strains/) |

### Pipeline

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/run-pipeline` | Start pipeline job |
| `GET` | `/api/pipeline-status/{job_id}` | Poll status (`?live=true` for VPS refresh) |

**Pipeline job payload:**

```bash
curl -X POST https://your-bio-api/api/run-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "real",
    "run_epitope": true,
    "run_generation": true,
    "run_validation": true,
    "run_biosecurity": true,
    "num_candidates": 4,
    "target_pdb": "6VMZ.pdb",
    "variants": ["strains/4MHI.pdb", "strains/4KTH.pdb"]
  }'
```

Pipeline status values: `running` · `complete` · `failed` · `cancelled`

### Protein

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/protein/list` | Available protein catalog |
| `POST` | `/api/protein/bundle` | Fetch + analyse protein from RCSB PDB |
| `GET` | `/api/protein/bundle/{id}/pdb` | Download bundled PDB |

### AminaAnalytica

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/amina/tools` | List allowed tools |
| `POST` | `/api/amina/run` | Submit tool task(s) |
| `GET` | `/api/amina/result/{job_id}` | Poll result + manifest |
| `GET` | `/api/amina/result/{job_id}/files/{step}/{file}` | Download step output |

### Scraper / Sync

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sync-scraper` | Sync threat artifacts from scraper (auth required) |
| `POST` | `/api/config/scraper-url` | Update active scraper URL (auth required) |
| `GET` | `/api/config/scraper-url` | Read current scraper URL |

---

## Runtime Artifacts

The Bio API writes structured outputs under `cached/` after each pipeline run:

```
cached/
├── biosentinel_latest.json          # Raw scraper output
├── candidates/
│   └── candidates_manifest.json     # Scored binder candidates + metadata
├── validation/
│   └── cross_variant_matrix.json    # Boltz-2 pLDDT/PAE cross-variant table
├── biosecurity_report.json          # Foldseek screening results
├── pipeline_status.json             # Latest job status
└── pipeline_runs/
    └── {job_id}/                    # Per-run logs and intermediate files
```

All cached files are served directly by the API without re-computation. The dashboard always reads the latest cache, so previously computed results remain available even when a new run is in progress.

---

## Project Structure

```
openclaw-bio-ui/
├── README.md
├── vercel.json
└── vite-app/
    ├── .env.example
    └── src/
        ├── App.jsx                       # Root: state, pipeline orchestration, mode switch
        ├── App.css                       # Global styles + keyframes
        ├── api/
        │   ├── client.js                 # Unified REST client (Bio API + Scraper API)
        │   ├── zai.js                    # Z.ai chat, protein summaries, threat summaries
        │   └── flock.js                  # Flock.io fallback AI client
        ├── components/
        │   ├── ActivityFeed.jsx          # Left sidebar: threat feed + Gather Intel panel
        │   ├── BiosecurityPanel.jsx      # Biosecurity screening results
        │   ├── ChatInterface.jsx         # AI chat with 7-tool agentic execution
        │   ├── DataTable.jsx             # Candidate compounds table
        │   ├── Heatmap.jsx               # Cross-variant interaction matrix
        │   ├── MoleculeViewer.jsx        # 3D protein viewer (3Dmol + Molstar)
        │   ├── PipelineConfigPanel.jsx   # Pipeline task/preset configuration
        │   ├── PipelineResultsOverlay.jsx # Post-pipeline results walkthrough
        │   ├── ProteinDiscoveryPanel.jsx  # Protein target discovery from threats
        │   ├── WorkflowStatus.jsx        # Pipeline step progress indicator
        │   ├── intelligence/             # Intelligence Map sub-components
        │   │   ├── IntelligenceMapPage.jsx
        │   │   ├── MapContainer.jsx      # Mapbox GL globe renderer
        │   │   ├── KpiRow.jsx
        │   │   ├── LeftSidebar.jsx
        │   │   └── DetailPanel.jsx
        │   └── jobs/                     # Design Tools job panel
        ├── hooks/
        │   ├── useProteinDiscovery.js    # Protein suggestion extraction from threats
        │   ├── useJobQueue.js            # Design tool job management
        │   ├── useFilteredIncidents.js   # Map incident filtering
        │   └── useMapAutoRotate.js       # Globe auto-rotation
        ├── data/
        │   ├── mockData.js               # Demo mode seed data
        │   ├── mockMapData.js            # Demo mode map incidents
        │   └── mockDesignData.js         # Design tool catalog
        └── utils/
            ├── pathogenProteinMap.js     # Threat → PDB ID mapping
            ├── proteinDataCache.js       # Protein metadata cache
            └── download.js              # File download helpers
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19, Vite 7 |
| Styling | Tailwind CSS 4, Framer Motion |
| Maps | Mapbox GL JS, react-map-gl |
| 3D visualisation | 3Dmol.js, Molstar |
| Charts | Recharts |
| AI — primary | Flock.io · DeepSeek V3.2 / Qwen3-235B |
| AI — secondary | Z.ai · GLM-4.7-flash |
| AI — tools | AminaAnalytica (Bio API) |
| Bio pipeline | RFdiffusion · ProteinMPNN · Boltz-2 · Foldseek · BioPython |
| Bio API | FastAPI 1.1.0 on Railway |
| Intelligence scraper | Python 3.10+ · ~8,200 lines · 28 modules |
| Tunnel | Cloudflare Quick Tunnel |
| CDN / hosting | Vercel |
| Notifications | Telegram Bot API · Discord Webhooks |

---

<div align="center">

Built at the **Imperial College London Hackathon**

*Threat intelligence → structural biology → therapeutic design → biosecurity screening, end to end.*

</div>
