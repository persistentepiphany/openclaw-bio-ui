/**
 * PlddtOverlay.jsx — pLDDT confidence coloring for 3Dmol viewer
 *
 * Applies AlphaFold-convention coloring to cartoon ribbon based on B-factor field.
 * Shows a color legend bar at the bottom.
 *
 * Props:
 *   viewer  — 3Dmol viewer instance ref
 *   plddt   — array of { resNum, chain, plddt } from mockDesignData
 */

import { useEffect } from "react";
import { plddtColor } from "../../data/mockDesignData";

const LEGEND = [
  { label: ">90", color: "#0053d6", desc: "Very high" },
  { label: "70-90", color: "#65cbf3", desc: "Confident" },
  { label: "50-70", color: "#ffdb13", desc: "Low" },
  { label: "<50", color: "#ff7d45", desc: "Very low" },
];

export default function PlddtOverlay({ viewer, plddt }) {
  useEffect(() => {
    if (!viewer) return;

    // Apply colorfunc based on B-factor (where pLDDT is stored)
    viewer.setStyle(
      {},
      {
        cartoon: {
          colorfunc: (atom) => {
            return plddtColor(atom.b);
          },
          opacity: 0.92,
        },
      }
    );
    viewer.render();

    // No cleanup — MoleculeViewer's restoreStructureView handles it on mode switch
  }, [viewer, plddt]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 44,
        left: 10,
        right: 10,
        zIndex: 15,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 9,
          color: "#86868b",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            padding: "2px 6px",
            background: "rgba(0,83,214,0.15)",
            color: "#65cbf3",
            borderRadius: 3,
            fontSize: 8,
            fontWeight: 600,
          }}
        >
          pLDDT
        </span>
        Predicted Local Distance Difference Test
      </div>

      {/* Color legend bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderRadius: 4,
          overflow: "hidden",
          height: 18,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {LEGEND.map((l) => (
          <div
            key={l.label}
            style={{
              flex: 1,
              background: l.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 7,
                color: l.color === "#ffdb13" ? "#333" : "#fff",
                fontWeight: 600,
                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
              }}
            >
              {l.label}
            </span>
          </div>
        ))}
      </div>

      {/* Text labels below */}
      <div style={{ display: "flex" }}>
        {LEGEND.map((l) => (
          <div
            key={l.label}
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: "monospace",
              fontSize: 7,
              color: "#48484a",
            }}
          >
            {l.desc}
          </div>
        ))}
      </div>
    </div>
  );
}
