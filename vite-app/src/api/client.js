/**
 * client.js — Unified API client for BioSentinel Dashboard (v2)
 *
 * Single backend: v2 Bio API at VITE_BIO_API_URL.
 * The Cloudflare tunnel scraper has been retired — threat ingestion
 * is now handled by the v2 backend's built-in ingestion pipeline.
 *
 * Environment variables (set in .env.local):
 *   VITE_BIO_API_URL — base URL of the v2 Bio API
 *                      e.g. https://divine-cat-v2-v2.up.railway.app
 */

const API_BASE =
  (import.meta.env.VITE_BIO_API_URL || "https://divine-cat-v2-v2.up.railway.app").replace(/\/+$/, "");

/* ───────────────────── core fetch helpers ─────────────────────── */

/**
 * GET or POST to the v2 API.
 * Returns parsed JSON on success, null on any failure.
 * Logs a clear v2-prefixed warning so failures are easy to spot.
 */
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
      // Surface v2 endpoint availability clearly in the console
      if (res.status === 404 || res.status === 501) {
        console.warn(`[v2 API] endpoint not available: ${path} (${res.status})`);
      } else {
        console.warn(`[v2 API] ${path}: ${res.status} ${res.statusText}`);
      }
      return null;
    }

    // Raw text mode for PDB files
    if (options._raw) return res.text();
    return res.json();
  } catch (err) {
    console.warn(`[v2 API] ${path}:`, err.message);
    return null;
  }
}

// Convenience aliases
export const bioFetch = apiFetch; // kept for compatibility with any direct imports

/* ───────────────── response transforms ─────────────────────────── */

/**
 * Transform a v2 candidate object into the shape the frontend expects.
 */
function transformCandidate(c, index) {
  const clwId = c.clw_id || `CLW-${String(index + 1).padStart(4, "0")}`;
  return {
    ...c,
    id: clwId,
    name: c.name || (c.sequence ? c.sequence.substring(0, 10) : `Candidate-${index + 1}`),
    score: c.score ?? c.design_score ?? c.binding_score ?? 0,
    target: c.target || "Unknown",
    status: c.status === "pass" || c.status === "validated" ? "pass" : c.status,
    pdb: c.pdb || c.pdb_path?.split("/").pop()?.replace(".pdb", "") || "1CRN",
    sequence: c.sequence,
    pdbPath: c.pdb_path,
  };
}

/* ─────────────────── v2 Bio API endpoints ──────────────────────── */

/** GET /api/v2/threats — aggregated threat intelligence feed */
export const fetchThreatFeed = () => apiFetch("/api/v2/threats");

/** GET /api/v2/candidates — protein/pathogen candidates */
export const fetchCandidates = async () => {
  const data = await apiFetch("/api/v2/candidates");
  if (!data) return null;
  const candidates = Array.isArray(data) ? data : data.candidates || [];
  const valid = candidates
    .filter((c) => c.status !== "failed")
    .map((c, i) => transformCandidate(c, i));
  return valid.length > 0 ? valid : null;
};

/** GET /api/v2/heatmap — cross-variant interaction matrix */
export const fetchHeatmap = async () => {
  const data = await apiFetch("/api/v2/heatmap");
  if (!data) return null;
  return {
    variants: data.variants || [],
    items: data.items || data.candidates || [],
    matrix: data.matrix || [],
  };
};

/** GET /api/v2/biosecurity — biosecurity risk assessments */
export const fetchBiosecurity = () => apiFetch("/api/v2/biosecurity");

/**
 * GET /api/v2/protein/bundle/:id/pdb — fetch raw PDB text for 3D viewer.
 * If the protein isn't cached (404), triggers a bundle request and retries once.
 */
export async function fetchPdb(pdbId) {
  const encoded = encodeURIComponent(pdbId);
  try {
    await requestProteinBundle(pdbId);
    const res = await fetch(`${API_BASE}/api/v2/protein/bundle/${encoded}/pdb`);
    if (res.ok) return res.text();
    console.warn(`[v2 API] fetchPdb ${pdbId}: ${res.status}`);
    return null;
  } catch (err) {
    console.warn(`[v2 API] fetchPdb ${pdbId}:`, err.message);
    return null;
  }
}

/** GET /api/v2/report — latest threat intelligence report (replaces scraper /api/report) */
export const fetchReport = () => apiFetch("/api/v2/report");

/**
 * GET /api/v2/threats?q=<query> — search threat intelligence.
 * Replaces: POST /api/search on the retired Cloudflare tunnel scraper.
 */
export const searchThreats = (query) =>
  apiFetch(`/api/v2/threats?q=${encodeURIComponent(query)}`);

/**
 * POST /api/v2/sync-scraper — trigger v2 ingestion pipeline pull.
 * Replaces: POST /api/scrape on the retired Cloudflare tunnel scraper.
 * TODO: /api/v2/sync-scraper not yet verified on backend — using mock/fallback if 404
 */
export const refreshScraper = () =>
  apiFetch("/api/v2/sync-scraper", { method: "POST" });

/**
 * POST /api/v2/sync-scraper with query — targeted ingestion pull.
 * Replaces: POST /api/scrape with { query, context } on the retired scraper.
 * TODO: /api/v2/sync-scraper query support not yet verified on backend
 */
export const targetedScrape = (query, context) =>
  apiFetch("/api/v2/sync-scraper", {
    method: "POST",
    body: JSON.stringify({ query, context }),
  });

/**
 * POST /api/v2/pipeline/run — kick off a compute pipeline.
 * Replaces: POST /api/run-pipeline
 */
export const runPipeline = (config) =>
  apiFetch("/api/v2/pipeline/run", {
    method: "POST",
    body: JSON.stringify(config),
  });

/**
 * GET /api/v2/pipeline/status/:id — poll pipeline job status.
 * Replaces: GET /api/pipeline-status/:id
 */
export const fetchPipelineStatus = (jobId) =>
  apiFetch(`/api/v2/pipeline/status/${encodeURIComponent(jobId)}`);

/**
 * POST /api/v2/chat — send a message to the AI chat backend.
 * Replaces: POST /api/chat
 */
export const sendChat = (message, context = {}) =>
  apiFetch("/api/v2/chat", {
    method: "POST",
    body: JSON.stringify({ message, ...context }),
  });

/* ─────────────────── Protein Bundle API ────────────────────────── */

/**
 * GET /api/v2/protein/list — list available proteins.
 * Replaces: GET /api/protein/list
 */
export const fetchProteinList = async () => {
  const data = await apiFetch("/api/v2/protein/list");
  if (!data) return null;
  return data.proteins || data;
};

/**
 * POST /api/v2/protein/bundle — fetch + cache a protein by PDB ID.
 * Replaces: POST /api/protein/bundle
 */
export const requestProteinBundle = (pdbId) =>
  apiFetch("/api/v2/protein/bundle", {
    method: "POST",
    body: JSON.stringify({ pdb_id: pdbId }),
  });

/**
 * GET /api/v2/protein/bundle/:id/pdb — raw PDB text for a bundled protein.
 * Replaces: GET /api/protein/bundle/:id/pdb
 */
export const fetchBundledPdb = (pdbId) =>
  apiFetch(`/api/v2/protein/bundle/${encodeURIComponent(pdbId)}/pdb`, { _raw: true });

/**
 * GET /api/v2/protein/bundle/:id — full protein bundle (metadata + analysis).
 * Replaces: GET /api/protein/bundle/:id
 */
export const fetchProteinBundle = (pdbId) =>
  apiFetch(`/api/v2/protein/bundle/${encodeURIComponent(pdbId)}`);

/* ─────────────────── Health ─────────────────────────────────────── */

/**
 * GET /api/v2/health — v2 API health check.
 * Replaces: scraper /api/health check via Cloudflare tunnel.
 */
export async function checkScraperHealth() {
  const data = await apiFetch("/api/v2/health");
  return !!data && (data.status === "ok" || data.status === "healthy");
}

/** Sync accessor — always "checking" until async check completes. */
export function getScraperStatus() {
  return "checking";
}

/* ─────────────────── Convenience ───────────────────────────────── */

/** Check whether the API base URL is configured. */
export function isApiAvailable() {
  return { bio: !!API_BASE };
}

// scraperFetch kept as a named export so any remaining import doesn't hard-crash.
// It simply delegates to apiFetch — the path distinction is gone in v2.
export const scraperFetch = apiFetch;
