/**
 * BiosecurityPanel.jsx — Collapsible biosecurity assessment panel.
 *
 * Shows screening results from the biosecurity scan pipeline step:
 *   - Summary card: X candidates screened, Y flagged
 *   - Per-candidate cards with toxin hit details and risk level
 *   - Empty state when no data available
 *
 * Props:
 *   data — biosecurity data from fetchBiosecurity() API or null
 */
import { useState } from "react";

const TM_THRESHOLD = 0.5;

function RiskBadge({ tmScore }) {
  const flagged = tmScore >= TM_THRESHOLD;
  return (
    <span
      style={{
        padding: "1px 5px",
        borderRadius: 3,
        fontFamily: "monospace",
        fontSize: 7,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        background: flagged ? "rgba(255,69,58,0.15)" : "rgba(48,209,88,0.15)",
        color: flagged ? "#ff453a" : "#30d158",
        border: `1px solid ${flagged ? "rgba(255,69,58,0.25)" : "rgba(48,209,88,0.25)"}`,
      }}
    >
      {flagged ? "Flagged" : "Clear"}
    </span>
  );
}

export default function BiosecurityPanel({ data }) {
  const [collapsed, setCollapsed] = useState(true);

  // Normalize data shape: can be { candidates: [...] } or array directly
  const candidates = Array.isArray(data)
    ? data
    : Array.isArray(data?.candidates)
      ? data.candidates
      : [];

  const screened = candidates.length;
  const flagged = candidates.filter(
    (c) => c.flagged || (c.best_hit?.tm_score ?? 0) >= TM_THRESHOLD
  ).length;

  return (
    <div
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "#0a0a0a",
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11 }}>🛡️</span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 600,
              color: "#e5e5ea",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Biosecurity
          </span>
          {screened > 0 && (
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 7,
                color: flagged > 0 ? "#ff453a" : "#30d158",
                fontWeight: 600,
              }}
            >
              {flagged > 0 ? `${flagged} flagged` : "all clear"}
            </span>
          )}
        </div>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            color: "#48484a",
            transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.15s",
          }}
        >
          ▾
        </span>
      </button>

      {/* Collapsible content */}
      {!collapsed && (
        <div style={{ padding: "0 12px 10px" }}>
          {screened === 0 ? (
            <div
              style={{
                padding: "12px 10px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                fontFamily: "monospace",
                fontSize: 9,
                color: "#636366",
                textAlign: "center",
              }}
            >
              Run pipeline with biosecurity task enabled to see results
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#b0b0b5" }}>
                  {screened} screened
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 9,
                    fontWeight: 600,
                    color: flagged > 0 ? "#ff453a" : "#30d158",
                  }}
                >
                  {flagged} flagged
                </div>
              </div>

              {/* Per-candidate cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                {candidates.map((c, i) => {
                  const tmScore = c.best_hit?.tm_score ?? c.tm_score ?? 0;
                  const toxinName = c.best_hit?.name || c.best_hit?.toxin || c.toxin_name || null;
                  const eValue = c.best_hit?.e_value ?? c.e_value ?? null;
                  const candidateId = c.id || c.clw_id || c.candidate_id || `#${i + 1}`;

                  return (
                    <div
                      key={i}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 5,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 600, color: "#e5e5ea" }}>
                            {candidateId}
                          </span>
                          <RiskBadge tmScore={tmScore} />
                        </div>
                        {toxinName && (
                          <div style={{ fontFamily: "monospace", fontSize: 7, color: "#636366", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            Best hit: {toxinName} · TM={tmScore.toFixed(3)}
                            {eValue != null ? ` · e=${Number(eValue).toExponential(1)}` : ""}
                          </div>
                        )}
                      </div>
                      {/* Risk bar */}
                      <div style={{ width: 30, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", flexShrink: 0 }}>
                        <div
                          style={{
                            width: `${Math.min(tmScore / TM_THRESHOLD * 100, 100)}%`,
                            height: "100%",
                            borderRadius: 2,
                            background: tmScore >= TM_THRESHOLD ? "#ff453a" : "#30d158",
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
