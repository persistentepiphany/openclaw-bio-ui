/**
 * PaePanel.jsx — Predicted Aligned Error heatmap (full 2D panel)
 *
 * Renders an NxN residue-by-residue heatmap using canvas for performance.
 * Color: blue (0Å) → white (15Å) → red (30Å+).
 * Hover tooltip shows residue pair + error value.
 *
 * Props:
 *   paeMatrix — number[][] from generateMockPae
 *   pdbId     — PDB code for display
 */

import { useEffect, useRef, useState } from "react";
import { paeColor } from "../../data/mockDesignData";

export default function PaePanel({ paeMatrix, pdbId }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const N = paeMatrix?.length || 0;

  // Draw heatmap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || N === 0) return;

    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width - 60, rect.height - 100);
    const cellSize = Math.max(1, Math.floor(size / N));
    const canvasSize = cellSize * N;

    canvas.width = canvasSize;
    canvas.height = canvasSize;
    setDims({ w: canvasSize, h: canvasSize, cellSize });

    const ctx = canvas.getContext("2d");
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        ctx.fillStyle = paeColor(paeMatrix[i][j]);
        ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
      }
    }
  }, [paeMatrix, N]);

  // Handle hover
  const handleMouseMove = (e) => {
    if (!dims.cellSize || N === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / dims.cellSize);
    const row = Math.floor(y / dims.cellSize);
    if (row >= 0 && row < N && col >= 0 && col < N) {
      setHover({ row: row + 1, col: col + 1, value: paeMatrix[row][col], x: e.clientX, y: e.clientY });
    } else {
      setHover(null);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        background: "#030305",
        overflow: "auto",
        padding: "16px 14px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          alignSelf: "flex-start",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            color: "#ff9f0a",
            padding: "3px 8px",
            background: "rgba(255,159,10,0.1)",
            borderRadius: 4,
            border: "1px solid rgba(255,159,10,0.2)",
          }}
        >
          PAE
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "#636366" }}>
          Predicted Aligned Error — {pdbId} ({N} residues)
        </span>
      </div>

      {/* Heatmap canvas */}
      <div style={{ position: "relative" }}>
        {/* Y-axis label */}
        <div
          style={{
            position: "absolute",
            left: -30,
            top: "50%",
            transform: "rotate(-90deg) translateX(-50%)",
            fontFamily: "monospace",
            fontSize: 8,
            color: "#636366",
            whiteSpace: "nowrap",
          }}
        >
          Scored residue
        </div>

        <canvas
          ref={canvasRef}
          style={{
            borderRadius: 4,
            cursor: "crosshair",
            maxWidth: "100%",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        />

        {/* X-axis label */}
        <div
          style={{
            textAlign: "center",
            fontFamily: "monospace",
            fontSize: 8,
            color: "#636366",
            marginTop: 6,
          }}
        >
          Aligned residue
        </div>
      </div>

      {/* Color scale legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span style={{ fontFamily: "monospace", fontSize: 7, color: "#636366" }}>0 Å</span>
        <div
          style={{
            width: 200,
            height: 12,
            borderRadius: 3,
            background: "linear-gradient(90deg, #0000ff, #ffffff 50%, #ff0000)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
        <span style={{ fontFamily: "monospace", fontSize: 7, color: "#636366" }}>30+ Å</span>
      </div>

      {/* Hover tooltip */}
      {hover && (
        <div
          style={{
            position: "fixed",
            left: hover.x + 12,
            top: hover.y - 30,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            padding: "5px 8px",
            fontFamily: "monospace",
            fontSize: 9,
            color: "#e5e5ea",
            zIndex: 100,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          Residues {hover.row} × {hover.col}:{" "}
          <span style={{ color: "#ff9f0a", fontWeight: 600 }}>
            {hover.value.toFixed(1)} Å
          </span>
        </div>
      )}
    </div>
  );
}
