/**
 * ChatInterface.jsx — Bottom chat panel with simulated AI responses.
 *
 * Features:
 *   - Typing indicator (three animated dots) while the bot is "thinking".
 *   - Context-aware keyword matching using live candidate/feed data.
 *   - Auto-scrolls to the bottom on new messages.
 *
 * Props:
 *   candidates – current candidate array (live data after pipeline runs)
 *   feedItems  – current threat feed array
 */
import { useState, useRef, useEffect } from "react";

export default function ChatInterface({ candidates, feedItems }) {
  const [msgs, setMsgs] = useState([
    {
      role: "sys",
      text: "BioSentinel v2.4 online. I can help with candidate analysis, binding scores, threat alerts, and pipeline status. Type 'help' for available commands.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll on new messages or when typing indicator appears
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [msgs, typing]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMsgs((p) => [...p, { role: "user", text: q }]);
    setInput("");
    setTyping(true);

    // Simulate response delay
    setTimeout(() => {
      const l = q.toLowerCase();
      let r;

      // Match "candidate N" or "candidate #N"
      const candidateMatch = l.match(/candidate\s*#?\s*(\d+)/);

      if (l.includes("help")) {
        r =
          "Available commands:\n• 'top candidates' — highest-scoring candidates\n• 'candidate N' — details for candidate N\n• 'threats' / 'alerts' — active threat alerts\n• 'variants' / 'heatmap' — variant analysis summary\n• 'pipeline' / 'workflow' — pipeline status\n• 'protein' / 'structure' — loaded structures";
      } else if (candidateMatch) {
        const idx = parseInt(candidateMatch[1]) - 1;
        if (idx >= 0 && idx < candidates.length) {
          const c = candidates[idx];
          r = `Candidate ${idx + 1}: ${c.id} (${c.name})\nScore: ${c.score.toFixed(2)} | Target: ${c.target} | Status: ${c.status === "pass" ? "Passed" : "Flagged for review"}`;
        } else {
          r = `Candidate ${idx + 1} not found. We have ${candidates.length} candidates (1–${candidates.length}).`;
        }
      } else if (l.includes("score") || l.includes("best") || l.includes("top")) {
        const top = [...candidates]
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        r = `Top candidates:\n${top.map((d, i) => `${i + 1}. ${d.id} (${d.name}) — ${d.score.toFixed(2)}`).join("\n")}\nAll show strong binding affinity.`;
      } else if (l.includes("threat") || l.includes("alert")) {
        const alerts = feedItems.filter(
          (f) => f.sourceType === "alert" || (f.confidence < 80 && f.confidence > 0)
        );
        if (alerts.length > 0) {
          r = `${alerts.length} active alerts:\n${alerts.slice(0, 3).map((a) => `• ${a.message} (${a.confidence}% confidence)`).join("\n")}`;
        } else {
          r = "No active threat alerts. All systems nominal.";
        }
      } else if (l.includes("variant") || l.includes("mutation") || l.includes("heatmap")) {
        r =
          "Interaction matrix: 5 candidates × 4 variants (WT, D198N, H275Y, R292K). CLW-0234 shows strongest resistance to D198N mutation. View the heatmap panel for details.";
      } else if (l.includes("workflow") || l.includes("pipeline")) {
        r =
          "5-stage pipeline: Detect → Characterize → Design → Validate → Report. Click 'Run Pipeline' to start a new analysis.";
      } else if (l.includes("protein") || l.includes("pdb") || l.includes("structure")) {
        r =
          "5 structures loaded: Crambin (1CRN), Hemoglobin (4HHB), Lysozyme (1LYZ), GFP (1EMA), Insulin (4INS). Select from the viewer dropdown.";
      } else {
        r =
          "I can help with candidate scores, pipeline status, protein structures, threat alerts, or variant analysis. Type 'help' for commands.";
      }

      setTyping(false);
      setMsgs((p) => [...p, { role: "sys", text: r }]);
    }, 600 + Math.random() * 500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-1.5 border-b border-[#141414] font-mono text-[10px] text-[#48484a]">
        <span className="w-[5px] h-[5px] rounded-full bg-[#30d158] shadow-[0_0_4px_rgba(48,209,88,0.3)]" />
        Assistant
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-1.5">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[65%] px-3.5 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-line animate-fadeIn
              ${m.role === "user"
                ? "self-end bg-[#30d158] text-black rounded-br-sm"
                : "self-start bg-[#111] text-[#86868b] border border-[#1c1c1c] rounded-bl-sm"}`}
          >
            {m.text}
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div className="self-start bg-[#111] border border-[#1c1c1c] rounded-xl rounded-bl-sm px-4 py-3 flex gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 px-5 py-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about candidates, threats, variants…"
          className="flex-1 bg-[#111] border border-[#1c1c1c] rounded-[10px] px-3.5 py-2
            text-xs text-[#f5f5f7] outline-none focus:border-[rgba(48,209,88,0.25)] transition-colors"
        />
        <button
          onClick={send}
          className="w-[34px] h-[34px] rounded-[10px] bg-[#30d158] flex items-center justify-center
            cursor-pointer hover:opacity-90 active:scale-95 transition-all border-none"
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
