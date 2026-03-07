/**
 * OnboardingGuide.jsx — 5-step tooltip overlay for first-time live mode users.
 *
 * Anchors tooltips to UI elements via CSS class selectors.
 * Uses spotlight cutout to highlight the target element.
 * Only shows in live mode on first visit (tracked via localStorage).
 */
import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "biosentinel-onboarding-done";

const STEPS = [
  {
    selector: ".activity-feed-refresh",
    title: "Gather Intelligence",
    description: "Click the refresh button to trigger the scraper pipeline. It scans biosecurity sources for emerging threats.",
    position: "right",
  },
  {
    selector: ".threat-feed-container",
    title: "Review Threats",
    description: "Threat feed populates as the scraper finds entries. Each item shows source, confidence, and pathogen details.",
    position: "right",
  },
  {
    selector: ".protein-discovery-trigger",
    title: "Discover Proteins",
    description: "When threats are found, this button lights up. Click it to see suggested protein targets linked to detected pathogens.",
    position: "bottom",
  },
  {
    selector: ".pipeline-config-trigger",
    title: "Configure Pipeline",
    description: "Open the pipeline configuration panel to select your target protein, choose analysis tasks, and run the compute pipeline.",
    position: "right",
  },
  {
    selector: ".data-table-container",
    title: "View Results",
    description: "Pipeline results appear here as scored candidates. Click any candidate to view its 3D structure in the viewer.",
    position: "left",
  },
];

export default function OnboardingGuide({ onComplete }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const rafRef = useRef(null);

  const updateRect = useCallback(() => {
    const el = document.querySelector(STEPS[step]?.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    } else {
      setTargetRect(null);
    }
    rafRef.current = requestAnimationFrame(updateRect);
  }, [step]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateRect);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateRect]);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    onComplete?.();
  }, [onComplete]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const current = STEPS[step];
  const pad = 8;

  // Compute tooltip position
  let tooltipStyle = {};
  if (targetRect) {
    const pos = current.position;
    if (pos === "right") {
      tooltipStyle = {
        top: targetRect.top + targetRect.height / 2,
        left: targetRect.left + targetRect.width + 16,
        transform: "translateY(-50%)",
      };
    } else if (pos === "left") {
      tooltipStyle = {
        top: targetRect.top + targetRect.height / 2,
        right: window.innerWidth - targetRect.left + 16,
        transform: "translateY(-50%)",
      };
    } else if (pos === "bottom") {
      tooltipStyle = {
        top: targetRect.top + targetRect.height + 12,
        left: targetRect.left + targetRect.width / 2,
        transform: "translateX(-50%)",
      };
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "auto" }}>
      {/* Spotlight overlay */}
      {targetRect && (
        <div
          className="onboarding-spotlight"
          style={{
            position: "fixed",
            inset: 0,
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.65)`,
            clipPath: `polygon(
              0% 0%, 0% 100%, ${targetRect.left - pad}px 100%,
              ${targetRect.left - pad}px ${targetRect.top - pad}px,
              ${targetRect.left + targetRect.width + pad}px ${targetRect.top - pad}px,
              ${targetRect.left + targetRect.width + pad}px ${targetRect.top + targetRect.height + pad}px,
              ${targetRect.left - pad}px ${targetRect.top + targetRect.height + pad}px,
              ${targetRect.left - pad}px 100%, 100% 100%, 100% 0%
            )`,
            background: "rgba(0,0,0,0.65)",
            transition: "clip-path 0.3s ease",
          }}
        />
      )}

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: targetRect.top - pad,
            left: targetRect.left - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
            borderRadius: 8,
            border: "2px solid rgba(48,209,88,0.5)",
            boxShadow: "0 0 20px rgba(48,209,88,0.2)",
            pointerEvents: "none",
            transition: "all 0.3s ease",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="onboarding-tooltip"
        style={{
          position: "fixed",
          ...tooltipStyle,
          width: 260,
          padding: "16px 18px",
          background: "rgba(15,15,15,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(48,209,88,0.2)",
          borderRadius: 10,
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          zIndex: 201,
        }}
      >
        {/* Step counter */}
        <div style={{
          fontFamily: "monospace",
          fontSize: 8,
          color: "#48484a",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}>
          Step {step + 1} of {STEPS.length}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "monospace",
          fontSize: 12,
          fontWeight: 700,
          color: "#30d158",
          marginBottom: 6,
        }}>
          {current.title}
        </div>

        {/* Description */}
        <div style={{
          fontFamily: "monospace",
          fontSize: 10,
          lineHeight: 1.5,
          color: "#b0b0b5",
          marginBottom: 14,
        }}>
          {current.description}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={finish}
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
            Skip
          </button>

          {/* Step dots */}
          <div style={{ display: "flex", gap: 4 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: i === step ? "#30d158" : i < step ? "rgba(48,209,88,0.3)" : "#2a2a2a",
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
              background: "#30d158",
              color: "#000",
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {step < STEPS.length - 1 ? "Next" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Check if onboarding should show (never shown before + live mode). */
OnboardingGuide.shouldShow = () => !localStorage.getItem(STORAGE_KEY);
