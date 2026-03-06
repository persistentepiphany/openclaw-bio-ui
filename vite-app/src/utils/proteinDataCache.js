/**
 * proteinDataCache.js — Pre-fetch and cache protein analysis + AI insights
 *
 * MoleculeViewer calls prefetchProteinData() on every protein load.
 * AISummaryPanel reads from cache for instant display.
 *
 * Flow:
 *   1. Protein loads → prefetch analysis data (fast, local JSON)
 *   2. Analysis data ready → fire AI generation in background
 *   3. User opens AI tab → analysis data instant, AI ready or loading
 */

import { bioFetch } from "../api/client";

const ZAI_URL = "https://api.z.ai/api/paas/v4/chat/completions";
const ZAI_KEY = import.meta.env.VITE_Z_AI_API_KEY || "";
const FLOCK_URL = "https://api.flock.io/v1/chat/completions";
const FLOCK_KEY = import.meta.env.VITE_FLOCK_API_KEY || "";

/* ── Caches (persist across component mounts) ── */
const analysisCache = new Map();
const aiCache = new Map();
const pendingAnalysis = new Map();
const pendingAI = new Map();

/* ── Analysis data fetch with dedup ── */
export async function getAnalysisData(pdbId) {
  if (analysisCache.has(pdbId)) return analysisCache.get(pdbId);
  if (pendingAnalysis.has(pdbId)) return pendingAnalysis.get(pdbId);

  const p = (async () => {
    let data = await bioFetch(`/api/analysis/${pdbId}`);
    if (!data) {
      try {
        const r = await fetch(`/analysis/${pdbId}.json`);
        if (r.ok) data = await r.json();
      } catch { /* optional */ }
    }
    if (data) analysisCache.set(pdbId, data);
    pendingAnalysis.delete(pdbId);
    return data;
  })();

  pendingAnalysis.set(pdbId, p);
  return p;
}

/* ── Build focused AI prompt ── */
function buildPrompt(pdbId, pdbInfo, analysisData) {
  const meta = pdbInfo
    ? `Protein: ${pdbInfo.label} (PDB: ${pdbId}), Organism: ${pdbInfo.organism}, ${pdbInfo.residues} residues, ${pdbInfo.chains} chain(s), MW: ${pdbInfo.mw}`
    : `PDB: ${pdbId}`;

  let dataCtx = "";
  if (analysisData) {
    const { sasa, quality } = analysisData;
    const lines = [];
    if (sasa) {
      lines.push(`SASA: total=${sasa.totalSasa?.toFixed(1)}nm², avg=${sasa.avgSasa?.toFixed(2)}nm², max=${sasa.maxSasa?.toFixed(2)}nm²`);
      if (sasa.residues?.length > 0) {
        const top = [...sasa.residues].sort((a, b) => b.sasa - a.sasa).slice(0, 5);
        lines.push(`Most exposed: ${top.map(r => `${r.resName}${r.resNum}(${r.sasa.toFixed(2)}nm²)`).join(", ")}`);
      }
    }
    if (quality?.ramachandran?.statistics) {
      const r = quality.ramachandran.statistics;
      lines.push(`Ramachandran: ${r.favored_percent.toFixed(1)}% favored, ${r.allowed_percent.toFixed(1)}% allowed, ${r.outlier_percent.toFixed(1)}% outlier`);
    }
    if (quality?.bfactor?.statistics) {
      const b = quality.bfactor.statistics;
      lines.push(`B-factor: mean=${b.mean.toFixed(1)}, max=${b.max.toFixed(1)}, std=${b.std.toFixed(1)}, range ${b.min.toFixed(1)}-${b.max.toFixed(1)}`);
    }
    if (quality?.geometry) lines.push(`Clashes: ${quality.geometry.clashCount} (threshold ${quality.geometry.clashThreshold}Å)`);
    if (quality?.bfactor?.flexibleRegions?.length > 0) {
      lines.push(`Flexible regions: ${quality.bfactor.flexibleRegions.map(r => `${r.resName}${r.resNum}(B=${r.avgBfactor.toFixed(1)})`).join(", ")}`);
    }
    dataCtx = `\n\nAmino Analytica results:\n${lines.join("\n")}`;
  }

  return `You are a structural biology expert analyzing a protein for a biosecurity dashboard. Be concise and specific.

${meta}${dataCtx}

Return a JSON object with exactly 3 keys:
- "insight": 2-3 sentences synthesizing the most important structural and functional findings. Reference specific residue numbers and values from the data. Mention druggability and therapeutic relevance.
- "highlights": array of 4 short strings (each max 15 words), each a specific data-driven observation about structure quality, surface exposure, flexibility, or binding potential.
- "recommendation": 1 sentence actionable next step (e.g., which design tool to run, which region to target).

Reference actual residue numbers and data values. Return ONLY valid JSON, no code fences, no extra text.`;
}

/* ── Shared API call helper ── */
async function callAI(prompt) {
  // Z.AI first
  if (ZAI_KEY) {
    try {
      const res = await fetch(ZAI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ZAI_KEY}` },
        body: JSON.stringify({
          model: "glm-4.5",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 512,
          stream: false,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        let c = d.choices?.[0]?.message?.content || d.choices?.[0]?.message?.reasoning_content;
        if (c) {
          c = c.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
          const parsed = JSON.parse(c);
          if (parsed.insight) return parsed;
        }
      }
    } catch (e) { console.warn("[ProteinCache] Z.AI:", e.message); }
  }

  // Flock fallback
  if (FLOCK_KEY) {
    try {
      const res = await fetch(FLOCK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-litellm-api-key": FLOCK_KEY },
        body: JSON.stringify({
          model: "qwen3-30b-a3b-instruct-2507",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 512,
          stream: false,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        let c = d.choices?.[0]?.message?.content;
        if (c) {
          c = c.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
          c = c.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
          const parsed = JSON.parse(c);
          if (parsed.insight) return parsed;
        }
      }
    } catch (e) { console.warn("[ProteinCache] Flock:", e.message); }
  }

  return null;
}

/* ── AI insights fetch with dedup ── */
export async function getAIInsights(pdbId, pdbInfo, analysisData) {
  if (aiCache.has(pdbId)) return aiCache.get(pdbId);
  if (pendingAI.has(pdbId)) return pendingAI.get(pdbId);

  const prompt = buildPrompt(pdbId, pdbInfo, analysisData);
  const p = (async () => {
    const result = await callAI(prompt);
    if (result) aiCache.set(pdbId, result);
    pendingAI.delete(pdbId);
    return result;
  })();

  pendingAI.set(pdbId, p);
  return p;
}

/**
 * Pre-fetch protein data on protein load.
 * Call from MoleculeViewer — starts analysis + AI generation in background.
 */
export function prefetchProteinData(pdbId, pdbInfo) {
  getAnalysisData(pdbId).then(data => {
    if (!aiCache.has(pdbId) && !pendingAI.has(pdbId)) {
      getAIInsights(pdbId, pdbInfo, data);
    }
  });
}

/** Get cached analysis (sync, null if not ready) */
export function getCachedAnalysis(pdbId) {
  return analysisCache.get(pdbId) || null;
}

/** Get cached AI insights (sync, null if not ready) */
export function getCachedAI(pdbId) {
  return aiCache.get(pdbId) || null;
}
