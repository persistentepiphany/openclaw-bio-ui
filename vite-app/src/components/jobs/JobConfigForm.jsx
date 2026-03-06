/**
 * JobConfigForm.jsx — Dynamic config form per design tool
 *
 * Props:
 *   toolId   — "rfdiffusion" | "proteinmpnn" | "boltz2"
 *   onSubmit — (config) => void
 */

import { useState } from "react";

const inputStyle = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#e5e5ea",
  fontFamily: "monospace",
  fontSize: 10,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontFamily: "monospace",
  fontSize: 8,
  color: "#636366",
  marginBottom: 4,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

function Field({ label, htmlFor, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={htmlFor} style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

/* ── RFdiffusion config ── */
function RFdiffusionForm({ onSubmit }) {
  const [config, setConfig] = useState({
    pdb: "1CRN",
    numDesigns: 4,
    steps: 50,
    contigs: "A1-46",
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(config); }}>
      <Field label="Input PDB" htmlFor="rfd-pdb">
        <input
          id="rfd-pdb"
          name="rfd-pdb"
          style={inputStyle}
          value={config.pdb}
          onChange={(e) => setConfig({ ...config, pdb: e.target.value })}
          placeholder="PDB code"
        />
      </Field>
      <Field label="Number of designs" htmlFor="rfd-num-designs">
        <input
          id="rfd-num-designs"
          name="rfd-num-designs"
          style={inputStyle}
          type="number"
          min={1}
          max={16}
          value={config.numDesigns}
          onChange={(e) => setConfig({ ...config, numDesigns: parseInt(e.target.value) || 1 })}
        />
      </Field>
      <Field label="Diffusion steps" htmlFor="rfd-steps">
        <input
          id="rfd-steps"
          name="rfd-steps"
          style={inputStyle}
          type="number"
          min={10}
          max={200}
          value={config.steps}
          onChange={(e) => setConfig({ ...config, steps: parseInt(e.target.value) || 50 })}
        />
      </Field>
      <Field label="Contigs (residue range)" htmlFor="rfd-contigs">
        <input
          id="rfd-contigs"
          name="rfd-contigs"
          style={inputStyle}
          value={config.contigs}
          onChange={(e) => setConfig({ ...config, contigs: e.target.value })}
          placeholder="e.g. A1-46"
        />
      </Field>
      <SubmitButton tool="rfdiffusion" />
    </form>
  );
}

/* ── ProteinMPNN config ── */
function ProteinMPNNForm({ onSubmit }) {
  const [config, setConfig] = useState({
    pdb: "1CRN",
    temperature: 0.1,
    numSequences: 8,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(config); }}>
      <Field label="Input PDB" htmlFor="mpnn-pdb">
        <input
          id="mpnn-pdb"
          name="mpnn-pdb"
          style={inputStyle}
          value={config.pdb}
          onChange={(e) => setConfig({ ...config, pdb: e.target.value })}
          placeholder="PDB code"
        />
      </Field>
      <Field label={`Temperature: ${config.temperature.toFixed(2)}`} htmlFor="mpnn-temperature">
        <input
          id="mpnn-temperature"
          name="mpnn-temperature"
          type="range"
          min={0.01}
          max={1}
          step={0.01}
          value={config.temperature}
          onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
          style={{ width: "100%", accentColor: "#30d158" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 7, color: "#48484a" }}>
          <span>Conservative (0.01)</span>
          <span>Creative (1.0)</span>
        </div>
      </Field>
      <Field label="Number of sequences" htmlFor="mpnn-num-sequences">
        <input
          id="mpnn-num-sequences"
          name="mpnn-num-sequences"
          style={inputStyle}
          type="number"
          min={1}
          max={32}
          value={config.numSequences}
          onChange={(e) => setConfig({ ...config, numSequences: parseInt(e.target.value) || 1 })}
        />
      </Field>
      <SubmitButton tool="proteinmpnn" />
    </form>
  );
}

/* ── Boltz-2 config ── */
function Boltz2Form({ onSubmit }) {
  const [config, setConfig] = useState({
    inputType: "sequence",
    input: "MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVVHSLAKWKRQQIAATGFHFIPNF",
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(config); }}>
      <Field label="Input type" htmlFor="boltz-input-type">
        <div id="boltz-input-type" style={{ display: "flex", gap: 4 }}>
          {["sequence", "pdb"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setConfig({ ...config, inputType: type, input: type === "pdb" ? "1CRN" : config.input })}
              style={{
                flex: 1,
                padding: "5px 8px",
                borderRadius: 4,
                border: `1px solid ${config.inputType === type ? "rgba(255,159,10,0.4)" : "rgba(255,255,255,0.06)"}`,
                background: config.inputType === type ? "rgba(255,159,10,0.1)" : "rgba(255,255,255,0.03)",
                color: config.inputType === type ? "#ff9f0a" : "#636366",
                fontFamily: "monospace",
                fontSize: 9,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </Field>
      <Field label={config.inputType === "sequence" ? "Amino acid sequence" : "PDB code"} htmlFor="boltz-input">
        {config.inputType === "sequence" ? (
          <textarea
            id="boltz-input"
            name="boltz-input"
            style={{ ...inputStyle, height: 80, resize: "vertical" }}
            value={config.input}
            onChange={(e) => setConfig({ ...config, input: e.target.value })}
            placeholder="Paste sequence..."
          />
        ) : (
          <input
            id="boltz-input"
            name="boltz-input"
            style={inputStyle}
            value={config.input}
            onChange={(e) => setConfig({ ...config, input: e.target.value })}
            placeholder="PDB code"
          />
        )}
      </Field>
      <SubmitButton tool="boltz2" />
    </form>
  );
}

/* ── Submit button ── */
const TOOL_COLORS = {
  rfdiffusion: "#5e5ce6",
  proteinmpnn: "#30d158",
  boltz2: "#ff9f0a",
};

function SubmitButton({ tool }) {
  const color = TOOL_COLORS[tool] || "#5e5ce6";
  return (
    <button
      type="submit"
      style={{
        width: "100%",
        padding: "8px",
        borderRadius: 6,
        border: "none",
        background: color,
        color: tool === "proteinmpnn" ? "#000" : "#fff",
        fontFamily: "monospace",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        marginTop: 4,
        transition: "opacity 0.15s",
      }}
      onMouseOver={(e) => (e.target.style.opacity = 0.9)}
      onMouseOut={(e) => (e.target.style.opacity = 1)}
    >
      Submit Job
    </button>
  );
}

/* ── Main form router ── */
export default function JobConfigForm({ toolId, onSubmit }) {
  if (!toolId) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "monospace", fontSize: 10, color: "#48484a" }}>
        Select a tool to configure
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 0" }}>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 9,
          color: "#48484a",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 12,
        }}
      >
        Configure Job
      </div>
      {toolId === "rfdiffusion" && <RFdiffusionForm onSubmit={onSubmit} />}
      {toolId === "proteinmpnn" && <ProteinMPNNForm onSubmit={onSubmit} />}
      {toolId === "boltz2" && <Boltz2Form onSubmit={onSubmit} />}
    </div>
  );
}
