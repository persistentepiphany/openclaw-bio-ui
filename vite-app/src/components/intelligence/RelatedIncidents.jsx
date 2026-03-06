/**
 * RelatedIncidents.jsx — Nearby / linked incidents list inside DetailPanel.
 */

import { useState } from "react";
import { SEVERITY_COLORS } from "../../utils/mapConstants";

export default function RelatedIncidents({ relatedArcs, onSelectIncident }) {
  const [expanded, setExpanded] = useState(true);

  if (!relatedArcs || relatedArcs.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: expanded ? 6 : 0,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            color: "#48484a",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Intelligence Links ({relatedArcs.length})
        </span>
        <span
          style={{
            fontSize: 8,
            color: "#48484a",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          ▶
        </span>
      </button>

      {expanded &&
        relatedArcs.map((a, i) => (
          <div
            key={i}
            onClick={() => a.otherIncident && onSelectIncident(a.otherIncident.id)}
            style={{
              background: "rgba(77,158,255,0.04)",
              border: "1px solid rgba(77,158,255,0.08)",
              borderRadius: 6,
              padding: "8px 10px",
              marginBottom: 4,
              cursor: a.otherIncident ? "pointer" : "default",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              a.otherIncident &&
              (e.currentTarget.style.background = "rgba(77,158,255,0.08)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(77,158,255,0.04)")
            }
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 7,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: `${SEVERITY_COLORS[a.severity]}18`,
                  color: SEVERITY_COLORS[a.severity],
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {a.type}
              </span>
              {a.otherIncident && (
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: "#4d9eff",
                  }}
                >
                  &rarr; {a.otherIncident.title}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 8,
                color: "#636366",
                lineHeight: 1.4,
                fontFamily: "'Inter', system-ui",
              }}
            >
              {a.label}
            </div>
          </div>
        ))}
    </div>
  );
}
