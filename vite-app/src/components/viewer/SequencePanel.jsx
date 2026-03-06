/**
 * SequencePanel.jsx — ProteinMPNN sequence design visualization
 *
 * 3D: colors designed residues purple, conserved grey.
 * Bottom bar: horizontal scrollable residue strip with one-letter codes + confidence coloring.
 * Hover to highlight in 3D.
 *
 * Props:
 *   viewer   — 3Dmol viewer instance
 *   design   — { residues: [...], stats: {...} } from generateMockSequenceDesign
 */

import { useEffect, useState, useRef } from "react";

export default function SequencePanel({ viewer, design }) {
  const [hoveredRes, setHoveredRes] = useState(null);
  const scrollRef = useRef(null);

  // Apply coloring to 3D structure
  useEffect(() => {
    if (!viewer || !design) return;

    viewer.setStyle(
      {},
      {
        cartoon: {
          colorfunc: (atom) => {
            const res = design.residues.find(
              (r) => r.resNum === atom.resi && r.chain === (atom.chain || "A")
            );
            if (res?.isDesigned) return "#af52de"; // purple for designed
            return "#636366"; // grey for conserved
          },
          opacity: 0.92,
        },
      }
    );
    viewer.render();

    return () => {
      viewer.setStyle(
        {},
        { cartoon: { color: "spectrum", opacity: 0.92 } }
      );
      viewer.render();
    };
  }, [viewer, design]);

  // Highlight hovered residue in 3D
  useEffect(() => {
    if (!viewer || !design) return;
    if (hoveredRes) {
      viewer.addStyle(
        { resi: hoveredRes, chain: "A" },
        { stick: { radius: 0.2, color: "#ffffff" }, sphere: { radius: 0.4, color: "#ffffff", opacity: 0.5 } }
      );
      viewer.render();
    }
    return () => {
      if (viewer) {
        // Remove highlight: reapply base style
        viewer.setStyle(
          {},
          {
            cartoon: {
              colorfunc: (atom) => {
                const res = design?.residues?.find(
                  (r) => r.resNum === atom.resi && r.chain === (atom.chain || "A")
                );
                if (res?.isDesigned) return "#af52de";
                return "#636366";
              },
              opacity: 0.92,
            },
          }
        );
        viewer.render();
      }
    };
  }, [viewer, hoveredRes, design]);

  if (!design) return null;

  const { residues, stats } = design;

  // Confidence → color
  const confColor = (c) => {
    if (c > 0.9) return "#30d158";
    if (c > 0.7) return "#65cbf3";
    if (c > 0.5) return "#ffdb13";
    return "#ff7d45";
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 44,
        left: 0,
        right: 0,
        zIndex: 15,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {/* Stats bar */}
      <div
        style={{
          margin: "0 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(12px)",
          borderRadius: 6,
          padding: "5px 10px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 8,
            color: "#30d158",
            padding: "2px 6px",
            background: "rgba(48,209,88,0.15)",
            borderRadius: 3,
            fontWeight: 600,
          }}
        >
          ProteinMPNN
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 8, color: "#86868b" }}>
          {stats.designedResidues} designed
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 8, color: "#48484a" }}>|</span>
        <span style={{ fontFamily: "monospace", fontSize: 8, color: "#86868b" }}>
          {stats.conservedResidues} conserved
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 8, color: "#48484a" }}>|</span>
        <span style={{ fontFamily: "monospace", fontSize: 8, color: "#86868b" }}>
          Avg conf: {(stats.avgConfidence * 100).toFixed(0)}%
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: "#af52de", display: "inline-block" }} />
            <span style={{ fontFamily: "monospace", fontSize: 7, color: "#636366" }}>Designed</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: "#636366", display: "inline-block" }} />
            <span style={{ fontFamily: "monospace", fontSize: 7, color: "#636366" }}>Conserved</span>
          </div>
        </div>
      </div>

      {/* Sequence strip */}
      <div
        ref={scrollRef}
        className="hide-scrollbar"
        style={{
          display: "flex",
          overflowX: "auto",
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "4px 6px",
          gap: 1,
        }}
      >
        {residues.map((res) => (
          <div
            key={res.resNum}
            onMouseEnter={() => setHoveredRes(res.resNum)}
            onMouseLeave={() => setHoveredRes(null)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 14,
              padding: "2px 1px",
              cursor: "pointer",
              borderRadius: 2,
              background:
                hoveredRes === res.resNum
                  ? "rgba(255,255,255,0.1)"
                  : "transparent",
              transition: "background 0.1s",
            }}
          >
            {/* One-letter code */}
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 9,
                fontWeight: res.isDesigned ? 700 : 400,
                color: res.isDesigned ? "#af52de" : "#48484a",
              }}
            >
              {res.designed}
            </span>
            {/* Confidence bar */}
            <div
              style={{
                width: 10,
                height: 3,
                borderRadius: 1,
                background: confColor(res.confidence),
                opacity: 0.7,
                marginTop: 1,
              }}
            />
            {/* Residue number (every 10th) */}
            {res.resNum % 10 === 0 && (
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 6,
                  color: "#3a3a3c",
                  marginTop: 1,
                }}
              >
                {res.resNum}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
