/**
 * zai.js — Z.AI (Zhipu) chat client for BioSentinel assistant.
 *
 * Calls the Z.AI GLM-5 model with:
 *   - A dynamic system prompt injected with live dashboard state
 *   - Tool definitions so the model can trigger dashboard actions
 *   - Conversation history for multi-turn context
 *
 * Falls back gracefully if the API is unreachable.
 *
 * NOTE: The API key is exposed in the browser bundle (VITE_ prefix).
 * In production, proxy through the Railway Bio API instead.
 */

const ZAI_URL = "https://api.z.ai/api/paas/v4/chat/completions";
const ZAI_KEY = import.meta.env.VITE_Z_AI_API_KEY || "";
const MODEL = "glm-4.5";

/* ───────────────── Tool definitions ───────────────── */

const TOOLS = [
  {
    type: "function",
    function: {
      name: "run_pipeline",
      description:
        "Start the BioSentinel analysis pipeline. Runs epitope detection, candidate generation, validation, and biosecurity assessment. Returns a job ID.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["mock", "real"],
            description: "Pipeline mode: 'mock' for fast demo, 'real' for actual bio tools.",
          },
          target_pdb: {
            type: "string",
            description: "PDB ID of the target protein (e.g. '4NQJ', '7L1F'). If omitted, uses current selection.",
          },
          num_candidates: {
            type: "integer",
            description: "Number of candidates to generate (1-5). Default is 1.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "targeted_scrape",
      description:
        "Initiate a focused scrape on a specific topic, pathogen, or region. Use when the user asks to look for threats in a specific area or related to a specific pathogen.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for the scraper (e.g. 'Nipah virus Southeast Asia', 'H5N1 dairy cattle').",
          },
          context: {
            type: "string",
            description: "Additional context about what to look for.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_pipeline_target",
      description:
        "Based on current threat intelligence, recommend which protein target to analyze in the pipeline. Analyzes feed data and returns a recommendation with reasoning.",
      parameters: {
        type: "object",
        properties: {
          threat_context: {
            type: "string",
            description: "Description of the threat or pathogen to find a target for.",
          },
        },
        required: ["threat_context"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_threats",
      description:
        "Search the threat intelligence database for a query term. Returns matching entries from the scraper.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query (pathogen name, location, keyword).",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_report",
      description:
        "Fetch the latest intelligence report from the scraper API. Returns a summary of current biosecurity threats.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "refresh_dashboard",
      description:
        "Refresh all dashboard data panels (threat feed, candidates, heatmap) by pulling latest from the Bio API.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_candidate_details",
      description:
        "Look up detailed information about a specific drug candidate by its ID (e.g. CLW-0117) or index number.",
      parameters: {
        type: "object",
        properties: {
          identifier: {
            type: "string",
            description: "Candidate ID (like CLW-0117) or 1-based index number.",
          },
        },
        required: ["identifier"],
      },
    },
  },
];

/* ───────────────── System prompt builder ───────────────── */

/**
 * Builds a system prompt with live dashboard context.
 */
export function buildSystemPrompt({ candidates = [], feedItems = [], heatmapData = null, pipelineRunning = false, proteinList = [] }) {
  const topCandidates = [...candidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => `${c.id} ${c.name} score=${c.score} target=${c.target} status=${c.status}`)
    .join("; ");

  const recentAlerts = feedItems
    .filter((f) => f.sourceType === "alert" || f.confidence < 80)
    .slice(0, 5)
    .map((f) => `[${f.sourceType}] ${f.message} (${f.confidence}%)`)
    .join("; ");

  const feedSummary = feedItems
    .slice(0, 5)
    .map((f) => `[${f.sourceType}] ${f.message}`)
    .join("; ");

  const proteinTargets = proteinList
    .map((p) => `${p.pdbId}: ${p.label}`)
    .join(", ");

  return `You are BioSentinel, an AI biosecurity analyst assistant embedded in a real-time biosurveillance dashboard.

ROLE: You help analysts monitor biological threats, analyze drug candidates, interpret protein structures, and run computational biology pipelines.

CAPABILITIES (via tools):
- Run the 5-stage analysis pipeline (Detect → Characterize → Design → Validate → Report) with configurable target protein and candidate count
- Initiate targeted scraping for specific pathogens, regions, or topics
- Suggest the best pipeline target based on current threat intelligence
- Search threat intelligence databases
- Fetch the latest intelligence report
- Refresh dashboard data panels
- Look up candidate compound details

AVAILABLE PROTEIN TARGETS: ${proteinTargets || "none loaded"}

THREAT-TO-PROTEIN MAPPING (use for suggest_pipeline_target):
- H5N1 / Influenza / Bird flu → 4NQJ (H5N1 Neuraminidase)
- Nipah / Henipavirus → 7L1F (Nipah G glycoprotein)
- Ebola / Ebolavirus → 5T6N (Ebola VP40 matrix protein)
- SARS-CoV-2 / COVID / Coronavirus → 6VMZ (Mpro), 7BV2 (Spike RBD), 6LU7 (Mpro + N3 inhibitor)
- Anthrax / Bacillus anthracis → 3I6G (Anthrax protective antigen)

WORKFLOW: When a user describes a threat, you should:
1. Use targeted_scrape to gather fresh intelligence
2. Use suggest_pipeline_target to recommend the right protein
3. Offer to run the pipeline with the recommended target
4. Execute run_pipeline with target_pdb and num_candidates if the user confirms

CURRENT DASHBOARD STATE:
- Pipeline: ${pipelineRunning ? "RUNNING" : "idle"}
- Candidates (${candidates.length} total, top 5): ${topCandidates || "none loaded"}
- Recent alerts: ${recentAlerts || "none"}
- Latest feed: ${feedSummary || "empty"}
${heatmapData ? `- Heatmap: ${heatmapData.items?.length || 0} compounds × ${heatmapData.variants?.length || 0} variants` : ""}

GUIDELINES:
- Be concise and technical. Analysts are domain experts.
- When asked to run tasks, use the available tools — don't just describe what to do.
- Provide actionable intelligence, not generic summaries.
- Reference specific candidate IDs, scores, and data points.
- If data looks stale or empty, suggest refreshing the dashboard.
- Format responses with bullet points and clear structure when appropriate.`;
}

/* ───────────────── API call ───────────────── */

/**
 * Send a chat message to Z.AI with conversation history and tools.
 *
 * @param {Array} messages — Full message history [{role, content}]
 * @returns {object|null} — { content, tool_calls } or null on failure
 */
export async function chatWithZAI(messages) {
  if (!ZAI_KEY) return null;

  try {
    const res = await fetch(ZAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZAI_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: TOOLS,
        temperature: 0.7,
        max_tokens: 4096,
        stream: false,
      }),
    });

    if (!res.ok) {
      console.warn(`[Z.AI] ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) return null;

    // glm-4.5 uses reasoning_content for chain-of-thought; fall back to it
    // if the model exhausted tokens on reasoning before producing content.
    const content = choice.message?.content
      || choice.message?.reasoning_content
      || null;

    return {
      content,
      tool_calls: choice.message?.tool_calls || null,
      finish_reason: choice.finish_reason,
    };
  } catch (err) {
    console.warn("[Z.AI] request failed:", err.message);
    return null;
  }
}

/**
 * Check if Z.AI is configured.
 */
export function isZAIConfigured() {
  return !!ZAI_KEY;
}

/* ───────────────── Protein summary generation ───────────────── */

/**
 * Generate an AI science summary for a protein structure.
 *
 * @param {object} params
 * @param {string} params.pdbId — PDB code
 * @param {object} params.pdbInfo — { label, residues, chains, mw, organism }
 * @param {object|null} params.analysisData — Amino Analytica data
 * @returns {object|null} — { overview, structure, binding, risks } or null
 */
export async function generateProteinSummary({ pdbId, pdbInfo, analysisData }) {
  if (!ZAI_KEY) return null;

  const meta = pdbInfo
    ? `Protein: ${pdbInfo.label} (PDB: ${pdbId}), Organism: ${pdbInfo.organism}, Residues: ${pdbInfo.residues}, Chains: ${pdbInfo.chains}, MW: ${pdbInfo.mw}`
    : `PDB: ${pdbId}`;

  let analysisContext = "";
  if (analysisData) {
    const { sasa, quality } = analysisData;
    const parts = [];
    if (sasa) parts.push(`SASA total=${sasa.totalSasa?.toFixed(1)}nm², avg=${sasa.avgSasa?.toFixed(2)}nm², max=${sasa.maxSasa?.toFixed(2)}nm²`);
    if (quality?.bfactor?.statistics) {
      const b = quality.bfactor.statistics;
      parts.push(`B-factor mean=${b.mean?.toFixed(1)}, max=${b.max?.toFixed(1)}, std=${b.std?.toFixed(1)}`);
    }
    if (quality?.ramachandran?.statistics) {
      const r = quality.ramachandran.statistics;
      parts.push(`Ramachandran favored=${r.favored_percent?.toFixed(1)}%, allowed=${r.allowed_percent?.toFixed(1)}%, outlier=${r.outlier_percent?.toFixed(1)}%`);
    }
    if (quality?.geometry) {
      parts.push(`Clashes: ${quality.geometry.clashCount}`);
    }
    if (quality?.bfactor?.flexibleRegions?.length > 0) {
      parts.push(`Flexible regions: ${quality.bfactor.flexibleRegions.map(r => `${r.resName}${r.resNum}`).join(", ")}`);
    }
    analysisContext = `\nAnalysis data: ${parts.join(". ")}`;
  }

  const prompt = `You are a structural biology expert. Analyze this protein and return a JSON object with exactly 4 keys: "overview", "structure", "binding", "risks". Each value should be a 2-4 sentence paragraph.

${meta}${analysisContext}

overview: What this protein is, its biological role, and why it matters.
structure: Key structural features, fold type, notable domains or motifs, quality assessment.
binding: Known binding sites, druggability, interaction surfaces, therapeutic relevance.
risks: Biosecurity considerations, mutation concerns, resistance potential.

Return ONLY valid JSON, no markdown fences, no extra text.`;

  try {
    const res = await fetch(ZAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZAI_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 2048,
        stream: false,
      }),
    });

    if (!res.ok) {
      console.warn(`[Z.AI summary] ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content
      || data.choices?.[0]?.message?.reasoning_content
      || null;
    if (!content) return null;

    // Strip markdown code fences if present
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(content);
    if (parsed.overview && parsed.structure && parsed.binding && parsed.risks) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn("[Z.AI summary] failed:", err.message);
    return null;
  }
}
