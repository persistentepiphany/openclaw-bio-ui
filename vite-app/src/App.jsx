/**
 * App.jsx — BioSentinel Dashboard
 *
 * Main layout assembling all components:
 *   - Left sidebar: ActivityFeed with system status
 *   - Centre: MoleculeViewer + WorkflowStatus
 *   - Right sidebar: DataTable + Heatmap
 *   - Bottom: ChatInterface
 *
 * Global state managed via React hooks.
 */

import { useState, useCallback } from "react";
import MoleculeViewer from "./components/MoleculeViewer";
import {
  activityItems,
  systemStatus,
  dataItems,
  heatmapData,
  workflowSteps,
  initialStep,
  proteinList,
} from "./data/mockData";

/* ═══════════════════════════════════════════════════════════════════
   INLINE SUB-COMPONENTS
   (In a full project, split these into separate files under
    src/components/. Kept inline here for the demo.)
   ═══════════════════════════════════════════════════════════════════ */

// ── Activity Feed (Left sidebar) ──
function ActivityFeed({ status, running, onRun }) {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-[#141414]">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#141414]">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium
          ${running ? "bg-[rgba(255,159,10,0.1)] text-[#ff9f0a]" : "bg-[rgba(48,209,88,0.1)] text-[#30d158]"}`}>
          <span className="w-1 h-1 rounded-full bg-current" />
          {running ? "Running" : status.status}
        </span>
        <span className="font-mono text-xs font-medium text-[#f5f5f7]">
          {status.confidence}<span className="text-[10px] text-[#48484a]">%</span>
        </span>
      </div>

      <button
        onClick={onRun}
        disabled={running}
        className={`mx-4 mt-2 py-1.5 rounded-lg text-[11.5px] font-medium transition-all
          ${running
            ? "bg-[#111] text-[#30d158] border border-[#1c1c1c] cursor-default"
            : "bg-[#30d158] text-black border border-transparent cursor-pointer hover:opacity-90"}`}
      >
        {running ? "Running…" : "Run Workflow"}
      </button>

      <div className="px-4 pt-3 pb-1 text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
        Activity
      </div>

      <div className="flex-1 overflow-y-auto">
        {activityItems.map((a, i) => (
          <div
            key={i}
            className="flex gap-2.5 px-4 py-2 items-start hover:bg-[#161616] transition-colors cursor-default"
          >
            <div className={`w-6 h-6 rounded-[5px] flex items-center justify-center flex-shrink-0 text-[10px]
              ${a.source === "alert" ? "bg-[rgba(255,159,10,0.1)] text-[#ff9f0a]" : "bg-[#111] text-[#48484a]"}`}>
              {a.source === "lab" ? "◉" : a.source === "alert" ? "△" : "⊡"}
            </div>
            <div>
              <div className="text-[11.5px] text-[#86868b] leading-snug">{a.message}</div>
              <div className="flex gap-2 mt-0.5 font-mono text-[9.5px] text-[#48484a]">
                <span>{a.time}</span>
                {a.location && <span className="text-[#30d158] opacity-60">{a.location}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Workflow Status ──
function WorkflowStatus({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center py-2.5 px-5 border-t border-[#141414] bg-[#0a0a0a]">
      {steps.map((s, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center
                font-mono text-[9px] font-medium transition-all duration-300
                ${done ? "bg-[rgba(48,209,88,0.1)] text-[#30d158] border-[1.5px] border-[rgba(48,209,88,0.25)]"
                  : active ? "bg-[#30d158] text-black border-[1.5px] border-[#30d158] shadow-[0_0_8px_rgba(48,209,88,0.2)]"
                  : "bg-[#111] text-[#48484a] border-[1.5px] border-[#1c1c1c]"}`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[9px] font-mono ${active ? "text-[#30d158]" : done ? "text-[rgba(48,209,88,0.5)]" : "text-[#48484a]"}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-7 h-px mx-1 mb-4 ${i < currentStep ? "bg-[rgba(48,209,88,0.2)]" : "bg-[#1c1c1c]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Data Table (Right sidebar, top) ──
function DataTable({ items, selectedId, onSelect }) {
  const scoreColor = (v) => v >= 0.85 ? "#30d158" : v >= 0.65 ? "#86868b" : "#ff9f0a";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-3 pb-1 text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">Items</div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["#", "ID", "Score", ""].map((h, i) => (
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
                className={`cursor-pointer transition-colors
                  ${sel ? "bg-[rgba(48,209,88,0.06)]" : "hover:bg-[#161616]"}`}
              >
                <td className="px-4 py-1.5 font-mono text-[10px] text-[#48484a]">{i + 1}</td>
                <td className={`px-4 py-1.5 font-mono text-[11px] font-medium ${sel ? "text-[#30d158]" : "text-[#f5f5f7]"}`}>
                  {d.id}
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
    </div>
  );
}

// ── Heatmap (Right sidebar, bottom) ──
function Heatmap({ data }) {
  const bgColor = (v) => {
    const r = Math.round(20 + 160 * (1 - v));
    const g = Math.round(40 + 140 * v);
    return `rgba(${r},${g},50,0.45)`;
  };

  return (
    <div className="border-t border-[#141414]">
      <div className="px-4 pt-2.5 pb-1 text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">Heatmap</div>
      <div
        className="grid gap-0.5 px-4 pb-3"
        style={{ gridTemplateColumns: `42px repeat(${data.conditions.length}, 1fr)` }}
      >
        <div />
        {data.conditions.map((c, i) => (
          <div key={i} className="text-center font-mono text-[8.5px] text-[#48484a] py-0.5">{c}</div>
        ))}
        {data.matrix.map((row, ri) => (
          <div key={ri} className="contents">
            <div className="font-mono text-[8.5px] text-[#48484a] flex items-center">
              {data.items?.[ri] || `R${ri + 1}`}
            </div>
            {row.map((v, ci) => (
              <div
                key={ci}
                className="rounded-[3px] h-[26px] flex items-center justify-center font-mono text-[9px] font-medium
                  cursor-default transition-transform hover:scale-110"
                style={{
                  background: bgColor(v),
                  color: v > 0.7 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
                }}
                title={`${data.items?.[ri] || `R${ri + 1}`} × ${data.conditions[ci]}: ${v.toFixed(3)}`}
              >
                {v.toFixed(2)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chat Interface (Bottom panel) ──
function ChatInterface() {
  const [msgs, setMsgs] = useState([
    { role: "sys", text: "BioSentinel assistant ready. Ask about proteins, scores, or workflow." },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMsgs((p) => [...p, { role: "user", text: q }]);
    setInput("");

    // Simple keyword-based response simulation
    setTimeout(() => {
      const l = q.toLowerCase();
      let r = "I can help with proteins, scores, items, or workflow status.";
      if (l.includes("score")) r = "ITEM001 leads at 0.97. Three items above 0.90.";
      else if (l.includes("item")) r = "8 items total. 5 passed, 3 flagged for review.";
      else if (l.includes("workflow")) r = "5-step pipeline: Ingest → Validate → Analyze → Score → Report.";
      else if (l.includes("protein") || l.includes("pdb")) r = "5 proteins loaded: Crambin, Hemoglobin, Lysozyme, GFP, Insulin. Select from the dropdown.";
      setMsgs((p) => [...p, { role: "sys", text: r }]);
    }, 400);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-t border-[#141414]">
      <div className="flex items-center gap-2 px-5 py-1.5 border-b border-[#141414] font-mono text-[10px] text-[#48484a]">
        <span className="w-[5px] h-[5px] rounded-full bg-[#30d158] shadow-[0_0_4px_rgba(48,209,88,0.3)]" />
        Assistant
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-1.5">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[65%] px-3.5 py-2 rounded-xl text-xs leading-relaxed
              ${m.role === "user"
                ? "self-end bg-[#30d158] text-black rounded-br-sm"
                : "self-start bg-[#111] text-[#86868b] border border-[#1c1c1c] rounded-bl-sm"}`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-5 py-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about proteins, scores, workflow…"
          className="flex-1 bg-[#111] border border-[#1c1c1c] rounded-[10px] px-3.5 py-2
            text-xs text-[#f5f5f7] outline-none focus:border-[rgba(48,209,88,0.25)] transition-colors"
        />
        <button
          onClick={send}
          className="w-[34px] h-[34px] rounded-[10px] bg-[#30d158] flex items-center justify-center
            cursor-pointer hover:opacity-90 transition-opacity border-none"
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
  const [molInfo, setMolInfo] = useState(null);

  const handleRun = useCallback(() => {
    setRunning(true);
    setCurrentStep((s) => Math.min(s + 1, workflowSteps.length - 1));
    setTimeout(() => setRunning(false), 1400);
  }, []);

  return (
    <div className="w-screen h-screen bg-black grid overflow-hidden"
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
          <span className="w-[5px] h-[5px] rounded-full bg-[#30d158] shadow-[0_0_6px_rgba(48,209,88,0.25)]" />
          <span className="font-mono text-[10px] text-[#48484a]">
            {new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* ── Left sidebar ── */}
      <ActivityFeed status={systemStatus} running={running} onRun={handleRun} />

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
        </div>
        <WorkflowStatus steps={workflowSteps} currentStep={currentStep} />
      </div>

      {/* ── Right sidebar ── */}
      <div className="flex flex-col overflow-hidden bg-[#0a0a0a] border-l border-[#141414]">
        <DataTable items={dataItems} selectedId={selectedItem} onSelect={setSelectedItem} />
        <Heatmap data={heatmapData} />
      </div>

      {/* ── Bottom: Chat ── */}
      <div className="col-span-3">
        <ChatInterface />
      </div>
    </div>
  );
}
