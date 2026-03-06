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
        },
        required: [],
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
export function buildSystemPrompt({ candidates = [], feedItems = [], heatmapData = null, pipelineRunning = false }) {
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

  return `You are BioSentinel, an AI biosecurity analyst assistant embedded in a real-time biosurveillance dashboard.

ROLE: You help analysts monitor biological threats, analyze drug candidates, interpret protein structures, and run computational biology pipelines.

CAPABILITIES (via tools):
- Run the 5-stage analysis pipeline (Detect → Characterize → Design → Validate → Report)
- Search threat intelligence databases
- Fetch the latest intelligence report
- Refresh dashboard data panels
- Look up candidate compound details

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
