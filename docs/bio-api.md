# BioSentinel API

FastAPI backend for BioSentinel/OpenClaw. It serves cached artifacts, runs pipeline jobs, integrates chat via Z.AI, and provides generic Amina tool execution.

Current app metadata in code:

- title: `BioSentinel API`
- version: `1.1.0`

## What this API does

- serves threat feed, candidate manifests, heatmaps, and biosecurity results from local cache
- runs async pipeline jobs in `mock` or `real` mode
- optionally dispatches pipeline compute to a remote VPS worker
- exposes generic `amina` tool execution endpoints (`/api/amina/*`)
- provides a chat endpoint backed by Z.AI (`/api/chat`)

## Quick start

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
./start_api.sh
```

Defaults:

- base URL: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

`start_api.sh` loads `.env`, resolves defaults, and runs `uvicorn api:app --reload`.

## Configuration

Important environment variables:

- `ZAI_API_KEY`: enables `POST /api/chat`
- `ZAI_API_URL`: defaults to `https://api.z.ai/api/paas/v4/chat/completions`
- `ZAI_MODEL`: defaults to `glm-4-plus`
- `ZAI_TIMEOUT_SECONDS`, `ZAI_MAX_TOKENS`, `ZAI_TEMPERATURE`, `ZAI_SYSTEM_PROMPT`
- `SCRAPER_API_URL`: scraper/VPS base URL
- `SCRAPER_API_KEY` or `SCRAPER_CONFIG_API_KEY`: auth for protected scraper endpoints
- `SCRAPER_SYNC_ENABLED`: enable background sync loop (default `true`)
- `SCRAPER_SYNC_INTERVAL_SECONDS`: default `300`
- `VPS_COMPUTE_ENABLED`: set `true` to use remote dispatch path in real pipeline
- `VPS_COMPUTE_POLL_INTERVAL`: default `10`
- `VPS_COMPUTE_TIMEOUT`: default `1800`
- `ALLOW_EMPTY_CACHE`: if `true`, missing cache files return empty payloads instead of `404`
- `PIPELINE_PYTHON_BIN`: python interpreter for pipeline scripts
- `PDB_INPUT_DIR`: defaults to `strains/`
- `TARGET_PDB`: defaults to `6VMZ.pdb`
- `API_LOG_FILE`: defaults to `api.log`

File/directory defaults are managed in `start_api.sh` and `api.py` (under `cached/` by default).

## Endpoint reference

- `GET /api/health`: basic liveness
- `GET /api/health/dns`: DNS/connectivity diagnostics
- `GET /api/health/deps`: dependency and key diagnostics (`amina`, `mafft`, `clustalo`, `zai_api_key_set`)
- `POST /api/chat`: chat completion via Z.AI
- `GET /api/threat-feed`: threat feed JSON
- `GET /api/candidates`: candidate manifest JSON
- `GET /api/heatmap`: cross-variant matrix JSON
- `GET /api/biosecurity`: biosecurity report JSON
- `GET /api/pdb/{filename}`: serves PDB from candidate dir, fallback to `strains/`
- `GET /api/config/scraper-url`: active scraper URL
- `POST /api/config/scraper-url`: set/persist scraper URL (requires `X-API-Key`)
- `POST /api/sync-scraper`: sync threat/feed artifacts from scraper (requires `X-API-Key`)
- `POST /api/run-pipeline`: start pipeline job
- `GET /api/pipeline-status/{job_id}`: fetch status (`?live=true` attempts VPS status refresh)
- `POST /api/compute/callback`: VPS callback endpoint (internal integration)
- `GET /api/amina/tools`: list allowed tools
- `POST /api/amina/run`: run one or many Amina tool tasks
- `GET /api/amina/result/{job_id}`: fetch result manifest/status
- `GET /api/amina/result/{job_id}/files/{step_name}/{filename}`: download step output file

## Common request examples

### Chat

```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Summarize current high-risk threats",
    "context": {"region": "global"}
  }'
```

### Configure scraper URL

```bash
curl -s -X POST http://localhost:8000/api/config/scraper-url \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $SCRAPER_API_KEY" \
  -d '{"url":"https://your-scraper.example.com"}'
```

### Start pipeline

```bash
curl -s -X POST http://localhost:8000/api/run-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "real",
    "run_epitope": true,
    "run_generation": true,
    "run_validation": true,
    "run_biosecurity": true,
    "num_candidates": 4,
    "generation_workers": 1,
    "validation_workers": 1,
    "biosecurity_workers": 1,
    "target_pdb": "6VMZ.pdb",
    "variants": ["strains/4MHI.pdb", "strains/4KTH.pdb"]
  }'
```

```bash
curl -s "http://localhost:8000/api/pipeline-status/<job_id>?live=true"
```

Pipeline status values:

- `running`
- `complete`
- `failed`
- `cancelled`

### Run a single Amina tool task

```bash
curl -s -X POST http://localhost:8000/api/amina/run \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "pdb-to-fasta",
    "args": {"input": "strains/6VMZ.pdb"}
  }'
```

## Pipeline behavior

`POST /api/run-pipeline` supports:

- `mode`: `real` or `mock`
- step toggles: `run_epitope`, `run_generation`, `run_validation`, `run_biosecurity`
- tuning: `num_candidates`, `generation_workers`, `validation_workers`, `biosecurity_workers`
- inputs: `target_pdb`, `variants`

`mock` mode synthesizes candidates/heatmap/biosecurity/threat-feed artifacts for UI/testing.

`real` mode:

- local path runs pipeline scripts directly using `PIPELINE_PYTHON_BIN`
- remote path is enabled only when scraper URL exists and `VPS_COMPUTE_ENABLED=true`

## Z.AI and Flock.io usage details

### Z.AI usage in this API

Z.AI is actively used by this FastAPI server:

- route: `POST /api/chat`
- implementation: `api.py -> call_zai(...)`
- default endpoint: `https://api.z.ai/api/paas/v4/chat/completions`
- auth: `Authorization: Bearer <ZAI_API_KEY>`
- payload includes:
  - `model` (`ZAI_MODEL`)
  - `messages` with system prompt + user prompt + JSON context
  - `temperature` (`ZAI_TEMPERATURE`)
  - `max_tokens` (`ZAI_MAX_TOKENS`)

Error handling maps upstream/network conditions to API errors (including timeout, auth failure, 429, invalid JSON, and missing assistant content).

Status mapping behavior in `POST /api/chat`:

- empty `message` -> `400`
- missing `ZAI_API_KEY` -> `500`
- Z.AI timeout -> `504`
- Z.AI auth/network/upstream issues -> `502` or propagated `429`
- successful Z.AI response -> `200` with `{"response": "..."}`

Health visibility:

- `GET /api/health/deps` returns `zai_api_key_set`

### Flock.io usage in this repo

Flock is present in the repository, but not directly called by FastAPI routes in `api.py`.

Where Flock appears:

- `flock_scorer.py`: calls `https://api.flock.io/v1/chat/completions` to classify threat severity (`LOW|MEDIUM|HIGH|CRITICAL`)
- `biosentinel.py --flock-scoring`: optional feed enrichment pipeline using `flock_scorer.py`
- `.env.example`: defines `FLOCK_API_KEY`, `FLOCK_API_BASE`, `FLOCK_MODEL`, `FLOCK_SCORE_CACHE`
- `scraper_client.py`: populates `flock_severity` field in threat objects (currently mirrored from severity in transformed scraper output)

Example of direct Flock scoring script usage (outside FastAPI routes):

```bash
python biosentinel.py \
  --input-json cached/biosentinel_latest.json \
  --output-json cached/biosentinel_latest.json \
  --flock-scoring
```

Pipeline scripts and legacy/deprecated Flock flags:

- `generate_binders.py` and `validate_cross_variant.py` still expose `--use-flock`/`--flock-*` flags for compatibility
- comments/logging in those scripts mark this path as deprecated and indicate local backend execution

If you only run `api.py` endpoints, you need Z.AI for chat but you do not need Flock credentials unless you separately run the feed enrichment scripts.

## Runtime artifacts

Typical outputs under `cached/`:

- `biosentinel_latest.json`
- `candidates/candidates_manifest.json`
- `validation/cross_variant_matrix.json`
- `biosecurity_report.json`
- `pipeline_status.json`
- `pipeline_runs/<job_id>/...` (logs and per-run files)

## Production notes

- remove `--reload` for production
- use a process manager and multiple workers if needed
- protect internal callback/sync/config endpoints at network and gateway level
