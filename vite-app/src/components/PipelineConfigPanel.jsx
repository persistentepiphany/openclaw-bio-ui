/**
 * PipelineConfigPanel.jsx — Pipeline configuration modal with tool-specific
 * toggles, time estimates, progress tracking, and task tracker.
 *
 * Props:
 *   proteinList     – array of { pdbId, label }
 *   selectedPdb     – currently selected PDB ID (default target)
 *   running         – boolean, pipeline currently executing
 *   pipelineMode    – "mock" | "real"
 *   currentStep     – current pipeline step index (for progress)
 *   totalSteps      – total pipeline steps
 *   onRun           – callback(config) to start pipeline with full config
 *   onClose         – callback to close the panel
 */
import { useState, useMemo } from "react";
import { toolCatalog } from "../data/mockDesignData";

/* ── Pipeline task definitions ── */
const PIPELINE_TASKS = [
  {
    id: "epitope",
    label: "Epitope Detection",
    description: "Identify antigenic epitopes on target protein surface",
    estimatedMin: 30,
    icon: "🎯",
    color: "#ff9f0a",
    group: "analysis",
  },
  {
    id: "sasa",
    label: "SASA Analysis",
    description: "Compute solvent-accessible surface area per residue",
    estimatedMin: 15,
    icon: "💧",
    color: "#5e5ce6",
    group: "analysis",
  },
  {
    id: "rfdiffusion",
    label: "RFdiffusion",
    description: "Generative backbone design via denoising diffusion",
    estimatedMin: 180,
    icon: "🧬",
    color: "#5e5ce6",
    group: "design",
  },
  {
    id: "proteinmpnn",
    label: "ProteinMPNN",
    description: "Sequence design for fixed backbones",
    estimatedMin: 45,
    icon: "🔤",
    color: "#30d158",
    group: "design",
  },
  {
    id: "boltz2",
    label: "Boltz-2",
    description: "Structure prediction with pLDDT + PAE scoring",
    estimatedMin: 120,
    icon: "🔮",
    color: "#ff9f0a",
    group: "validation",
  },
  {
    id: "biosecurity",
    label: "Biosecurity Screen",
    description: "Check against biosecurity risk databases",
    estimatedMin: 10,
    icon: "🛡️",
    color: "#ff453a",
    group: "validation",
  },
];

const GROUP_LABELS = {
  analysis: "Analysis",
  design: "Design",
  validation: "Validation",
};

const GROUP_ORDER = ["analysis", "design", "validation"];

/* ── Default pipeline preset ── */
const DEFAULT_TASKS = new Set(["epitope", "sasa", "rfdiffusion", "proteinmpnn", "boltz2", "biosecurity"]);
const QUICK_TASKS = new Set(["epitope", "sasa", "biosecurity"]);
const DESIGN_TASKS = new Set(["sasa", "rfdiffusion", "proteinmpnn", "boltz2"]);

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export default function PipelineConfigPanel({
  proteinList,
  selectedPdb,
  running,
  pipelineMode,
  currentStep = 0,
  totalSteps = 5,
  onRun,
  onClose,
}) {
  const hasProteins = proteinList && proteinList.length > 0;
  const [targetPdb, setTargetPdb] = useState(selectedPdb || proteinList?.[0]?.pdbId || "1CRN");
  const [numCandidates, setNumCandidates] = useState(1);
  const [mode, setMode] = useState(pipelineMode || "mock");
  const [enabledTasks, setEnabledTasks] = useState(() => new Set(DEFAULT_TASKS));
  const [preset, setPreset] = useState("default");

  const toggleTask = (id) => {
    setEnabledTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPreset("custom");
  };

  const applyPreset = (name) => {
    setPreset(name);
    if (name === "default") setEnabledTasks(new Set(DEFAULT_TASKS));
    else if (name === "quick") setEnabledTasks(new Set(QUICK_TASKS));
    else if (name === "design") setEnabledTasks(new Set(DESIGN_TASKS));
  };

  const estimatedTime = useMemo(() => {
    let total = 0;
    PIPELINE_TASKS.forEach((t) => {
      if (enabledTasks.has(t.id)) total += t.estimatedMin;
    });
    return total * numCandidates;
  }, [enabledTasks, numCandidates]);

  const handleRun = () => {
    const config = {
      mode,
      targetPdb,
      numCandidates,
      tasks: [...enabledTasks],
      runEpitope: enabledTasks.has("epitope"),
      runGeneration: enabledTasks.has("rfdiffusion") || enabledTasks.has("proteinmpnn"),
      runValidation: enabledTasks.has("boltz2"),
      runBiosecurity: enabledTasks.has("biosecurity"),
    };
    onRun(config);
    onClose();
  };

  const grouped = useMemo(() => {
    const groups = {};
    GROUP_ORDER.forEach((g) => { groups[g] = []; });
    PIPELINE_TASKS.forEach((t) => {
      if (groups[t.group]) groups[t.group].push(t);
    });
    return groups;
  }, []);

  const progress = running ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380, maxHeight: "85vh", background: "rgba(15,15,15,0.95)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#f5f5f7" }}>
              Pipeline Config
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 24, height: 24, borderRadius: 6, border: "none",
              background: "rgba(255,255,255,0.06)", color: "#48484a",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontFamily: "monospace",
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "14px 20px 16px", minHeight: 0 }}>

          {/* Running progress indicator */}
          {running && (
            <div style={{
              marginBottom: 14, padding: "10px 12px", borderRadius: 8,
              background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.15)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 600, color: "#30d158" }}>
                  PIPELINE RUNNING
                </span>
                <span style={{ fontFamily: "monospace", fontSize: 8, color: "#48484a" }}>
                  Step {currentStep}/{totalSteps} · {progress}%
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progress}%`,
                  background: "linear-gradient(90deg, #30d158, #30d158cc)",
                  borderRadius: 2, transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          )}

          {/* Target protein */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Target Protein
            </label>
            {hasProteins ? (
              <select
                value={targetPdb}
                onChange={(e) => setTargetPdb(e.target.value)}
                disabled={running}
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: 6,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#f5f5f7", fontFamily: "monospace", fontSize: 10, outline: "none",
                  WebkitAppearance: "none", opacity: running ? 0.5 : 1,
                }}
              >
                {proteinList.map((p) => (
                  <option key={p.pdbId} value={p.pdbId} style={{ background: "#111" }}>
                    {p.label} ({p.pdbId}){p.pathogen ? ` — ${p.pathogen}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{
                padding: "8px 10px", borderRadius: 6,
                background: "rgba(255,159,10,0.06)", border: "1px solid rgba(255,159,10,0.15)",
                fontFamily: "monospace", fontSize: 9, color: "#ff9f0a",
              }}>
                No proteins selected — use the Discovery Panel to find targets
              </div>
            )}
          </div>

          {/* Candidates + Mode row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Candidates
              </label>
              <input
                type="number" min={1} max={5} value={numCandidates}
                disabled={running}
                onChange={(e) => setNumCandidates(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                style={{
                  width: 60, padding: "7px 10px", borderRadius: 6,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#f5f5f7", fontFamily: "monospace", fontSize: 10, outline: "none",
                  opacity: running ? 0.5 : 1,
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Mode
              </label>
              <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                {["mock", "real"].map((m) => (
                  <button
                    key={m}
                    onClick={() => !running && setMode(m)}
                    disabled={running}
                    style={{
                      flex: 1, padding: "6px 0", border: "none", cursor: running ? "default" : "pointer",
                      fontFamily: "monospace", fontSize: 10, fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                      background: mode === m
                        ? m === "real" ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.06)"
                        : "transparent",
                      color: mode === m
                        ? m === "real" ? "#30d158" : "#86868b"
                        : "#3a3a3c",
                      opacity: running ? 0.5 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preset pills */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pipeline Preset
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { key: "default", label: "Full Pipeline", color: "#30d158" },
                { key: "quick", label: "Quick Scan", color: "#ff9f0a" },
                { key: "design", label: "Design Only", color: "#5e5ce6" },
                { key: "custom", label: "Custom", color: "#af52de" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => !running && p.key !== "custom" && applyPreset(p.key)}
                  disabled={running || p.key === "custom"}
                  style={{
                    padding: "4px 8px", borderRadius: 4, border: "none", cursor: running ? "default" : "pointer",
                    fontFamily: "monospace", fontSize: 8, fontWeight: 600,
                    background: preset === p.key ? `${p.color}20` : "rgba(255,255,255,0.04)",
                    color: preset === p.key ? p.color : "#48484a",
                    transition: "all 0.15s",
                    opacity: p.key === "custom" && preset !== "custom" ? 0.4 : running ? 0.5 : 1,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Task toggles grouped */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pipeline Tasks
            </label>
            {GROUP_ORDER.map((group) => (
              <div key={group} style={{ marginBottom: 8 }}>
                <div style={{
                  fontFamily: "monospace", fontSize: 7, color: "#636366", textTransform: "uppercase",
                  letterSpacing: "0.06em", marginBottom: 4, paddingLeft: 2,
                }}>
                  {GROUP_LABELS[group]}
                </div>
                {grouped[group].map((task) => {
                  const enabled = enabledTasks.has(task.id);
                  return (
                    <div
                      key={task.id}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "5px 8px", borderRadius: 6, marginBottom: 2,
                        background: enabled ? `${task.color}08` : "transparent",
                        border: `1px solid ${enabled ? `${task.color}20` : "transparent"}`,
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12 }}>{task.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: "monospace", fontSize: 9, color: enabled ? "#e5e5ea" : "#636366", fontWeight: 600 }}>
                            {task.label}
                          </div>
                          <div style={{ fontFamily: "monospace", fontSize: 7, color: "#48484a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {task.description}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 7, color: "#48484a" }}>
                          ~{formatTime(task.estimatedMin)}
                        </span>
                        <button
                          onClick={() => !running && toggleTask(task.id)}
                          disabled={running}
                          style={{
                            width: 32, height: 16, borderRadius: 8, border: "none",
                            cursor: running ? "default" : "pointer",
                            background: enabled ? `${task.color}40` : "rgba(255,255,255,0.08)",
                            position: "relative", transition: "background 0.15s",
                            opacity: running ? 0.5 : 1,
                          }}
                        >
                          <span style={{
                            position: "absolute", top: 2, left: enabled ? 17 : 2,
                            width: 12, height: 12, borderRadius: 6,
                            background: enabled ? task.color : "#48484a",
                            transition: "all 0.15s",
                          }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Time estimate summary */}
          <div style={{
            padding: "8px 10px", borderRadius: 6,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
            marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 7, color: "#48484a", textTransform: "uppercase", marginBottom: 2 }}>
                Estimated Runtime
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#e5e5ea" }}>
                {formatTime(estimatedTime)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "monospace", fontSize: 7, color: "#48484a", marginBottom: 2 }}>
                Tasks: {enabledTasks.size} · Candidates: {numCandidates}
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#636366" }}>
                {mode === "real" ? "Real compute" : "Mock simulation"}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with run button */}
        <div style={{
          padding: "12px 20px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <button
            onClick={handleRun}
            disabled={running || enabledTasks.size === 0 || !hasProteins}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 8,
              border: "none", cursor: running || enabledTasks.size === 0 || !hasProteins ? "default" : "pointer",
              fontFamily: "monospace", fontSize: 11, fontWeight: 600,
              background: running || !hasProteins ? "#1c1c1c" : enabledTasks.size === 0 ? "#1c1c1c" : "#30d158",
              color: running || enabledTasks.size === 0 || !hasProteins ? "#48484a" : "#000",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {running ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
                </svg>
                Running ({progress}%)
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4l16 8-16 8V4z"/>
                </svg>
                Run Pipeline{enabledTasks.size > 0 ? ` (${enabledTasks.size} tasks)` : ""}
              </>
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  );
}
