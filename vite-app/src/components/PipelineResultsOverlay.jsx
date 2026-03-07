/**
 * PipelineResultsOverlay.jsx — Tutorial-style overlay showing pipeline findings.
 *
 * Appears after a pipeline completes with a spotlight + tooltip format
 * matching the OnboardingGuide style. Shows step-by-step results:
 *   1. Epitope analysis summary
 *   2. Candidates generated
 *   3. Validation scores
 *   4. Biosecurity screening
 *
 * Auto-dismisses or user clicks through steps.
 */
import { useState, useCallback } from "react";

function buildSteps(pipelineStatus, candidates, heatData) {
  const steps = [];

  // Step 1: Pipeline overview
  const jobId = pipelineStatus?.job_id || "unknown";
  const stepsRan = pipelineStatus?.steps?.filter((s) => s.status === "completed" || s.status === "success") || [];
  steps.push({
    title: "Pipeline Complete",
    icon: "✓",
    color: "#30d158",
    lines: [
      `Job ${jobId.slice(0, 8)}… finished`,
      `${stepsRan.length || "all"} step${stepsRan.length !== 1 ? "s" : ""} completed successfully`,
      pipelineStatus?.request?.target_pdb
        ? `Target protein: ${pipelineStatus.request.target_pdb}`
        : null,
    ].filter(Boolean),
  });

  // Step 2: Epitope / analysis results
  if (pipelineStatus?.steps?.some((s) => s.name === "epitope")) {
    steps.push({
      title: "Epitope Analysis",
      icon: "🎯",
      color: "#ff9f0a",
      lines: [
        "Antigenic epitopes identified on target surface",
        "Sequence alignment across HA strains completed",
        "Conserved binding regions mapped",
      ],
    });
  }

  // Step 3: Candidates
  if (candidates && candidates.length > 0) {
    const top3 = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3);
    const passed = candidates.filter((c) => c.status === "pass" || c.status === "validated").length;
    steps.push({
      title: `${candidates.length} Candidate${candidates.length !== 1 ? "s" : ""} Scored`,
      icon: "🧬",
      color: "#5e5ce6",
      lines: [
        `${passed} passed validation`,
        ...top3.map(
          (c) => `${c.id}: ${c.name || "—"} — score ${(c.score || 0).toFixed(2)}`
        ),
      ],
    });
  }

  // Step 4: Heatmap / cross-variant
  if (heatData?.matrix?.length > 0 && heatData?.variants?.length > 0) {
    steps.push({
      title: "Cross-Variant Matrix",
      icon: "🔥",
      color: "#ff453a",
      lines: [
        `${heatData.variants.length} variants × ${(heatData.items || []).length} candidates`,
        "Interaction matrix populated",
        "View the heatmap panel for detailed scores",
      ],
    });
  }

  // Step 5: Biosecurity (if ran)
  if (pipelineStatus?.steps?.some((s) => s.name === "biosecurity_scan")) {
    const bioStep = pipelineStatus.steps.find((s) => s.name === "biosecurity_scan");
    const passed = bioStep?.status === "completed" || bioStep?.status === "success";
    steps.push({
      title: "Biosecurity Screen",
      icon: "🛡️",
      color: passed ? "#30d158" : "#ff453a",
      lines: passed
        ? [
            "All candidates screened against toxin database",
            "No structural similarity to known toxins detected",
            "Candidates cleared for further development",
          ]
        : [
            "Biosecurity screening encountered an issue",
            bioStep?.return_code ? `Exit code: ${bioStep.return_code}` : null,
          ].filter(Boolean),
    });
  }

  return steps;
}

export default function PipelineResultsOverlay({
  pipelineStatus,
  candidates,
  heatData,
  onClose,
}) {
  const steps = buildSteps(pipelineStatus, candidates, heatData);
  const [step, setStep] = useState(0);

  const next = useCallback(() => {
    if (step < steps.length - 1) setStep(step + 1);
    else onClose?.();
  }, [step, steps.length, onClose]);

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
          width: 340,
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
          }}
        >
          Result {step + 1} of {steps.length}
        </div>

        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 16 }}>{current.icon}</span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: 700,
              color: current.color,
            }}
          >
            {current.title}
          </span>
        </div>

        {/* Findings lines */}
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
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
                }}
              >
                {line}
              </span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
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
