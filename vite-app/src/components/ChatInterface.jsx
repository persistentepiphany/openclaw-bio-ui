/**
 * ChatInterface.jsx — AI-powered biosecurity assistant panel.
 *
 * Uses Z.AI (GLM-5) with tool calling for real dashboard actions.
 * Falls back to keyword matching when Z.AI is unavailable.
 *
 * Props:
 *   candidates    – current candidate array
 *   feedItems     – current threat feed array
 *   heatmapData   – current heatmap data object
 *   pipelineRunning – boolean
 *   onRunPipeline – callback to trigger pipeline
 *   onRefreshData – callback to refresh all dashboard data
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { chatWithZAI, buildSystemPrompt, isZAIConfigured } from "../api/zai";
import { searchThreats, fetchReport } from "../api/client";

export default function ChatInterface({
  candidates,
  feedItems,
  heatmapData,
  pipelineRunning,
  onRunPipeline,
  onRefreshData,
}) {
  const [msgs, setMsgs] = useState([
    {
      role: "sys",
      text: isZAIConfigured()
        ? "BioSentinel AI assistant online. I can analyze candidates, search threats, run the pipeline, and generate reports. Ask me anything."
        : "BioSentinel v2.4 online. I can help with candidate analysis, binding scores, threat alerts, and pipeline status. Type 'help' for available commands.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  // Conversation history for Z.AI (system + user + assistant messages)
  const historyRef = useRef([]);

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
          onRunPipeline?.();
          return "Pipeline started successfully. The workflow indicator above shows progress through the 5 stages: Detect → Characterize → Design → Validate → Report.";
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
          // Try matching by ID or by index
          const byId = candidates.find(
            (c) => c.id.toLowerCase() === id.toLowerCase()
          );
          const byIdx = /^\d+$/.test(id) ? candidates[parseInt(id) - 1] : null;
          const c = byId || byIdx;
          if (!c) return `Candidate "${id}" not found. Available: ${candidates.map((c) => c.id).join(", ")}`;
          return `Candidate ${c.id} (${c.name}):\n• Binding score: ${c.score.toFixed(2)}\n• Target: ${c.target}\n• Status: ${c.status === "pass" ? "Passed validation" : "Flagged for review"}\n• PDB structure: ${c.pdb}`;
        }
        default:
          return `Unknown tool: ${name}`;
      }
    },
    [candidates, pipelineRunning, onRunPipeline, onRefreshData]
  );

  /* ── Z.AI chat with tool call loop ── */
  const runZAI = useCallback(
    async (userMessage) => {
      const systemPrompt = buildSystemPrompt({
        candidates,
        feedItems,
        heatmapData,
        pipelineRunning,
      });

      // Build message history for Z.AI
      const zaiMessages = [
        { role: "system", content: systemPrompt },
        ...historyRef.current,
        { role: "user", content: userMessage },
      ];

      // Tool call loop (max 3 iterations to prevent runaway)
      let currentMessages = zaiMessages;
      for (let i = 0; i < 3; i++) {
        const result = await chatWithZAI(currentMessages);
        if (!result) return null; // API failed

        // If there are tool calls, execute them and continue
        if (result.tool_calls && result.tool_calls.length > 0) {
          // Add assistant message with tool calls
          currentMessages = [
            ...currentMessages,
            {
              role: "assistant",
              content: result.content || "",
              tool_calls: result.tool_calls,
            },
          ];

          // Execute each tool and add results
          for (const tc of result.tool_calls) {
            const toolResult = await executeTool(tc);
            currentMessages = [
              ...currentMessages,
              {
                role: "tool",
                tool_call_id: tc.id,
                content: toolResult,
              },
            ];
          }
          // Continue loop — Z.AI will process tool results
          continue;
        }

        // No tool calls — we have the final response
        if (result.content) {
          // Update persistent history
          historyRef.current = [
            ...historyRef.current,
            { role: "user", content: userMessage },
            { role: "assistant", content: result.content },
          ];
          // Keep history bounded (last 20 exchanges)
          if (historyRef.current.length > 40) {
            historyRef.current = historyRef.current.slice(-40);
          }
          return result.content;
        }

        return null;
      }

      return null; // Exhausted iterations
    },
    [candidates, feedItems, heatmapData, pipelineRunning, executeTool]
  );

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

  /* ── Send message ── */
  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || typing) return;
    setMsgs((p) => [...p, { role: "user", text: q }]);
    setInput("");
    setTyping(true);

    // Try Z.AI first
    if (isZAIConfigured()) {
      const response = await runZAI(q);
      if (response) {
        setTyping(false);
        setMsgs((p) => [...p, { role: "sys", text: response }]);
        return;
      }
    }

    // Fallback: keyword matching
    setTimeout(() => {
      setTyping(false);
      setMsgs((p) => [...p, { role: "sys", text: getKeywordResponse(q) }]);
    }, 300 + Math.random() * 300);
  }, [input, typing, runZAI, getKeywordResponse]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-1.5 border-b border-[#141414]">
        <div className="flex items-center gap-2 font-mono text-[10px] text-[#48484a]">
          <span className="w-[5px] h-[5px] rounded-full bg-[#30d158] shadow-[0_0_4px_rgba(48,209,88,0.3)]" />
          Assistant
        </div>
        {isZAIConfigured() && (
          <span className="font-mono text-[8px] text-[#30d158] opacity-50">Z.AI</span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-1.5">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-3.5 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-line animate-fadeIn
              ${m.role === "user"
                ? "self-end bg-[#30d158] text-black rounded-br-sm"
                : "self-start bg-[#111] text-[#86868b] border border-[#1c1c1c] rounded-bl-sm"}`}
          >
            {m.text}
          </div>
        ))}

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
