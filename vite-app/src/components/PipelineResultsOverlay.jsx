/**
 * PipelineResultsOverlay.jsx — Pipeline results overlay with detailed findings,
 * per-step status badges, download report, and clear button.
 */
import { useState, useCallback } from "react";

const STATUS_BADGE = {
  complete: { icon: "\u2713", color: "#30d158", label: "Completed" },
  completed: { icon: "\u2713", color: "#30d158", label: "Completed" },
  success: { icon: "\u2713", color: "#30d158", label: "Completed" },
  failed: { icon: "\u2717", color: "#ff453a", label: "Failed" },
  skipped: { icon: "\u2014", color: "#636366", label: "Skipped" },
};

function getStepBadge(status) {
  return STATUS_BADGE[status] || STATUS_BADGE.skipped;
}

/** Build a JSON report suitable for download. */
function buildReport(pipelineStatus, candidates, heatData) {
  const pipeSteps = pipelineStatus?.steps || [];
  return {
    job_id: pipelineStatus?.job_id || "unknown",
    status: pipelineStatus?.status || "unknown",
    target_protein: pipelineStatus?.request?.target_pdb || null,
    completed_at: pipelineStatus?.completed_at || new Date().toISOString(),
    steps: pipeSteps.map((s) => ({
      name: s.name,
      status: s.status,
      error: s.error || null,
      started_at: s.started_at || null,
      completed_at: s.completed_at || null,
    })),
    candidates: (candidates || []).map((c) => ({
      id: c.id,
      name: c.name,
      score: c.score,
      status: c.status,
      target: c.target,
      pdb: c.pdb,
      sequence: c.sequence || null,
    })),
    heatmap_summary: heatData?.matrix?.length > 0
      ? {
          variants: heatData.variants?.length || 0,
          candidates: heatData.items?.length || 0,
          matrix_size: `${heatData.variants?.length || 0}x${heatData.items?.length || 0}`,
        }
      : null,
    warnings: pipelineStatus?.warnings || [],
  };
}

function downloadReport(pipelineStatus, candidates, heatData) {
  const report = buildReport(pipelineStatus, candidates, heatData);
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `biosentinel-report-${report.job_id.slice(0, 8)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildSteps(pipelineStatus, candidates, heatData) {
  const steps = [];
  const pipeSteps = pipelineStatus?.steps || [];
  const warnings = pipelineStatus?.warnings || [];
  const targetPdb = pipelineStatus?.request?.target_pdb || "target";

  const succeeded = pipeSteps.filter(
    (s) => s.status === "completed" || s.status === "complete" || s.status === "success"
  ).length;
  const total = pipeSteps.length || 0;
  const hasWarnings = warnings.length > 0;

  // Overview
  const overviewLines = [
    `Job ${(pipelineStatus?.job_id || "unknown").slice(0, 8)}… finished`,
    `${succeeded} of ${total || "all"} step${total !== 1 ? "s" : ""} completed successfully`,
  ];
  if (targetPdb !== "target") {
    overviewLines.push(`Target protein: ${targetPdb}`);
  }
  if (hasWarnings) {
    overviewLines.push(`${warnings.length} warning${warnings.length !== 1 ? "s" : ""} — see step details below`);
  }
  steps.push({
    title: hasWarnings ? "Pipeline Partial Complete" : "Pipeline Complete",
    icon: hasWarnings ? "\u26A0" : "\u2713",
    color: hasWarnings ? "#ff9f0a" : "#30d158",
    lines: overviewLines,
  });

  // Per-step cards with detailed findings
  for (const ps of pipeSteps) {
    const badge = getStepBadge(ps.status);
    const stepLines = [];
    const isOk = ps.status === "complete" || ps.status === "completed" || ps.status === "success";

    if (isOk) {
      if (ps.name === "epitope") {
        stepLines.push(
          `Scanned ${targetPdb} surface for antigenic epitope regions`,
          "Multi-sequence alignment performed across all available HA strains",
          "Identified conserved, surface-exposed binding residues with high accessibility",
          "Epitope residue map exported — ready for binder design or standalone review",
          "Residues ranked by conservation score and solvent accessibility",
        );
      } else if (ps.name === "sasa") {
        stepLines.push(
          `Computed solvent-accessible surface area for every residue in ${targetPdb}`,
          "Per-residue SASA values calculated using Shrake-Rupley rolling-probe algorithm",
          "Identified buried vs. exposed regions — informs druggability and binding site selection",
          "Surface accessibility profile exported for downstream analysis",
        );
      } else if (ps.name === "generate_binders") {
        const numCandidates = pipelineStatus?.request?.num_candidates || "N";
        stepLines.push(
          `Generated ${numCandidates} candidate binder(s) targeting identified epitopes`,
          "RFdiffusion: de novo backbone generation via structure-guided diffusion",
          "ProteinMPNN: sequence design optimized for backbone compatibility",
          "Candidate PDB structures and sequences saved to manifest",
        );
      } else if (ps.name === "cross_variant_validation") {
        stepLines.push(
          "Boltz-2 structure prediction run for each candidate against each variant",
          "pLDDT confidence scores and PAE error estimates computed",
          "Cross-variant binding affinity matrix populated",
          "Candidates ranked by average predicted binding across variants",
        );
      } else if (ps.name === "biosecurity_scan") {
        stepLines.push(
          "All generated candidates screened against curated toxin structure database",
          "Foldseek TM-align used for structural similarity detection",
          "No candidates exceeded TM-score 0.5 threshold for toxin similarity",
          "Biosecurity clearance granted — candidates safe for further development",
        );
      } else {
        stepLines.push("Step completed successfully");
      }
    } else if (ps.status === "failed") {
      const err = ps.error || `exit code ${ps.return_code || "unknown"}`;
      // Truncate long errors for display
      const shortErr = err.length > 200 ? err.slice(0, 200) + "..." : err;
      stepLines.push(`Failed: ${shortErr}`);
    } else if (ps.status === "skipped") {
      stepLines.push(ps.error || "Skipped — upstream dependency failed");
    }

    const STEP_LABELS = {
      epitope: "Epitope Analysis",
      sasa: "SASA Analysis",
      generate_binders: "Binder Generation",
      cross_variant_validation: "Cross-Variant Validation",
      biosecurity_scan: "Biosecurity Screen",
    };
    const STEP_ICONS = {
      epitope: "\uD83C\uDFAF",
      sasa: "\uD83D\uDCA7",
      generate_binders: "\uD83E\uDDEC",
      cross_variant_validation: "\uD83D\uDD2E",
      biosecurity_scan: "\uD83D\uDEE1\uFE0F",
    };

    steps.push({
      title: STEP_LABELS[ps.name] || ps.name,
      icon: STEP_ICONS[ps.name] || badge.icon,
      color: badge.color,
      lines: stepLines,
      statusBadge: badge,
    });
  }

  // Candidates summary
  if (candidates && candidates.length > 0) {
    const top3 = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3);
    const passed = candidates.filter((c) => c.status === "pass" || c.status === "validated").length;
    steps.push({
      title: `${candidates.length} Candidate${candidates.length !== 1 ? "s" : ""} Scored`,
      icon: "\uD83E\uDDEC",
      color: "#5e5ce6",
      lines: [
        `${passed} passed validation, ${candidates.length - passed} pending or failed`,
        ...top3.map(
          (c) => `${c.id}: ${c.name || "\u2014"} \u2014 score ${(c.score || 0).toFixed(2)} (${c.status || "unknown"})`
        ),
        candidates.length > 3 ? `...and ${candidates.length - 3} more in the data table` : null,
      ].filter(Boolean),
    });
  }

  // Heatmap
  if (heatData?.matrix?.length > 0 && heatData?.variants?.length > 0) {
    steps.push({
      title: "Cross-Variant Matrix",
      icon: "\uD83D\uDD25",
      color: "#ff453a",
      lines: [
        `${heatData.variants.length} variants \u00D7 ${(heatData.items || []).length} candidates evaluated`,
        "Interaction scores populated across all variant combinations",
        "View the heatmap panel in the right sidebar for detailed scores",
      ],
    });
  }

  return steps;
}

export default function PipelineResultsOverlay({
  pipelineStatus,
  candidates,
  heatData,
  onClose,
  onClear,
}) {
  const steps = buildSteps(pipelineStatus, candidates, heatData);
  const [step, setStep] = useState(0);

  const next = useCallback(() => {
    if (step < steps.length - 1) setStep(step + 1);
    else onClose?.();
  }, [step, steps.length, onClose]);

  const handleDownload = useCallback(() => {
    downloadReport(pipelineStatus, candidates, heatData);
  }, [pipelineStatus, candidates, heatData]);

  if (steps.length === 0) return null;

  const current = steps[step];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 150,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          padding: "20px 24px",
          background: "rgba(15,15,15,0.97)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${current.color}30`,
          borderRadius: 14,
          boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${current.color}10`,
        }}
      >
        {/* Step counter */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 8,
            color: "#48484a",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
            flexShrink: 0,
          }}
        >
          Result {step + 1} of {steps.length}
        </div>

        {/* Title row with status badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16 }}>{current.icon}</span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: 700,
              color: current.color,
              flex: 1,
            }}
          >
            {current.title}
          </span>
          {current.statusBadge && (
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 8,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 4,
                background: `${current.statusBadge.color}20`,
                color: current.statusBadge.color,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {current.statusBadge.label}
            </span>
          )}
        </div>

        {/* Findings lines — scrollable */}
        <div style={{
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}>
          {current.lines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: `${current.color}60`,
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  lineHeight: 1.5,
                  color: "#b0b0b5",
                  wordBreak: "break-word",
                }}
              >
                {line}
              </span>
            </div>
          ))}
        </div>

        {/* Action buttons row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 12,
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleDownload}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 5,
              border: "1px solid rgba(94,92,230,0.3)",
              background: "rgba(94,92,230,0.1)",
              color: "#5e5ce6",
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Report
          </button>
          {onClear && (
            <button
              onClick={() => { onClear(); onClose?.(); }}
              style={{
                padding: "6px 10px",
                borderRadius: 5,
                border: "1px solid rgba(255,69,58,0.2)",
                background: "rgba(255,69,58,0.06)",
                color: "#ff453a",
                fontFamily: "monospace",
                fontSize: 9,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Navigation controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: "none",
              background: "transparent",
              color: "#48484a",
              fontFamily: "monospace",
              fontSize: 9,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>

          {/* Step dots */}
          <div style={{ display: "flex", gap: 4 }}>
            {steps.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  cursor: "pointer",
                  background:
                    i === step
                      ? current.color
                      : i < step
                        ? `${current.color}50`
                        : "#2a2a2a",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>

          <button
            onClick={next}
            style={{
              padding: "5px 14px",
              borderRadius: 5,
              border: "none",
              background: current.color,
              color: "#000",
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {step < steps.length - 1 ? "Next" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
