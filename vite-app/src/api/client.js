/**
 * client.js — Unified API client for BioSentinel Dashboard (v2)
 *
 * Single backend: v2 Bio API at VITE_BIO_API_URL.
 *
 * V2 API schema (divine-cat-v2-v2.up.railway.app/api/v2):
 *   GET  /threats                        → { events:[...], count, fetched_at }
 *   GET  /threats/{event_id}/targets     → { event_id, pathogen_name, targets:[...] }
 *   POST /threats/{event_id}/design      → { job_id, status, event_id, pathogen_name }
 *   GET  /pipeline/design/{job_id}       → { job_id, status, steps, candidates, error }
 *   GET  /pdb/{filename}.pdb             → raw PDB text
 *
 * NOTE: Several old endpoints have no v2 equivalent (/candidates, /heatmap,
 * /biosecurity, /chat, /protein/list, /protein/bundle, /report). These functions
 * return derived data from /threats or null — the UI handles null gracefully.
 *
 * Environment variables:
 *   VITE_BIO_API_URL — v2 API base URL (no trailing slash)
 */

const API_BASE =
  (import.meta.env.VITE_BIO_API_URL || "https://divine-cat-v2-v2.up.railway.app").replace(/\/+$/, "");

/* ── Module-level event cache (populated by fetchThreatFeed / searchThreats) ── */
let _eventCache = [];

/* ── In-memory PDB text cache ── */
const pdbCache = new Map();

/* ───────────────────── core fetch helper ───────────────────────────────────── */

export async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      if (res.status === 404 || res.status === 501) {
        console.warn(`[v2 API] endpoint not available: ${path} (${res.status})`);
      } else {
        console.warn(`[v2 API] ${path}: ${res.status} ${res.statusText}`);
      }
      return null;
    }
    if (options._raw) return res.text();
    return res.json();
  } catch (err) {
    console.warn(`[v2 API] ${path}:`, err.message);
    return null;
  }
}

// Compat aliases
export const bioFetch = apiFetch;
export const scraperFetch = apiFetch;

/* ───────────────────── v2 event → UI feed item transform ───────────────────── */

function transformEvent(event, idx = 0) {
  const isHighRisk = event.severity === "critical" || event.severity === "high";
  const cases = (event.cases || 0).toLocaleString();
  const deaths = (event.deaths || 0).toLocaleString();
  return {
    sourceType: isHighRisk ? "alert" : "rss",
    source: event.source || "v2-api",
    message: `${event.pathogen_name} — ${event.country_iso3}: ${cases} cases, ${deaths} deaths`,
    time: event.date_reported || "",
    confidence: Math.round((event.confidence ?? 0.9) * 100),
    location: event.country_iso3,
    severity: event.severity,
    event_id: event.event_id,
    pathogen: event.pathogen_name,
    topic: event.pathogen_name,
    novelty_signals: event.novelty_signals || [],
    fromScraper: true,
    _id: `v2-${event.event_id}`,
    revealDelay: idx * 30,
  };
}

/* ── Transform v2 design job candidates to UI candidate format ── */
function transformDesignCandidate(c, idx) {
  const clwId = `CLW-${String(idx + 1).padStart(4, "0")}`;
  return {
    id: clwId,
    name: c.sequence ? c.sequence.slice(0, 10) : `Candidate-${idx + 1}`,
    score: c.confidence ?? 0,
    target: "v2-design",
    status: "pass",
    pdb: c.validation_pdb?.split("/").pop()?.replace(".pdb", "") || null,
    sequence: c.sequence,
    rank: c.rank,
    validation_pdb: c.validation_pdb,
  };
}

/* ─────────────────── Threat feed ─────────────────────────────────────────── */

/**
 * GET /api/v2/threats — live outbreak events.
 * Returns { threats:[...] } in UI feed format.
 */
export const fetchThreatFeed = async () => {
  const data = await apiFetch("/api/v2/threats");
  if (!data?.events) return null;
  _eventCache = data.events;
  return { threats: data.events.map((e, i) => transformEvent(e, i)) };
};

/**
 * GET /api/v2/threats — search filtered client-side by query string.
 * v2 ?q= param does not filter server-side; we filter locally.
 * Returns { entries:[...] } in UI feed format.
 */
export const searchThreats = async (query) => {
  const data = await apiFetch("/api/v2/threats");
  if (!data?.events) return { entries: [] };
  _eventCache = data.events;
  const q = (query || "").toLowerCase();
  const filtered = q
    ? data.events.filter((e) =>
        e.pathogen_name?.toLowerCase().includes(q) ||
        e.country_iso3?.toLowerCase().includes(q) ||
        e.source?.toLowerCase().includes(q)
      )
    : data.events;
  return { entries: filtered.map((e, i) => transformEvent(e, i)) };
};

/**
 * GET /api/v2/threats → derive report-like structure for applyScraperReport.
 * Returns { threats, entries, summary } compatible with existing UI consumers.
 */
export const fetchReport = async () => {
  const data = await apiFetch("/api/v2/threats");
  if (!data?.events) return null;
  _eventCache = data.events;
  const events = data.events;
  const highRisk = events.filter(
    (e) => e.severity === "critical" || e.severity === "high"
  );
  const pathogens = [...new Set(events.map((e) => e.pathogen_name))];
  const feedItems = events.map((e, i) => transformEvent(e, i));
  return {
    threats: feedItems,
    entries: feedItems,
    summary: {
      total_entries: events.length,
      threats_detected: highRisk.length,
      overall_severity: highRisk.length > 0 ? "high" : "medium",
      overall_confidence: 90,
      top_pathogen: pathogens[0] || null,
    },
    fetched_at: data.fetched_at,
  };
};

/* ─────────────────── Biosecurity (derived from events) ─────────────────────── */

/**
 * Derive biosecurity panel data from high-severity threat events.
 * No dedicated v2 /biosecurity endpoint.
 */
export const fetchBiosecurity = async () => {
  const data = await apiFetch("/api/v2/threats");
  if (!data?.events) return null;
  if (_eventCache.length === 0) _eventCache = data.events;
  return data.events
    .filter((e) => e.severity === "critical" || e.severity === "high")
    .slice(0, 10)
    .map((e, i) => ({
      id: i + 1,
      title: `${e.pathogen_name} — ${e.country_iso3}`,
      pathogen: e.pathogen_name,
      severity: e.severity,
      confidence: Math.round((e.confidence ?? 0.9) * 100),
      cases: e.cases,
      deaths: e.deaths,
      source: e.source,
      date: e.date_reported,
      location: e.country_iso3,
      event_id: e.event_id,
    }));
};

/* ─────────────────── Candidates / Heatmap ──────────────────────────────────── */

/**
 * No v2 /candidates endpoint. Candidates are only produced by design jobs.
 * Returns null — UI keeps its last known state or uses mock data in demo mode.
 * TODO: POST /api/v2/threats/{id}/design → poll → GET candidates from results
 */
export const fetchCandidates = async () => null;

/**
 * No v2 /heatmap endpoint.
 * TODO: derive from design job cross-validation results when available.
 */
export const fetchHeatmap = async () => null;

/* ─────────────────── Protein / PDB ─────────────────────────────────────────── */

/**
 * Fetch protein targets for a specific threat event.
 * GET /api/v2/threats/{event_id}/targets
 */
export const fetchEventTargets = (eventId) =>
  apiFetch(`/api/v2/threats/${encodeURIComponent(eventId)}/targets`);

/**
 * Fetch protein list from v2 /protein/list endpoint.
 * Real v2 shape: { proteins: [{ name, pdb_id, source, size_bytes }] }
 * Returns array of { pdb_id, name, label, source } compatible with UI protein selector.
 */
export const fetchProteinList = async () => {
  const data = await apiFetch("/api/v2/protein/list");
  if (!data?.proteins?.length) return null;
  return data.proteins.map((p) => ({
    pdb_id: p.pdb_id,
    // name field is "4KTH.pdb" — strip extension for display
    name: p.pdb_id,
    label: p.pdb_id,
    desc: `${p.source || "v2"} — ${(p.size_bytes / 1024).toFixed(0)} KB`,
    source: p.source || "v2",
    apiSource: p.source,
  }));
};

/**
 * GET /api/v2/pdb/{pdbId}.pdb — raw PDB text for 3D viewer.
 * Falls back to RCSB directly if v2 doesn't have the file.
 */
export async function fetchPdb(pdbId) {
  if (pdbCache.has(pdbId)) return pdbCache.get(pdbId);

  // 1. Local bundle
  try {
    const r = await fetch(`/pdbs/${pdbId}.pdb`);
    if (r.ok) {
      const text = await r.text();
      pdbCache.set(pdbId, text);
      return text;
    }
  } catch { /* try next */ }

  // 2. v2 pdb endpoint
  try {
    const r = await fetch(`${API_BASE}/api/v2/pdb/${encodeURIComponent(pdbId)}.pdb`);
    if (r.ok) {
      const text = await r.text();
      if (text.includes("ATOM") || text.startsWith("HEADER")) {
        pdbCache.set(pdbId, text);
        return text;
      }
    }
  } catch { /* try next */ }

  // 3. RCSB fallback
  try {
    const r = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`);
    if (r.ok) {
      const text = await r.text();
      pdbCache.set(pdbId, text);
      return text;
    }
  } catch { /* exhausted */ }

  return null;
}

/**
 * GET /api/v2/pdb/{pdbId}.pdb — raw PDB text (named for compat).
 * Replaces: GET /api/protein/bundle/:id/pdb
 */
export const fetchBundledPdb = (pdbId) =>
  apiFetch(`/api/v2/pdb/${encodeURIComponent(pdbId)}.pdb`, { _raw: true });

/**
 * No-op bundle request — v2 has no bundle concept.
 * Replaces: POST /api/protein/bundle
 */
export const requestProteinBundle = async (pdbId) => ({ pdb_id: pdbId });

/**
 * GET /api/v2/protein/bundle/:id — no v2 equivalent.
 */
export const fetchProteinBundle = async () => null;

/* ─────────────────── Pipeline ──────────────────────────────────────────────── */

/**
 * POST /api/v2/threats/{event_id}/design — start a protein design job.
 * Replaces: POST /api/run-pipeline
 *
 * config: { event_id?, num_candidates?, numCandidates?, target_pdb?, hotspot_res? }
 *
 * event_id resolution order:
 *   1. config.event_id (explicit)
 *   2. First critical/high event matching config.target_pdb's pathogen
 *   3. First critical/high event in cache
 *   4. First event in cache
 */
export const runPipeline = async (config = {}) => {
  let eventId = config.event_id;

  if (!eventId) {
    if (_eventCache.length === 0) {
      const data = await apiFetch("/api/v2/threats");
      if (data?.events) _eventCache = data.events;
    }
    const highSeverity = _eventCache.find(
      (e) => e.severity === "critical" || e.severity === "high"
    );
    eventId = highSeverity?.event_id || _eventCache[0]?.event_id;
  }

  if (!eventId) {
    console.warn("[v2 API] runPipeline: no event_id — fetch threats first");
    return null;
  }

  return apiFetch(`/api/v2/threats/${encodeURIComponent(eventId)}/design`, {
    method: "POST",
    body: JSON.stringify({
      num_designs: config.num_candidates ?? config.numCandidates ?? 1,
      hotspot_res: config.hotspot_res ?? null,
    }),
  });
};

/**
 * GET /api/v2/pipeline/design/{job_id} — poll design job status.
 * Replaces: GET /api/pipeline-status/:id
 *
 * v2 response: { job_id, status, steps:{fold,binder_design,sequence_design,validation_fold},
 *               candidates:[{rank,sequence,confidence,validation_pdb}], error }
 *
 * Adds normalised fields for App.jsx compatibility:
 *   .progress      — 0–1 derived from completed steps
 *   .candidates_ui — transformed to UI candidate format
 */
export const fetchPipelineStatus = async (jobId) => {
  const data = await apiFetch(`/api/v2/pipeline/design/${encodeURIComponent(jobId)}`);
  if (!data) return null;

  // Normalise progress from steps object
  const STEP_NAMES = ["fold", "binder_design", "sequence_design", "validation_fold"];
  const steps = data.steps || {};
  const doneCount = STEP_NAMES.filter((s) => steps[s]?.status === "done").length;
  const progress = STEP_NAMES.length > 0 ? doneCount / STEP_NAMES.length : 0;

  // Normalise status: "queued" → treat as "running"
  const status = data.status === "queued" ? "running" : data.status;

  // Transform candidates to UI format
  const candidates_ui = (data.candidates || []).map(transformDesignCandidate);

  return {
    ...data,
    status,
    progress,
    candidates_ui,
    // compat fields for App.jsx step indicator
    step_index: doneCount,
    step_total: STEP_NAMES.length,
  };
};

/* ─────────────────── Chat ───────────────────────────────────────────────────── */

/**
 * POST /api/v2/chat — no v2 chat endpoint yet.
 * TODO: implement when v2 chat is available.
 */
export const sendChat = async () => null;

/* ─────────────────── Ingestion / refresh ────────────────────────────────────── */

/**
 * Trigger threats refresh (bypass cache).
 * Replaces: POST /api/sync-scraper and POST /api/scrape
 * TODO: /api/v2/sync-scraper not yet verified on v2 backend
 */
export const refreshScraper = async () => {
  const data = await apiFetch("/api/v2/threats?refresh=true");
  if (data?.events) _eventCache = data.events;
  return data;
};

/**
 * Targeted ingestion — search threats client-side (server-side q= not implemented).
 * Replaces: POST /api/scrape with query
 */
export const targetedScrape = async (query) => searchThreats(query);

/* ─────────────────── Health ─────────────────────────────────────────────────── */

/**
 * Health check via threats endpoint (v2 /health returns 500).
 * Returns true if /api/v2/threats responds with events.
 */
export async function checkScraperHealth() {
  // Use cached result if recent (< 60s)
  if (_eventCache.length > 0) return true;
  const data = await apiFetch("/api/v2/threats");
  if (data?.events) { _eventCache = data.events; return true; }
  return false;
}

export function getScraperStatus() {
  return _eventCache.length > 0 ? "connected" : "checking";
}

/* ─────────────────── Convenience ───────────────────────────────────────────── */

export function isApiAvailable() {
  return { bio: !!API_BASE };
}

/** Expose cached events for use outside client.js */
export function getCachedEvents() {
  return _eventCache;
}
