/**
 * ChatInterface.jsx — AI-powered biosecurity assistant panel.
 *
 * Uses Z.AI (GLM-5) with tool calling for real dashboard actions.
 * Falls back to keyword matching when Z.AI is unavailable.
 * Suggestion chips are dynamically generated via Z.AI when available.
 *
 * Props:
 *   candidates       – current candidate array
 *   feedItems        – current threat feed array
 *   heatmapData      – current heatmap data object
 *   pipelineRunning  – boolean
 *   onRunPipeline    – callback to trigger pipeline
 *   onRefreshData    – callback to refresh all dashboard data
 *   onApplyScraperReport – callback
 *   proteinList      – effective protein list
 *   dashboardMode    – "demo" | "live"
 *   liveFlowStage    – null | "scraping" | ... | "complete"
 *   selectedProteins – array
 *   pipelineComplete – boolean
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { chatWithZAI, buildSystemPrompt, isZAIConfigured, generateSuggestions } from "../api/zai";
import { searchThreats, fetchReport, targetedScrape } from "../api/client";
import { downloadFile } from "../utils/download";
import { getThreatProteinMap } from "../utils/pathogenProteinMap";

/* ── Sentinel returned when interactive cards were rendered (no text bubble) ── */
const RENDERED_SENTINEL = "__BIOSENTINEL_RENDERED__";

/* ── ActionCards: renders 1-4 interactive action cards ── */
function ActionCards({ cards, context, onExecute, onOpenPipelineConfig }) {
  return (
    <div className="self-start animate-fadeIn" style={{ maxWidth: "90%", width: "100%" }}>
      {context && (
        <div style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", marginBottom: 6, paddingLeft: 2 }}>
          {context}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {cards.map((card, i) => (
          <div
            key={i}
            style={{
              background: "#111",
              border: "1px solid rgba(48,209,88,0.22)",
              borderRadius: 10,
              padding: "9px 12px",
            }}
          >
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "#30d158", fontWeight: 600, marginBottom: 3 }}>
              {card.label}
            </div>
            {card.description && (
              <div style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", marginBottom: 8, lineHeight: 1.5 }}>
                {card.description}
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => onExecute(card)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(48,209,88,0.35)",
                  background: "rgba(48,209,88,0.1)",
                  color: "#30d158",
                  fontFamily: "monospace",
                  fontSize: 9,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(48,209,88,0.2)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "rgba(48,209,88,0.1)")}
              >
                [Execute]
              </button>
              {card.action_type === "open_pipeline_config" && (
                <button
                  onClick={() => onOpenPipelineConfig?.(card.config || {})}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#86868b",
                    fontFamily: "monospace",
                    fontSize: 9,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                >
                  [Configure]
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── ClarificationCard: renders a question with clickable options ── */
function ClarificationCard({ question, options, onSelect }) {
  return (
    <div className="self-start animate-fadeIn" style={{ maxWidth: "85%" }}>
      <div
        style={{
          background: "#111",
          border: "1px solid rgba(255,159,10,0.22)",
          borderRadius: 10,
          padding: "9px 12px",
        }}
      >
        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#ff9f0a", marginBottom: 8, lineHeight: 1.4 }}>
          {question}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onSelect(opt)}
              style={{
                padding: "3px 10px",
                borderRadius: 6,
                border: "1px solid rgba(255,159,10,0.3)",
                background: "rgba(255,159,10,0.07)",
                color: "#ff9f0a",
                fontFamily: "monospace",
                fontSize: 9,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,159,10,0.18)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,159,10,0.07)")}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Default suggestion chips (fallback when Z.AI unavailable) ── */
const DEFAULT_CHIPS = [
  "Run Pipeline",
  "Search Nipah threats",
  "Analyze top candidate",
  "Explain H5N1 risk",
  "Scrape biosecurity news",
  "Dashboard status",
];

function getInitialMessage(mode) {
  if (mode === "live") {
    return "BioSentinel connected. Waiting for live data from Bio API and Scraper. Ask me to refresh the dashboard or run the pipeline.";
  }
  return isZAIConfigured()
    ? "BioSentinel AI assistant online. I can analyze candidates, search threats, run the pipeline, and generate reports. Ask me anything."
    : "BioSentinel v2.4 online. I can help with candidate analysis, binding scores, threat alerts, and pipeline status. Type 'help' for available commands.";
}

/* ── Threat-to-protein mapping for suggest_pipeline_target ── */
const THREAT_PROTEIN_MAP = getThreatProteinMap();

export default function ChatInterface({
  candidates,
  feedItems,
  heatmapData,
  pipelineRunning,
  onRunPipeline,
  onRefreshData,
  onApplyScraperReport,
  proteinList,
  dashboardMode,
  liveFlowStage,
  selectedProteins,
  pipelineComplete,
  onOpenReport,
  onOpenPipelineConfig,
  onOpenDesignTools,
}) {
  const [msgs, setMsgs] = useState([
    { role: "sys", text: getInitialMessage(dashboardMode) },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  const historyRef = useRef([]);

  /* ── Dynamic suggestion chips state ── */
  const [chips, setChips] = useState(DEFAULT_CHIPS);
  const [chipsLoading, setChipsLoading] = useState(false);

  /* ── Fetch dynamic suggestions ── */
  const refreshChips = useCallback(async () => {
    if (!isZAIConfigured()) return;
    setChipsLoading(true);
    const result = await generateSuggestions({
      dashboardMode,
      activities: feedItems,
      selectedProteins: selectedProteins || [],
      pipelineStatus: pipelineRunning ? "running" : pipelineComplete ? "complete" : "idle",
      liveFlowStage,
    });
    if (result) {
      setChips(result);
    }
    setChipsLoading(false);
  }, [dashboardMode, feedItems, selectedProteins, pipelineRunning, pipelineComplete, liveFlowStage]);

  /* ── Reset conversation on mode switch ── */
  useEffect(() => {
    historyRef.current = [];
    setMsgs([{ role: "sys", text: getInitialMessage(dashboardMode) }]);
    setChips(DEFAULT_CHIPS);
    refreshChips();
  }, [dashboardMode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Regenerate chips when significant context changes ── */
  const prevFlowStageRef = useRef(liveFlowStage);
  useEffect(() => {
    if (liveFlowStage !== prevFlowStageRef.current) {
      prevFlowStageRef.current = liveFlowStage;
      refreshChips();
    }
  }, [liveFlowStage, refreshChips]);

  // Regenerate when pipeline completes
  const prevCompleteRef = useRef(pipelineComplete);
  useEffect(() => {
    if (pipelineComplete && !prevCompleteRef.current) {
      refreshChips();
    }
    prevCompleteRef.current = pipelineComplete;
  }, [pipelineComplete, refreshChips]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [msgs, typing]);

  /* ── Execute a tool call from Z.AI ── */
  const executeTool = useCallback(
    async (toolCall) => {
      const name = toolCall.function?.name;
      let args = {};
      try {
        args = JSON.parse(toolCall.function?.arguments || "{}");
      } catch (_) {}

      switch (name) {
        case "run_pipeline": {
          if (pipelineRunning) return "Pipeline is already running. Please wait for it to complete.";
          const config = {};
          if (args.mode) config.mode = args.mode;
          if (args.target_pdb) config.targetPdb = args.target_pdb;
          if (args.num_candidates) config.numCandidates = args.num_candidates;
          onRunPipeline?.(config);
          return `Pipeline started${args.target_pdb ? ` targeting ${args.target_pdb}` : ""}${args.num_candidates ? ` with ${args.num_candidates} candidate(s)` : ""}. The workflow indicator above shows progress through the 5 stages: Detect → Characterize → Design → Validate → Report.`;
        }
        case "targeted_scrape": {
          const query = args.query || "";
          const context = args.context || "";
          const result = await targetedScrape(query, context);
          if (!result) return `Targeted scrape for "${query}" failed — scraper API unreachable. The scraper may be offline.`;
          await new Promise((r) => setTimeout(r, 5000));
          const freshReport = await fetchReport();
          if (freshReport && onApplyScraperReport) {
            onApplyScraperReport(freshReport);
          }
          const entryCount = freshReport?.entries?.length || result?.entries?.length || 0;
          return `Targeted scrape initiated for "${query}". ${entryCount > 0 ? `${entryCount} entries found and pushed to the threat feed.` : "Scraper is processing — results will appear in the feed shortly."} ${freshReport?.summary?.top_pathogen ? `Top pathogen: ${freshReport.summary.top_pathogen}` : ""}`;
        }
        case "suggest_pipeline_target": {
          const context = (args.threat_context || "").toLowerCase();
          let match = null;
          for (const [key, value] of Object.entries(THREAT_PROTEIN_MAP)) {
            if (context.includes(key)) {
              match = value;
              break;
            }
          }
          const relevantAlerts = feedItems
            .filter((f) => f.sourceType === "alert" || f.confidence < 80)
            .slice(0, 3)
            .map((f) => f.message)
            .join("; ");

          if (match) {
            return `Based on the threat context "${args.threat_context}", I recommend targeting **${match.pdbId}** (${match.label}) for pipeline analysis. This protein is directly relevant to the identified pathogen.${relevantAlerts ? `\n\nRecent related alerts: ${relevantAlerts}` : ""}\n\nShall I run the pipeline with target_pdb="${match.pdbId}"?`;
          }
          return `Could not find a specific protein target for "${args.threat_context}". Available targets: ${(proteinList || []).map((p) => `${p.pdbId} (${p.label})`).join(", ")}. Please specify which pathogen or protein you'd like to target.`;
        }
        case "search_threats": {
          const results = await searchThreats(args.query || "");
          if (!results) return `Threat search for "${args.query}" failed — scraper API unreachable.`;
          if (Array.isArray(results) && results.length === 0) return `No threats found matching "${args.query}".`;
          if (Array.isArray(results)) {
            return `Found ${results.length} result(s) for "${args.query}":\n${results
              .slice(0, 5)
              .map((r) => `• ${r.title || r.message || JSON.stringify(r)}`)
              .join("\n")}`;
          }
          return JSON.stringify(results, null, 2);
        }
        case "get_report": {
          const report = await fetchReport();
          if (!report) return "Could not fetch report — scraper API unreachable.";
          if (typeof report === "string") return report;
          return report.summary || report.content || JSON.stringify(report, null, 2);
        }
        case "refresh_dashboard": {
          onRefreshData?.();
          return "Dashboard data refresh initiated. Candidate table, heatmap, and threat feed will update momentarily.";
        }
        case "get_candidate_details": {
          const id = args.identifier;
          if (!id) return "No candidate identifier provided.";
          const byId = candidates.find(
            (c) => c.id.toLowerCase() === id.toLowerCase()
          );
          const byIdx = /^\d+$/.test(id) ? candidates[parseInt(id) - 1] : null;
          const c = byId || byIdx;
          if (!c) return `Candidate "${id}" not found. Available: ${candidates.map((c) => c.id).join(", ")}`;
          return `Candidate ${c.id} (${c.name}):\n• Binding score: ${c.score.toFixed(2)}\n• Target: ${c.target}\n• Status: ${c.status === "pass" ? "Passed validation" : "Flagged for review"}\n• PDB structure: ${c.pdb}`;
        }
        case "present_options": {
          const cards = Array.isArray(args.options) ? args.options : [];
          if (cards.length === 0) return "No options available for this action.";
          const context = args.context || "";
          setMsgs((p) => [...p, { role: "action_card", cards, context }]);
          return RENDERED_SENTINEL;
        }
        case "ask_clarification": {
          const question = args.question || "";
          const options = Array.isArray(args.options) ? args.options.filter(Boolean) : [];
          if (!question || options.length === 0) return "Clarification needed — please describe what you'd like to do.";
          setMsgs((p) => [...p, { role: "clarification", question, options }]);
          return RENDERED_SENTINEL;
        }
        case "open_pipeline_config": {
          const cfg = {
            ...(args.target_pdb ? { targetPdb: args.target_pdb } : {}),
            ...(args.num_candidates ? { numCandidates: args.num_candidates } : {}),
            ...(args.mode ? { mode: args.mode } : {}),
            ...(args.tasks ? { tasks: args.tasks } : {}),
          };
          onOpenPipelineConfig?.(cfg);
          return `Pipeline configuration panel opened with target ${args.target_pdb || "auto"}.`;
        }
        case "open_report_panel": {
          onOpenReport?.();
          return "Epidemiological report panel opened.";
        }
        case "open_design_tools": {
          onOpenDesignTools?.();
          return "Protein design tools panel opened.";
        }
        default:
          return `Unknown tool: ${name}`;
      }
    },
    [candidates, feedItems, pipelineRunning, onRunPipeline, onRefreshData, onApplyScraperReport, proteinList, onOpenReport, onOpenPipelineConfig, onOpenDesignTools]
  );

  /* ── Z.AI chat with tool call loop ── */
  const runZAI = useCallback(
    async (userMessage) => {
      const systemPrompt = buildSystemPrompt({
        candidates,
        feedItems,
        heatmapData,
        pipelineRunning,
        proteinList,
      });

      const zaiMessages = [
        { role: "system", content: systemPrompt },
        ...historyRef.current,
        { role: "user", content: userMessage },
      ];

      let currentMessages = zaiMessages;
      for (let i = 0; i < 4; i++) {
        const result = await chatWithZAI(currentMessages);
        if (!result) return null;

        if (result.tool_calls && result.tool_calls.length > 0) {
          currentMessages = [
            ...currentMessages,
            {
              role: "assistant",
              content: result.content || "",
              tool_calls: result.tool_calls,
            },
          ];

          let hasInteractive = false;
          for (const tc of result.tool_calls) {
            const toolResult = await executeTool(tc);
            if (toolResult === RENDERED_SENTINEL) hasInteractive = true;
            currentMessages = [
              ...currentMessages,
              {
                role: "tool",
                tool_call_id: tc.id,
                content: toolResult === RENDERED_SENTINEL ? "Interactive cards rendered to user." : (toolResult || ""),
              },
            ];
          }
          if (hasInteractive) return RENDERED_SENTINEL;
          continue;
        }

        if (result.content) {
          historyRef.current = [
            ...historyRef.current,
            { role: "user", content: userMessage },
            { role: "assistant", content: result.content },
          ];
          if (historyRef.current.length > 40) {
            historyRef.current = historyRef.current.slice(-40);
          }
          return result.content;
        }

        return null;
      }

      return null;
    },
    [candidates, feedItems, heatmapData, pipelineRunning, proteinList, executeTool]
  );

  /* ── Execute an action card when user clicks [Execute] ── */
  const executeAction = useCallback(async (card) => {
    const { action_type, config = {} } = card;
    let confirmMsg = "";

    switch (action_type) {
      case "run_pipeline":
        if (pipelineRunning) {
          confirmMsg = "Pipeline is already running. Please wait for it to complete.";
        } else {
          onRunPipeline?.(config);
          confirmMsg = `Pipeline started${config.targetPdb ? ` targeting ${config.targetPdb}` : ""}${config.numCandidates ? ` with ${config.numCandidates} candidate(s)` : ""}.`;
        }
        break;
      case "open_pipeline_config":
        onOpenPipelineConfig?.(config);
        confirmMsg = "Pipeline configuration panel opened.";
        break;
      case "open_report":
        onOpenReport?.();
        confirmMsg = "Epidemiological report panel opened.";
        break;
      case "open_design_tools":
        onOpenDesignTools?.();
        confirmMsg = "Protein design tools panel opened.";
        break;
      case "search_threats": {
        const results = await searchThreats(config.query || "");
        if (Array.isArray(results) && results.length > 0) {
          confirmMsg = `Found ${results.length} result(s) for "${config.query}":\n${results.slice(0, 5).map((r) => `• ${r.title || r.message || JSON.stringify(r)}`).join("\n")}`;
        } else {
          confirmMsg = results === null
            ? `Threat search for "${config.query}" failed — scraper API unreachable.`
            : `No threats found matching "${config.query}".`;
        }
        break;
      }
      case "targeted_scrape": {
        const result = await targetedScrape(config.query || "", config.context || "");
        confirmMsg = result
          ? `Targeted scrape initiated for "${config.query}". Results will appear in the feed shortly.`
          : `Scrape for "${config.query}" failed — scraper API unreachable.`;
        break;
      }
      default:
        confirmMsg = `Action "${action_type}" triggered.`;
    }

    if (confirmMsg) {
      setMsgs((p) => [...p, { role: "sys", text: confirmMsg }]);
    }
  }, [pipelineRunning, onRunPipeline, onOpenPipelineConfig, onOpenReport, onOpenDesignTools]);

  /* ── Keyword matching fallback ── */
  const getKeywordResponse = useCallback(
    (q) => {
      const l = q.toLowerCase();
      const candidateMatch = l.match(/candidate\s*#?\s*(\d+)/);

      if (l.includes("help")) {
        return "Available commands:\n• 'top candidates' — highest-scoring candidates\n• 'candidate N' — details for candidate N\n• 'threats' / 'alerts' — active threat alerts\n• 'variants' / 'heatmap' — variant analysis summary\n• 'pipeline' / 'workflow' — pipeline status\n• 'protein' / 'structure' — loaded structures";
      } else if (candidateMatch) {
        const idx = parseInt(candidateMatch[1]) - 1;
        if (idx >= 0 && idx < candidates.length) {
          const c = candidates[idx];
          return `Candidate ${idx + 1}: ${c.id} (${c.name})\nScore: ${c.score.toFixed(2)} | Target: ${c.target} | Status: ${c.status === "pass" ? "Passed" : "Flagged for review"}`;
        }
        return `Candidate ${idx + 1} not found. We have ${candidates.length} candidates (1–${candidates.length}).`;
      } else if (l.includes("score") || l.includes("best") || l.includes("top")) {
        const top = [...candidates]
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        return `Top candidates:\n${top.map((d, i) => `${i + 1}. ${d.id} (${d.name}) — ${d.score.toFixed(2)}`).join("\n")}\nAll show strong binding affinity.`;
      } else if (l.includes("threat") || l.includes("alert")) {
        const alerts = feedItems.filter(
          (f) => f.sourceType === "alert" || (f.confidence < 80 && f.confidence > 0)
        );
        if (alerts.length > 0) {
          return `${alerts.length} active alerts:\n${alerts.slice(0, 3).map((a) => `• ${a.message} (${a.confidence}% confidence)`).join("\n")}`;
        }
        return "No active threat alerts. All systems nominal.";
      } else if (l.includes("variant") || l.includes("mutation") || l.includes("heatmap")) {
        return "Interaction matrix: 5 candidates × 4 variants (WT, D198N, H275Y, R292K). CLW-0234 shows strongest resistance to D198N mutation. View the heatmap panel for details.";
      } else if (l.includes("workflow") || l.includes("pipeline")) {
        return "5-stage pipeline: Detect → Characterize → Design → Validate → Report. Click 'Run Pipeline' to start a new analysis.";
      } else if (l.includes("protein") || l.includes("pdb") || l.includes("structure")) {
        return "5 structures loaded: Crambin (1CRN), Hemoglobin (4HHB), Lysozyme (1LYZ), GFP (1EMA), Insulin (4INS). Select from the viewer dropdown.";
      }
      return "I can help with candidate scores, pipeline status, protein structures, threat alerts, or variant analysis. Type 'help' for commands.";
    },
    [candidates, feedItems]
  );

  /* ── Send message (core logic) ── */
  const sendMessage = useCallback(async (text) => {
    const q = text.trim();
    if (!q || typing) return;
    setMsgs((p) => [...p, { role: "user", text: q }]);
    setInput("");
    setTyping(true);

    // Try Z.AI first
    if (isZAIConfigured()) {
      const response = await runZAI(q);
      if (response === RENDERED_SENTINEL) {
        // Interactive cards were rendered — no text bubble needed
        setTyping(false);
        return;
      }
      if (response) {
        setTyping(false);
        setMsgs((p) => [...p, { role: "sys", text: response }]);
        // Regenerate chips after each AI response
        refreshChips();
        return;
      }
    }

    // Fallback: keyword matching
    setTimeout(() => {
      setTyping(false);
      setMsgs((p) => [...p, { role: "sys", text: getKeywordResponse(q) }]);
    }, 300 + Math.random() * 300);
  }, [typing, runZAI, getKeywordResponse, refreshChips]);

  const send = useCallback(() => sendMessage(input), [input, sendMessage]);

  /* ── Chat download ── */
  const handleDownloadChat = useCallback(() => {
    const lines = msgs.map((m) => {
      if (m.role === "action_card") return `[BioSentinel] [Action Cards] ${m.context || ""}\n${(m.cards || []).map((c) => `  • ${c.label}: ${c.description || ""}`).join("\n")}`;
      if (m.role === "clarification") return `[BioSentinel] [Question] ${m.question}\n  Options: ${(m.options || []).join(", ")}`;
      return `[${m.role === "user" ? "You" : "BioSentinel"}] ${m.text}`;
    });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadFile(`biosentinel_chat_${timestamp}.txt`, lines.join("\n\n"), "text/plain");
  }, [msgs]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-1.5 border-b border-[#141414]">
        <div className="flex items-center gap-2 font-mono text-[10px] text-[#48484a]">
          <span className="w-[5px] h-[5px] rounded-full bg-[#30d158] shadow-[0_0_4px_rgba(48,209,88,0.3)]" />
          Assistant
        </div>
        <div className="flex items-center gap-2">
          {isZAIConfigured() && (
            <span className="font-mono text-[8px] text-[#30d158] opacity-50">Z.AI</span>
          )}
          <button
            onClick={handleDownloadChat}
            title="Download chat transcript"
            className="border-none bg-transparent cursor-pointer p-0.5 text-[#48484a] hover:text-[#86868b] transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-1.5">
        {msgs.map((m, i) => {
          if (m.role === "action_card") {
            return (
              <ActionCards
                key={i}
                cards={m.cards}
                context={m.context}
                onExecute={executeAction}
                onOpenPipelineConfig={onOpenPipelineConfig}
              />
            );
          }
          if (m.role === "clarification") {
            return (
              <ClarificationCard
                key={i}
                question={m.question}
                options={m.options}
                onSelect={sendMessage}
              />
            );
          }
          return (
            <div
              key={i}
              className={`max-w-[80%] px-3.5 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-line animate-fadeIn
                ${m.role === "user"
                  ? "self-end bg-[#30d158] text-black rounded-br-sm"
                  : "self-start bg-[#111] text-[#86868b] border border-[#1c1c1c] rounded-bl-sm"}`}
            >
              {m.text}
            </div>
          );
        })}

        {/* Typing indicator */}
        {typing && (
          <div className="self-start bg-[#111] border border-[#1c1c1c] rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="ml-2 font-mono text-[9px] text-[#48484a]">thinking</span>
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      {!typing && (
        <div
          className="flex gap-1.5 px-5 py-1 overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {chipsLoading ? (
            // Loading shimmer
            Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  width: 70 + i * 10,
                  height: 22,
                  borderRadius: 20,
                  background: "rgba(48,209,88,0.04)",
                  border: "1px solid rgba(48,209,88,0.1)",
                  animation: "pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                  flexShrink: 0,
                }}
              />
            ))
          ) : (
            chips.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: "1px solid rgba(48,209,88,0.25)",
                  background: "rgba(48,209,88,0.06)",
                  color: "#30d158",
                  fontFamily: "monospace",
                  fontSize: 9,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(48,209,88,0.15)";
                  e.currentTarget.style.borderColor = "rgba(48,209,88,0.4)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(48,209,88,0.06)";
                  e.currentTarget.style.borderColor = "rgba(48,209,88,0.25)";
                }}
              >
                {chip}
              </button>
            ))
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 px-5 py-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about candidates, threats, run pipeline…"
          disabled={typing}
          className="flex-1 bg-[#111] border border-[#1c1c1c] rounded-[10px] px-3.5 py-2
            text-xs text-[#f5f5f7] outline-none focus:border-[rgba(48,209,88,0.25)] transition-colors
            disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={typing}
          className="w-[34px] h-[34px] rounded-[10px] bg-[#30d158] flex items-center justify-center
            cursor-pointer hover:opacity-90 active:scale-95 transition-all border-none
            disabled:opacity-50 disabled:cursor-default"
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24"
            fill="none" stroke="black" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
