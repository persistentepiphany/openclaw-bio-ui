/**
 * PipelineConfigPanel.jsx — Modal panel for configuring pipeline runs.
 *
 * Props:
 *   proteinList     – array of { pdbId, label }
 *   selectedPdb     – currently selected PDB ID (default target)
 *   running         – boolean, pipeline currently executing
 *   pipelineMode    – "mock" | "real"
 *   onRun           – callback(config) to start pipeline with full config
 *   onClose         – callback to close the panel
 */
import { useState } from "react";

export default function PipelineConfigPanel({ proteinList, selectedPdb, running, pipelineMode, onRun, onClose }) {
  const [targetPdb, setTargetPdb] = useState(selectedPdb || proteinList[0]?.pdbId || "1CRN");
  const [numCandidates, setNumCandidates] = useState(1);
  const [mode, setMode] = useState(pipelineMode || "mock");
  const [runEpitope, setRunEpitope] = useState(true);
  const [runGeneration, setRunGeneration] = useState(true);
  const [runValidation, setRunValidation] = useState(true);
  const [runBiosecurity, setRunBiosecurity] = useState(true);

  const handleRun = () => {
    onRun({
      mode,
      targetPdb,
      numCandidates,
      runEpitope,
      runGeneration,
      runValidation,
      runBiosecurity,
    });
    onClose();
  };

  const Toggle = ({ label, checked, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#86868b" }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 32, height: 16, borderRadius: 8, border: "none", cursor: "pointer",
          background: checked ? "rgba(48,209,88,0.3)" : "rgba(255,255,255,0.08)",
          position: "relative", transition: "background 0.15s",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: checked ? 17 : 2,
          width: 12, height: 12, borderRadius: 6,
          background: checked ? "#30d158" : "#48484a",
          transition: "all 0.15s",
        }} />
      </button>
    </div>
  );

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
          width: 320, background: "rgba(15,15,15,0.95)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
          padding: "20px 22px", boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
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

        {/* Target protein */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Target Protein
          </label>
          <select
            value={targetPdb}
            onChange={(e) => setTargetPdb(e.target.value)}
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#f5f5f7", fontFamily: "monospace", fontSize: 10, outline: "none",
              WebkitAppearance: "none",
            }}
          >
            {proteinList.map((p) => (
              <option key={p.pdbId} value={p.pdbId} style={{ background: "#111" }}>
                {p.label} ({p.pdbId})
              </option>
            ))}
          </select>
        </div>

        {/* Num candidates */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Candidates
          </label>
          <input
            type="number" min={1} max={5} value={numCandidates}
            onChange={(e) => setNumCandidates(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
            style={{
              width: 60, padding: "7px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#f5f5f7", fontFamily: "monospace", fontSize: 10, outline: "none",
            }}
          />
        </div>

        {/* Step toggles */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Pipeline Steps
          </label>
          <Toggle label="Epitope Detection" checked={runEpitope} onChange={setRunEpitope} />
          <Toggle label="Candidate Generation" checked={runGeneration} onChange={setRunGeneration} />
          <Toggle label="Validation" checked={runValidation} onChange={setRunValidation} />
          <Toggle label="Biosecurity Check" checked={runBiosecurity} onChange={setRunBiosecurity} />
        </div>

        {/* Mode */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Mode
          </label>
          <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            {["mock", "real"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: "6px 0", border: "none", cursor: "pointer",
                  fontFamily: "monospace", fontSize: 10, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.04em",
                  background: mode === m
                    ? m === "real" ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.06)"
                    : "transparent",
                  color: mode === m
                    ? m === "real" ? "#30d158" : "#86868b"
                    : "#3a3a3c",
                  transition: "all 0.15s",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 8,
            border: "none", cursor: running ? "default" : "pointer",
            fontFamily: "monospace", fontSize: 11, fontWeight: 600,
            background: running ? "#1c1c1c" : "#30d158",
            color: running ? "#48484a" : "#000",
            transition: "all 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {running ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
              </svg>
              Running...
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
      </div>
    </div>
  );
}
