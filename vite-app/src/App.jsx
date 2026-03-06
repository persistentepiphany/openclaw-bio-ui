/**
 * App.jsx — BioSentinel Dashboard
 *
 * Main layout assembling all components:
 *   - Left sidebar: ActivityFeed with threat monitoring
 *   - Centre: MoleculeViewer + WorkflowStatus
 *   - Right sidebar: DataTable + Heatmap
 *   - Bottom: ChatInterface
 */

import { useState, useCallback, useRef, useEffect } from "react";
import MoleculeViewer from "./components/MoleculeViewer";
import {
  activityItems as initialActivities,
  systemStatus,
  dataItems,
  heatmapData,
  workflowSteps,
  initialStep,
  proteinList,
  generateFreshData,
} from "./data/mockData";
import "./App.css";

/* ═══════════════════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════════════════ */
const SourceIcons = {
  twitter: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  rss: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.5" fill="currentColor"/>
    </svg>
  ),
  lab: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M10 3v7l-5 9h14l-5-9V3"/>
    </svg>
  ),
  alert: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 20h20L12 2zM12 9v4M12 16h.01"/>
    </svg>
  ),
  sys: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6M9 12h6M9 15h3"/>
    </svg>
  ),
};

const sourceLabel = { twitter: "X/Twitter", rss: "RSS Feed", lab: "Lab", alert: "Alert", sys: "System" };

const sourceColor = {
  twitter: "#1d9bf0",
  rss: "#ff9f0a",
  lab: "#30d158",
  alert: "#ff453a",
  sys: "#86868b",
};

/* ═══════════════════════════════════════════════════════════════════
   INLINE SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

// ── Activity Feed (Left sidebar) ──
function ActivityFeed({ status, running, onRun, items }) {
  const confidenceColor = (c) => c >= 90 ? "#30d158" : c >= 70 ? "#ff9f0a" : "#ff453a";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-[#141414]">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#141414]">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium
          ${running ? "bg-[rgba(255,159,10,0.1)] text-[#ff9f0a]" : "bg-[rgba(48,209,88,0.1)] text-[#30d158]"}`}>
          <span className={`w-1.5 h-1.5 rounded-full bg-current ${running ? "animate-pulse-glow" : ""}`} />
          {running ? "Processing" : status.status}
        </span>
        <span className="font-mono text-xs font-medium text-[#f5f5f7]">
          {status.confidence}<span className="text-[10px] text-[#48484a]">%</span>
        </span>
      </div>

      <button
        onClick={onRun}
        disabled={running}
        className={`mx-4 mt-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-2
          ${running
            ? "bg-[#111] text-[#ff9f0a] border border-[#1c1c1c] cursor-default"
            : "bg-[#30d158] text-black border border-transparent cursor-pointer hover:opacity-90 active:scale-[0.98]"}`}
      >
        {running ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
              <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
            </svg>
            Running Pipeline…
          </>
        ) : (
          <>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4l16 8-16 8V4z"/>
            </svg>
            Run Pipeline
          </>
        )}
      </button>

      <div className="px-4 pt-4 pb-1 text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
        Threat Feed
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.map((a, i) => (
          <div
            key={`${a.timestamp}-${i}`}
            className={`flex gap-2.5 px-4 py-2 items-start hover:bg-[#161616] transition-colors cursor-default
              ${i === 0 ? "animate-fadeIn" : ""}`}
          >
            <div
              className="w-6 h-6 rounded-[5px] flex items-center justify-center flex-shrink-0"
              style={{
                background: `${sourceColor[a.source]}15`,
                color: sourceColor[a.source],
              }}
            >
              {SourceIcons[a.source] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-[#b0b0b5] leading-snug">{a.message}</div>
              <div className="flex items-center gap-2 mt-1 font-mono text-[9px] text-[#48484a]">
                <span>{a.timestamp}</span>
                <span className="text-[#2a2a2a]">|</span>
                <span style={{ color: sourceColor[a.source], opacity: 0.7 }}>
                  {sourceLabel[a.source]}
                </span>
                {a.confidence != null && a.confidence < 100 && (
                  <span
                    className="ml-auto px-1.5 py-px rounded-full text-[8px] font-medium"
                    style={{
                      color: confidenceColor(a.confidence),
                      background: `${confidenceColor(a.confidence)}15`,
                    }}
                  >
                    {a.confidence}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Workflow Status ──
function WorkflowStatus({ steps, currentStep, running }) {
  return (
    <div className="flex items-center justify-center py-3 px-5 border-t border-[#141414] bg-[#0a0a0a]">
      {steps.map((s, i) => {
        const done = i < currentStep;
        const active = i === currentStep && currentStep < steps.length;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center
                  font-mono text-[9px] font-medium transition-all duration-500
                  ${done ? "bg-[rgba(48,209,88,0.15)] text-[#30d158] border-[1.5px] border-[rgba(48,209,88,0.3)]"
                    : active ? "bg-[#30d158] text-black border-[1.5px] border-[#30d158]"
                    : "bg-[#111] text-[#48484a] border-[1.5px] border-[#1c1c1c]"}`}
                style={active && running ? { animation: "pulse 1.5s ease-in-out infinite" } : {}}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[9px] font-mono transition-colors duration-500
                ${active ? "text-[#30d158]" : done ? "text-[rgba(48,209,88,0.5)]" : "text-[#48484a]"}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-7 h-px mx-1.5 mb-4 transition-colors duration-500
                ${i < currentStep ? "bg-[rgba(48,209,88,0.3)]" : "bg-[#1c1c1c]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Data Table (Right sidebar, top) ──
function DataTable({ items, selectedId, onSelect, loading }) {
  const scoreColor = (v) => v >= 0.85 ? "#30d158" : v >= 0.65 ? "#86868b" : "#ff9f0a";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-3 pb-1 text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
        Candidates
      </div>

      {loading ? (
        <div className="px-3 pt-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-1 py-2">
              <div className="skeleton h-3 w-5 rounded" />
              <div className="skeleton h-3 rounded" style={{ width: `${50 + Math.random() * 30}%` }} />
              <div className="skeleton h-3 w-8 rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["#", "Candidate", "Score", ""].map((h, i) => (
                <th key={i} className={`px-4 py-1.5 font-mono text-[9px] font-medium text-[#48484a] uppercase tracking-wide
                  border-b border-[#141414] sticky top-0 bg-[#0a0a0a] z-10
                  ${i === 2 ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((d, i) => {
              const sel = d.id === selectedId;
              return (
                <tr
                  key={d.id}
                  onClick={() => onSelect(d.id)}
                  className={`cursor-pointer transition-all duration-200 animate-fadeIn
                    ${sel
                      ? "bg-[rgba(48,209,88,0.06)] border-l-2 border-l-[#30d158]"
                      : "hover:bg-[#161616] border-l-2 border-l-transparent"}`}
                >
                  <td className="px-4 py-1.5 font-mono text-[10px] text-[#48484a]">{i + 1}</td>
                  <td className="px-4 py-1.5">
                    <div className={`font-mono text-[11px] font-medium ${sel ? "text-[#30d158]" : "text-[#f5f5f7]"}`}>
                      {d.id}
                    </div>
                    <div className="font-mono text-[9px] text-[#48484a] mt-px">
                      {d.name}
                      {d.target && <span className="ml-1.5 text-[#5e5ce6] opacity-60">→{d.target}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-1.5 font-mono text-[11px] font-medium text-right" style={{ color: scoreColor(d.score) }}>
                    {d.score.toFixed(2)}
                  </td>
                  <td className="px-4 py-1.5 text-[11px] text-center" style={{ color: d.status === "pass" ? "#30d158" : "#ff9f0a", opacity: 0.7 }}>
                    {d.status === "pass" ? "✓" : "⚠"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Heatmap (Right sidebar, bottom) ──
function Heatmap({ data, loading }) {
  const [tooltip, setTooltip] = useState(null);

  const heatColor = (v) => {
    let r, g, b;
    if (v < 0.5) {
      const t = v * 2;
      r = Math.round(255 - 50 * t);
      g = Math.round(69 + 100 * t);
      b = Math.round(58 - 38 * t);
    } else {
      const t = (v - 0.5) * 2;
      r = Math.round(205 - 157 * t);
      g = Math.round(169 + 40 * t);
      b = Math.round(20 + 68 * t);
    }
    return `rgba(${r}, ${g}, ${b}, 0.55)`;
  };

  if (loading) {
    return (
      <div className="border-t border-[#141414]">
        <div className="px-4 pt-2.5 pb-1 text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
          Interaction Matrix
        </div>
        <div className="grid gap-[3px] px-4 pb-3" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="skeleton h-[26px] rounded-[3px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[#141414] relative">
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
        <span className="text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
          Interaction Matrix
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[7.5px] font-mono text-[#ff453a]">Low</span>
          <div className="w-10 h-1.5 rounded-full" style={{
            background: "linear-gradient(to right, rgba(255,69,58,0.6), rgba(255,159,10,0.6), rgba(48,209,88,0.6))"
          }} />
          <span className="text-[7.5px] font-mono text-[#30d158]">High</span>
        </div>
      </div>

      <div
        className="grid gap-[3px] px-4 pb-3"
        style={{ gridTemplateColumns: `48px repeat(${data.conditions.length}, 1fr)` }}
      >
        {/* Column headers */}
        <div />
        {data.conditions.map((c, i) => (
          <div key={i} className="text-center font-mono text-[8px] text-[#48484a] py-0.5 font-medium">{c}</div>
        ))}

        {/* Data rows */}
        {data.matrix.map((row, ri) => (
          <div key={ri} className="contents">
            <div className="font-mono text-[8px] text-[#48484a] flex items-center font-medium">
              {data.items?.[ri] || `R${ri + 1}`}
            </div>
            {row.map((v, ci) => (
              <div
                key={ci}
                className="rounded-[3px] h-[26px] flex items-center justify-center font-mono text-[9px] font-medium
                  cursor-default transition-all duration-200 hover:scale-110 hover:z-10"
                style={{
                  background: heatColor(v),
                  color: v > 0.65 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
                }}
                onMouseEnter={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 6,
                    item: data.items?.[ri] || `R${ri + 1}`,
                    condition: data.conditions[ci],
                    value: v,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                {v.toFixed(2)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none animate-fadeIn"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 shadow-2xl">
            <div className="text-[10px] font-mono text-[#86868b]">
              CLW-{tooltip.item} × {tooltip.condition}
            </div>
            <div className="text-[12px] font-mono font-bold mt-0.5" style={{
              color: tooltip.value >= 0.7 ? "#30d158" : tooltip.value >= 0.4 ? "#ff9f0a" : "#ff453a"
            }}>
              {tooltip.value.toFixed(3)}
            </div>
            <div className="text-[8px] text-[#48484a] mt-0.5">
              {tooltip.value >= 0.7 ? "Strong binding" : tooltip.value >= 0.4 ? "Moderate" : "Weak binding"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chat Interface (Bottom panel) ──
function ChatInterface({ tableData }) {
  const [msgs, setMsgs] = useState([
    { role: "sys", text: "BioSentinel v2.4 online. I can help with candidate analysis, binding scores, threat alerts, and pipeline status." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMsgs((p) => [...p, { role: "user", text: q }]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const l = q.toLowerCase();
      let r;

      if (l.includes("score") || l.includes("best") || l.includes("top")) {
        const top = [...tableData].sort((a, b) => b.score - a.score).slice(0, 3);
        r = `Top candidates: ${top.map(d => `${d.id} (${d.name}) at ${d.score.toFixed(2)}`).join(", ")}. All show strong binding affinity.`;
      } else if (l.includes("candidate") || l.includes("item")) {
        const passed = tableData.filter(d => d.status === "pass").length;
        r = `${tableData.length} candidates evaluated. ${passed} passed threshold, ${tableData.length - passed} flagged for review.`;
      } else if (l.includes("workflow") || l.includes("pipeline")) {
        r = "5-stage pipeline: Ingest → Validate → Analyze → Score → Report. Click 'Run Pipeline' to start a new analysis.";
      } else if (l.includes("protein") || l.includes("pdb") || l.includes("structure")) {
        r = "5 structures loaded: Crambin (1CRN), Hemoglobin (4HHB), Lysozyme (1LYZ), GFP (1EMA), Insulin (4INS). Select from the viewer dropdown.";
      } else if (l.includes("threat") || l.includes("alert")) {
        r = "2 active alerts: Unexpected mutation in run #312 (76% confidence) and elevated wastewater signal (71% confidence). Both under investigation.";
      } else if (l.includes("heatmap") || l.includes("variant") || l.includes("mutation")) {
        r = "Interaction matrix shows binding affinity across 4 variants (WT, D198N, H275Y, R292K). CLW-0234 shows strongest resistance to D198N mutation.";
      } else if (l.includes("help")) {
        r = "Try asking about: top candidates, pipeline status, active threats, variant analysis, or protein structures.";
      } else {
        r = "I can help with candidate scores, pipeline status, protein structures, threat alerts, or variant analysis. What would you like to know?";
      }

      setTyping(false);
      setMsgs((p) => [...p, { role: "sys", text: r }]);
    }, 600 + Math.random() * 500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-t border-[#141414]">
      <div className="flex items-center gap-2 px-5 py-1.5 border-b border-[#141414] font-mono text-[10px] text-[#48484a]">
        <span className="w-[5px] h-[5px] rounded-full bg-[#30d158] shadow-[0_0_4px_rgba(48,209,88,0.3)]" />
        Assistant
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-1.5">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[65%] px-3.5 py-2 rounded-xl text-xs leading-relaxed animate-fadeIn
              ${m.role === "user"
                ? "self-end bg-[#30d158] text-black rounded-br-sm"
                : "self-start bg-[#111] text-[#86868b] border border-[#1c1c1c] rounded-bl-sm"}`}
          >
            {m.text}
          </div>
        ))}
        {typing && (
          <div className="self-start bg-[#111] border border-[#1c1c1c] rounded-xl rounded-bl-sm px-4 py-3 flex gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedPdb, setSelectedPdb] = useState("1CRN");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setMolInfo] = useState(null);
  const [tableData, setTableData] = useState(dataItems);
  const [heatData, setHeatData] = useState(heatmapData);
  const [activities, setActivities] = useState(initialActivities);

  const runTimers = useRef([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => runTimers.current.forEach(clearTimeout);
  }, []);

  const handleRun = useCallback(() => {
    if (running) return;

    // Clear previous timers
    runTimers.current.forEach(clearTimeout);
    runTimers.current = [];

    setRunning(true);
    setLoading(true);
    setCurrentStep(0);
    setSelectedItem(null);

    const stepDelay = 700;
    const totalSteps = workflowSteps.length;

    for (let i = 1; i <= totalSteps; i++) {
      const t = setTimeout(() => {
        setCurrentStep(i);

        if (i === totalSteps) {
          // Pipeline complete — generate new data after a brief pause
          const finishTimer = setTimeout(() => {
            const fresh = generateFreshData();
            setTableData(fresh.items);
            setHeatData(fresh.heatmap);
            setLoading(false);
            setRunning(false);

            // Add a new activity entry
            setActivities((prev) => [
              {
                source: "sys",
                message: `Pipeline completed — ${fresh.items.length} candidates scored`,
                time: "just now",
                timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
                confidence: 100,
              },
              ...prev,
            ]);
          }, 500);
          runTimers.current.push(finishTimer);
        }
      }, stepDelay * i);
      runTimers.current.push(t);
    }
  }, [running]);

  const selectedCandidate = tableData.find((d) => d.id === selectedItem);

  return (
    <div
      className="w-screen h-screen bg-black grid overflow-hidden"
      style={{
        gridTemplateColumns: "248px 1fr 280px",
        gridTemplateRows: "44px 1fr 168px",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div className="col-span-3 bg-[#0a0a0a] flex items-center justify-between px-5 border-b border-[#141414]">
        <div className="flex items-center gap-2.5">
          <div className="w-[22px] h-[22px] rounded-[5px] bg-[#30d158] flex items-center justify-center text-[11px] font-semibold text-black">
            B
          </div>
          <span className="text-[13px] font-medium text-[#f5f5f7]">BioSentinel</span>
          <span className="font-mono text-[10px] text-[#48484a]">v2.4</span>
        </div>
        <div className="flex items-center gap-3.5">
          {running && (
            <span className="font-mono text-[9px] text-[#ff9f0a] animate-pulse-glow">
              PIPELINE ACTIVE
            </span>
          )}
          <span className="w-[5px] h-[5px] rounded-full bg-[#30d158] shadow-[0_0_6px_rgba(48,209,88,0.25)]" />
          <span className="font-mono text-[10px] text-[#48484a]">
            {new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* ── Left sidebar ── */}
      <ActivityFeed status={systemStatus} running={running} onRun={handleRun} items={activities} />

      {/* ── Centre: Viewer + Workflow ── */}
      <div className="flex flex-col overflow-hidden" style={{ background: "#030305" }}>
        <div className="flex-1 relative">
          {/* Protein viewer */}
          <MoleculeViewer
            selectedMoleculeId={selectedPdb}
            onLoad={setMolInfo}
          />

          {/* Protein selector (top-right) */}
          <div className="absolute top-2.5 right-2.5 z-20">
            <select
              value={selectedPdb}
              onChange={(e) => setSelectedPdb(e.target.value)}
              className="bg-[rgba(0,0,0,0.6)] backdrop-blur-lg border border-[rgba(255,255,255,0.06)]
                rounded-lg px-2.5 py-1.5 font-mono text-[10.5px] text-[#86868b] cursor-pointer outline-none"
              style={{ WebkitAppearance: "none" }}
            >
              {proteinList.map((p) => (
                <option key={p.pdbId} value={p.pdbId} style={{ background: "#111" }}>
                  {p.label} ({p.pdbId})
                </option>
              ))}
            </select>
          </div>

          {/* Selected candidate overlay */}
          {selectedCandidate && (
            <div className="absolute bottom-3 left-3 z-20 animate-fadeIn
              bg-[rgba(0,0,0,0.7)] backdrop-blur-xl border border-[rgba(48,209,88,0.15)] rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />
                <span className="font-mono text-[11px] font-medium text-[#30d158]">{selectedCandidate.id}</span>
                <span className="text-[10px] text-[#86868b]">{selectedCandidate.name}</span>
              </div>
              <div className="mt-1 text-[10px] text-[#48484a] font-mono">
                Binding affinity: <span className="text-[#f5f5f7] font-medium">{selectedCandidate.score.toFixed(2)}</span>
                <span className="mx-1.5 text-[#2a2a2a]">|</span>
                Target: <span className="text-[#5e5ce6]">{selectedCandidate.target}</span>
              </div>
            </div>
          )}
        </div>
        <WorkflowStatus steps={workflowSteps} currentStep={currentStep} running={running} />
      </div>

      {/* ── Right sidebar ── */}
      <div className="flex flex-col overflow-hidden bg-[#0a0a0a] border-l border-[#141414]">
        <DataTable items={tableData} selectedId={selectedItem} onSelect={setSelectedItem} loading={loading} />
        <Heatmap data={heatData} loading={loading} />
      </div>

      {/* ── Bottom: Chat ── */}
      <div className="col-span-3">
        <ChatInterface tableData={tableData} />
      </div>
    </div>
  );
}
