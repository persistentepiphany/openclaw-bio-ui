/**
 * reportGenerator.js — Z.AI-powered epidemiological report generator.
 *
 * Builds a rich prompt from live dashboard state and calls Z.AI GLM-4.5.
 * The model returns a complete LaTeX document which is passed back as-is.
 *
 * Falls back to Flock.io if Z.AI is unavailable.
 */

const ZAI_URL = "https://api.z.ai/api/paas/v4/chat/completions";
const ZAI_KEY = import.meta.env.VITE_Z_AI_API_KEY || "";
const FLOCK_URL = "https://api.flock.io/v1/chat/completions";
const FLOCK_KEY = import.meta.env.VITE_FLOCK_API_KEY || "";

/* ─── Prompt builder ──────────────────────────────────────────────── */

/**
 * Assemble a rich prompt from all available dashboard data.
 * Produces a self-contained LaTeX epidemiological report.
 */
export function buildReportPrompt({ candidates = [], feedItems = [], heatmapData = null, proteinList = [] }) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const reportId = `BSR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-AUTO`;

  /* Feed summary */
  const feedRows = feedItems
    .slice(0, 15)
    .map((f) => `  ${f.time || f.timestamp || "—"} | ${f.sourceType?.toUpperCase() || "?"} | ${Math.round(f.confidence || 0)}% | ${f.message}`)
    .join("\n");

  /* Candidate summary */
  const candRows = [...candidates]
    .sort((a, b) => b.score - a.score)
    .map((c, i) =>
      `  ${i + 1}. ${c.id} | ${c.name} | score=${c.score} | target=${c.target} | pdb=${c.pdb} | status=${c.status}`
    )
    .join("\n");

  /* Heatmap */
  let heatmapSection = "No heatmap data available.";
  if (heatmapData?.matrix?.length > 0) {
    const header = ["Candidate", ...(heatmapData.variants || [])].join(" | ");
    const rows = (heatmapData.items || []).map((item, i) => {
      const scores = (heatmapData.matrix[i] || []).map((v) => v.toFixed(2)).join(" | ");
      return `  ${item} | ${scores}`;
    });
    heatmapSection = [header, ...rows].join("\n");
  }

  /* Protein list */
  const proteinRows = proteinList
    .map((p) => `  ${p.pdbId} | ${p.label} | ${p.organism || "—"} | ${p.desc || "—"} | ${p.mw || "—"}`)
    .join("\n");

  return `You are BioSentinel, an AI biosecurity analyst. Generate a comprehensive, well-structured epidemiological intelligence report as a complete LaTeX document.

REPORT METADATA:
- Report ID: ${reportId}
- Date: ${today}
- System: BioSentinel Biosurveillance Platform
- Classification: Confidential — Internal Use Only

THREAT FEED DATA (${feedItems.length} signals):
${feedRows || "No feed data available."}

DRUG CANDIDATES (${candidates.length} total):
${candRows || "No candidate data available."}

CROSS-VARIANT INTERACTION MATRIX:
${heatmapSection}

PROTEIN TARGETS (${proteinList.length} proteins):
${proteinRows || "No protein data available."}

INSTRUCTIONS:
Generate a complete LaTeX document (\\documentclass through \\end{document}) for a professional epidemiological intelligence report. The report MUST include ALL of the following sections:

1. Title page (report ID, date, classification, pipeline status)
2. Abstract (2–3 paragraphs summarizing key findings)
3. Table of contents
4. Executive Summary with a threat priority table (\\begin{table}...\\end{table})
5. Threat Intelligence Overview — analyze the feed signals by source type and confidence; include a full LaTeX table of all feed signals
6. Priority Pathogen Analysis — dedicate a subsection to each priority pathogen identified in the feed; include structural biology context for each protein target
7. Drug Candidate Pipeline Analysis — include a complete \\begin{table} of all candidates with scores, targets, PDB IDs, and status; analyze lead candidates in detail
8. Cross-Variant Resistance Analysis — reproduce the full interaction matrix as a LaTeX table; interpret each candidate's resistance profile; recommend combination strategies
9. Target Protein Structure Analysis — include a table of all protein targets with organism, function, residues, MW; describe binding site druggability for each priority target
10. Biosecurity Risk Assessment — risk matrix table; gain-of-function considerations if relevant; environmental surveillance findings
11. Recommendations — organized into Immediate (0–72h), Short-term (1–2 weeks), Strategic (1–3 months)
12. Conclusions

LATEX REQUIREMENTS:
- Use \\documentclass[12pt,a4paper]{article}
- Use packages: geometry, lmodern, fontenc, inputenc, microtype, parskip, booktabs, longtable, array, colortbl, xcolor, hyperref, fancyhdr, titlesec, enumitem, caption, amsmath, float, multirow, tabularx
- Define colors: bsgreen (RGB 48,209,88), bsred (RGB 255,69,58), bsorange (RGB 255,159,10), bsblue (RGB 10,132,255), bspurple (RGB 94,92,230), midgray (RGB 150,150,160), passrow (RGB 235,255,240), warnrow (RGB 255,248,230), highrow (RGB 255,235,235)
- Use fancyhdr for headers/footers: left="BioSentinel — Epidemiological Intelligence Report", right="CONFIDENTIAL", footer=page number
- Color section headings: \\section in bsblue, \\subsection in bspurple
- Use \\colorbox{highrow} for HIGH risk, \\colorbox{warnrow} for MEDIUM, \\colorbox{passrow} for LOW in tables
- Use \\rowcolor{passrow} for pass-status candidate rows, \\rowcolor{warnrow} for warn-status
- Use \\toprule/\\midrule/\\bottomrule from booktabs in all tables
- Add \\newpage before major sections (Priority Pathogen, Drug Candidates, Cross-Variant, Protein Targets, Risk, Recommendations, Conclusions)
- The document must be at minimum 8 pages of dense technical content

Make the analysis substantive and specific — reference actual candidate IDs, scores, PDB codes, and signal confidence values from the data provided. Do not write generic placeholder text.

Return ONLY valid LaTeX, no markdown fences, no explanations outside the document.`;
}

/* ─── API calls ───────────────────────────────────────────────────── */

async function callZAI(prompt) {
  if (!ZAI_KEY) return null;
  try {
    const res = await fetch(ZAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ZAI_KEY}` },
      body: JSON.stringify({
        model: "glm-4.5",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 8192,
        stream: false,
      }),
    });
    if (!res.ok) { console.warn(`[reportGen/ZAI] ${res.status}`); return null; }
    const data = await res.json();
    return data.choices?.[0]?.message?.content
      || data.choices?.[0]?.message?.reasoning_content
      || null;
  } catch (err) {
    console.warn("[reportGen/ZAI] failed:", err.message);
    return null;
  }
}

async function callFlock(prompt) {
  if (!FLOCK_KEY) return null;
  try {
    const res = await fetch(FLOCK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-litellm-api-key": FLOCK_KEY },
      body: JSON.stringify({
        model: "qwen3-30b-a3b-instruct-2507",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 8192,
        stream: false,
      }),
    });
    if (!res.ok) { console.warn(`[reportGen/Flock] ${res.status}`); return null; }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn("[reportGen/Flock] failed:", err.message);
    return null;
  }
}

/* ─── Public API ──────────────────────────────────────────────────── */

/**
 * Generate a LaTeX epidemiological report using Z.AI (with Flock fallback).
 *
 * @param {object} dashboardData — { candidates, feedItems, heatmapData, proteinList }
 * @param {function} onStatus — progress callback (string)
 * @returns {string|null} — LaTeX document string, or null on failure
 */
export async function generateReport(dashboardData, onStatus = () => {}) {
  const prompt = buildReportPrompt(dashboardData);

  onStatus("Connecting to Z.AI…");
  let latex = await callZAI(prompt);

  if (!latex) {
    onStatus("Z.AI unavailable — trying Flock.io…");
    latex = await callFlock(prompt);
  }

  if (!latex) {
    onStatus("All AI backends unavailable.");
    return null;
  }

  // Strip markdown fences if the model wrapped its output
  latex = latex.replace(/^```(?:latex|tex)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Sanity check: must look like a LaTeX document
  if (!latex.includes("\\documentclass") || !latex.includes("\\end{document}")) {
    onStatus("AI returned invalid LaTeX. Try again.");
    return null;
  }

  onStatus("Report generated.");
  return latex;
}

export const isReportGenAvailable = () => !!(ZAI_KEY || FLOCK_KEY);
