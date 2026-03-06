/**
 * client.js — Unified API client for BioSentinel Dashboard
 *
 * Two backends:
 *   Bio API   (Railway)            — computational biology endpoints
 *   Scraper API (Cloudflare tunnel) — threat intelligence / scraping
 *
 * Environment variables (set in .env):
 *   VITE_BIO_API_URL      — base URL of the Bio API on Railway
 *   VITE_SCRAPER_API_URL  — base URL of the Scraper API on Cloudflare tunnel
 *   VITE_SCRAPER_API_KEY  — X-API-Key header value for the Scraper API
 */

const BIO_BASE = import.meta.env.VITE_BIO_API_URL?.replace(/\/+$/, "") || "";
const SCRAPER_KEY = import.meta.env.VITE_SCRAPER_API_KEY || "";

/* ── Dynamic scraper URL: auto-discovered from Railway, .env as fallback ── */
let _scraperBase = import.meta.env.VITE_SCRAPER_API_URL?.replace(/\/+$/, "") || "";
let _scraperDiscovered = false;

/**
 * Discover the current scraper tunnel URL from Railway.
 * Railway always has the latest URL via VPS auto-push.
 * Called once on first scraperFetch, result cached for the session.
 */
async function _discoverScraperUrl() {
  if (_scraperDiscovered) return;
  _scraperDiscovered = true;
  try {
    const res = await fetch(`${BIO_BASE}/api/config/scraper-url`, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const url = data.url || data.scraper_url;
      if (url) {
        _scraperBase = url.replace(/\/+$/, "");
        console.info(`[scraperFetch] Auto-discovered URL: ${_scraperBase}`);
      }
    }
  } catch (err) {
    console.warn("[scraperFetch] URL discovery failed, using .env fallback:", err.message);
  }
}

/* ───────────────────── helpers ───────────────────── */

/**
 * Fetch wrapper for the Bio API (Railway).
 * Prepends VITE_BIO_API_URL, returns parsed JSON.
 * Logs a warning on failure instead of throwing (resilient dashboard).
 */
export async function bioFetch(path, options = {}) {
  try {
    const res = await fetch(`${BIO_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`Bio API ${res.status}: ${res.statusText}`);
    // If caller wants raw text (e.g. PDB), they pass options._raw
    if (options._raw) return res.text();
    return res.json();
  } catch (err) {
    console.warn(`[bioFetch] ${path}:`, err.message);
    return null;
  }
}

/**
 * Fetch wrapper for the Scraper API (Cloudflare tunnel).
 * Auto-discovers the current tunnel URL from Railway on first call.
 * Falls back to VITE_SCRAPER_API_URL from .env if discovery fails.
 */
export async function scraperFetch(path, options = {}) {
  await _discoverScraperUrl();
  try {
    const res = await fetch(`${_scraperBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": SCRAPER_KEY,
        ...options.headers,
      },
    });
    if (!res.ok)
      throw new Error(`Scraper API ${res.status}: ${res.statusText}`);
    return res.json();
  } catch (err) {
    console.warn(`[scraperFetch] ${path}:`, err.message);
    return null;
  }
}

/**
 * Transform an API candidate object into the shape the frontend expects.
 * API returns: { id: 0, pdb_path, sequence, design_score, status, ... }
 * Frontend needs: { id: "CLW-0117", name, score, target, status, pdb, ... }
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

/* ───────────────── Bio API endpoints ─────────────── */

/** GET /api/threat-feed — aggregated threat intelligence feed */
export const fetchThreatFeed = () => bioFetch("/api/threat-feed");

/** GET /api/candidates — protein/pathogen candidates for analysis */
export const fetchCandidates = async () => {
  const data = await bioFetch("/api/candidates");
  if (!data) return null;
  const candidates = Array.isArray(data) ? data : data.candidates || [];
  const valid = candidates
    .filter((c) => c.status !== "failed")
    .map((c, i) => transformCandidate(c, i));
  return valid.length > 0 ? valid : null;
};

/** GET /api/heatmap — geospatial threat heatmap data */
export const fetchHeatmap = () => bioFetch("/api/heatmap");

/** GET /api/biosecurity — biosecurity risk assessments */
export const fetchBiosecurity = () => bioFetch("/api/biosecurity");

/**
 * GET /api/pdb/:id — fetch raw PDB text (not JSON).
 * Returns plain text string for 3Dmol / Molstar.
 */
export const fetchPdb = (pdbId) =>
  bioFetch(`/api/pdb/${encodeURIComponent(pdbId)}`, { _raw: true });

/**
 * POST /api/run-pipeline — kick off a compute pipeline.
 * @param {object} config — pipeline configuration payload
 */
export const runPipeline = (config) =>
  bioFetch("/api/run-pipeline", {
    method: "POST",
    body: JSON.stringify(config),
  });

/** GET /api/pipeline-status/:id — poll pipeline job status */
export const fetchPipelineStatus = (jobId) =>
  bioFetch(`/api/pipeline-status/${encodeURIComponent(jobId)}`);

/**
 * POST /api/chat — send a message to the AI chat backend.
 * @param {string}  message — user message
 * @param {object}  context — { candidates, threat_feed, history }
 */
export const sendChat = (message, context = {}) =>
  bioFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, ...context }),
  });

/* ──────────────── Scraper API endpoints ──────────── */

/** GET /api/report — latest scraper intelligence report */
export const fetchReport = () => scraperFetch("/api/report");

/** GET /api/threats — current threat list from scraper */
export const fetchThreats = () => scraperFetch("/api/threats");

/**
 * POST /api/search — search scraped threat data.
 * @param {string} query — search term
 */
export const searchThreats = (query) =>
  scraperFetch("/api/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });

/** POST /api/scrape — trigger a manual scraper refresh */
export const refreshScraper = () =>
  scraperFetch("/api/scrape", { method: "POST" });

/** GET /api/health — scraper health check */
export const fetchScraperPipelineStatus = () =>
  scraperFetch("/api/health");

/* ───────────────── convenience ───────────────────── */

/**
 * Quick check: are both API base URLs configured?
 * Useful for showing "connect API" banners in the UI.
 */
export function isApiAvailable() {
  return {
    bio: !!BIO_BASE,
    scraper: !!_scraperBase && !!SCRAPER_KEY,
  };
}
