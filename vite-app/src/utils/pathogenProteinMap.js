/**
 * pathogenProteinMap.js — Centralized pathogen-to-protein mapping utility.
 *
 * Consolidates protein metadata and threat-protein associations
 * previously scattered across mockData.js and ChatInterface.jsx.
 */
import { proteinList } from "../data/mockData";
import { fetchProteinList } from "../api/client";

/* ── All protein objects keyed by PDB ID ── */
export const PROTEIN_METADATA = {};
proteinList.forEach((p) => {
  PROTEIN_METADATA[p.pdbId] = p;
});

/* ── Keyword → PDB ID mapping (pathogen/threat → target protein) ── */
export const PATHOGEN_TO_PROTEINS = {
  h5n1: ["4NQJ"],
  influenza: ["4NQJ"],
  "bird flu": ["4NQJ"],
  nipah: ["7L1F"],
  henipavirus: ["7L1F"],
  ebola: ["5T6N"],
  ebolavirus: ["5T6N"],
  sars: ["6VMZ"],
  covid: ["6VMZ"],
  coronavirus: ["7BV2"],
  spike: ["7BV2"],
  anthrax: ["3I6G"],
  bacillus: ["3I6G"],
  "sars-cov-2": ["6VMZ", "7BV2"],
  mpro: ["6VMZ", "6LU7"],
};

/* ── Severity mapping for pathogen keywords ── */
const SEVERITY_MAP = {
  h5n1: "high",
  influenza: "medium",
  nipah: "critical",
  ebola: "critical",
  sars: "high",
  covid: "high",
  anthrax: "critical",
  coronavirus: "high",
};

/**
 * Scan a scraper report and produce protein suggestions with severity/pathogen annotations.
 * @param {object} report — scraper report { entries, summary, threats }
 * @returns {Array<{ pdbId, label, pathogen, severity, source }>}
 */
export function extractProteinsFromReport(report) {
  if (!report) return [];

  const found = new Map(); // pdbId → { pdbId, label, pathogen, severity, source }

  const addMatch = (keyword, pathogen, source) => {
    const pdbIds = PATHOGEN_TO_PROTEINS[keyword];
    if (!pdbIds) return;
    const severity = SEVERITY_MAP[keyword] || "medium";
    pdbIds.forEach((pdbId) => {
      if (!found.has(pdbId)) {
        const meta = PROTEIN_METADATA[pdbId];
        found.set(pdbId, {
          pdbId,
          label: meta?.label || pdbId,
          desc: meta?.desc || "",
          organism: meta?.organism || "",
          pathogen: pathogen || keyword,
          severity,
          source,
        });
      }
    });
  };

  const scanText = (text, source) => {
    if (!text) return;
    const lower = text.toLowerCase();
    for (const keyword of Object.keys(PATHOGEN_TO_PROTEINS)) {
      if (lower.includes(keyword)) {
        addMatch(keyword, keyword, source);
      }
    }
  };

  // Scan threats array
  if (report.threats) {
    report.threats.forEach((t) => {
      scanText(t.pathogen, "threat");
      scanText(t.title, "threat");
      scanText(t.message, "threat");
    });
  }

  // Scan summary top_pathogen
  if (report.summary?.top_pathogen) {
    scanText(report.summary.top_pathogen, "summary");
  }

  // Scan entries
  if (report.entries) {
    report.entries.forEach((e) => {
      scanText(e.title, "entry");
      scanText(e.topic, "entry");
    });
  }

  return Array.from(found.values());
}

/**
 * Convert fetchProteinList() API shape to frontend shape.
 * API returns: { pdb_id, label, organism, residues, chains, mw, has_analysis }
 * Frontend uses: { pdbId, label, desc, organism, mw }
 */
export function normalizeApiProtein(apiProtein) {
  return {
    pdbId: apiProtein.pdb_id || apiProtein.pdbId,
    label: apiProtein.label || apiProtein.pdb_id,
    desc: apiProtein.description || `${apiProtein.residues || "?"} residues${apiProtein.chains ? ` · ${apiProtein.chains} chains` : ""}`,
    organism: apiProtein.organism || "",
    mw: apiProtein.mw || "",
  };
}

/**
 * Build the THREAT_PROTEIN_MAP for ChatInterface compatibility.
 * Returns { keyword: { pdbId, label } } — single best match per keyword.
 */
export function getThreatProteinMap() {
  const map = {};
  for (const [keyword, pdbIds] of Object.entries(PATHOGEN_TO_PROTEINS)) {
    const pdbId = pdbIds[0];
    const meta = PROTEIN_METADATA[pdbId];
    map[keyword] = { pdbId, label: meta?.label || pdbId };
  }
  return map;
}
