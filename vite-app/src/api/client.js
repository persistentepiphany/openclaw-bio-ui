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
const SCRAPER_BASE =
  import.meta.env.VITE_SCRAPER_API_URL?.replace(/\/+$/, "") || "";
const SCRAPER_KEY = import.meta.env.VITE_SCRAPER_API_KEY || "";

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
 * Prepends VITE_SCRAPER_API_URL, injects X-API-Key header.
 */
export async function scraperFetch(path, options = {}) {
  try {
    const res = await fetch(`${SCRAPER_BASE}${path}`, {
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

/* ───────────────── Bio API endpoints ─────────────── */

/** GET /threat-feed — aggregated threat intelligence feed */
export const fetchThreatFeed = () => bioFetch("/threat-feed");

/** GET /candidates — protein/pathogen candidates for analysis */
export const fetchCandidates = () => bioFetch("/candidates");

/** GET /heatmap — geospatial threat heatmap data */
export const fetchHeatmap = () => bioFetch("/heatmap");

/** GET /biosecurity — biosecurity risk assessments */
export const fetchBiosecurity = () => bioFetch("/biosecurity");

/**
 * GET /pdb/:id — fetch raw PDB text (not JSON).
 * Returns plain text string for 3Dmol / Molstar.
 */
export const fetchPdb = (pdbId) =>
  bioFetch(`/pdb/${encodeURIComponent(pdbId)}`, { _raw: true });

/**
 * POST /pipeline/run — kick off a compute pipeline.
 * @param {object} config — pipeline configuration payload
 */
export const runPipeline = (config) =>
  bioFetch("/pipeline/run", {
    method: "POST",
    body: JSON.stringify(config),
  });

/** GET /pipeline/status/:id — poll pipeline job status */
export const fetchPipelineStatus = (jobId) =>
  bioFetch(`/pipeline/status/${encodeURIComponent(jobId)}`);

/**
 * POST /chat — send a message to the AI chat backend.
 * @param {string}  message — user message
 * @param {object}  context — { candidates, threat_feed, history }
 */
export const sendChat = (message, context = {}) =>
  bioFetch("/chat", {
    method: "POST",
    body: JSON.stringify({ message, ...context }),
  });

/* ──────────────── Scraper API endpoints ──────────── */

/** GET /report — latest scraper intelligence report */
export const fetchReport = () => scraperFetch("/report");

/** GET /threats — current threat list from scraper */
export const fetchThreats = () => scraperFetch("/threats");

/** GET /latest — most recent scraper entries */
export const fetchLatestEntries = () => scraperFetch("/latest");

/**
 * GET /search?q=... — search scraped threat data.
 * @param {string} query — search term
 */
export const searchThreats = (query) =>
  scraperFetch(`/search?q=${encodeURIComponent(query)}`);

/** POST /refresh — trigger a manual scraper refresh */
export const refreshScraper = () =>
  scraperFetch("/refresh", { method: "POST" });

/** GET /pipeline/status — scraper pipeline health / status */
export const fetchScraperPipelineStatus = () =>
  scraperFetch("/pipeline/status");

/* ───────────────── convenience ───────────────────── */

/**
 * Quick check: are both API base URLs configured?
 * Useful for showing "connect API" banners in the UI.
 */
export function isApiAvailable() {
  return {
    bio: !!BIO_BASE,
    scraper: !!SCRAPER_BASE && !!SCRAPER_KEY,
  };
}
