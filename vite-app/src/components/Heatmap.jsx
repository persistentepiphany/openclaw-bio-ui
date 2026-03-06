/**
 * Heatmap.jsx — Cross-variant interaction matrix with colour-coded cells.
 *
 * Colour scale: red (low affinity) → amber → green (high affinity).
 * Hovering a cell shows a floating tooltip with the exact score and a
 * qualitative label (Strong / Moderate / Weak).
 *
 * Props:
 *   data    – { variants: string[], items: string[], matrix: number[][] }
 *   loading – boolean, show shimmer skeleton
 */
import { useState } from "react";

export default function Heatmap({ data, loading }) {
  const [tooltip, setTooltip] = useState(null);

  // Interpolate from red (#ff453a) through amber (#ff9f0a) to green (#30d158)
  const heatColor = (v) => {
    let r, g, b;
    if (v < 0.5) {
      const t = v * 2;
      r = Math.round(255 - 50 * t);
      g = Math.round(69 + 100 * t);
      b = Math.round(58 - 38 * t);
    } else {
      const t = (v - 0.5) * 2;
      r = Math.round(205 - 157 * t);
      g = Math.round(169 + 40 * t);
      b = Math.round(20 + 68 * t);
    }
    return `rgba(${r}, ${g}, ${b}, 0.55)`;
  };

  const strengthLabel = (v) =>
    v >= 0.7 ? "Strong binding" : v >= 0.4 ? "Moderate" : "Weak binding";

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="border-t border-[#141414]">
        <div className="px-4 pt-2.5 pb-1 text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
          Interaction Matrix
        </div>
        <div className="grid gap-[3px] px-4 pb-3" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="skeleton h-[26px] rounded-[3px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[#141414] relative">
      <div className="px-4 pt-2.5 pb-1 text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
        Interaction Matrix
      </div>

      {/* ── Grid ── */}
      <div
        className="grid gap-[3px] px-4 pb-1"
        style={{ gridTemplateColumns: `48px repeat(${data.variants.length}, 1fr)` }}
      >
        {/* Column headers (variant names) */}
        <div />
        {data.variants.map((v, i) => (
          <div key={i} className="text-center font-mono text-[8px] text-[#48484a] py-0.5 font-medium">
            {v}
          </div>
        ))}

        {/* Data rows */}
        {data.matrix.map((row, ri) => (
          <div key={ri} className="contents">
            {/* Row label (candidate ID suffix) */}
            <div className="font-mono text-[8px] text-[#48484a] flex items-center font-medium">
              {data.items?.[ri] || `R${ri + 1}`}
            </div>

            {row.map((v, ci) => (
              <div
                key={ci}
                className="rounded-[3px] h-[26px] flex items-center justify-center font-mono text-[9px] font-medium
                  cursor-default transition-all duration-200 hover:scale-110 hover:z-10"
                style={{
                  background: heatColor(v),
                  color: v > 0.65 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
                }}
                onMouseEnter={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 6,
                    item: data.items?.[ri] || `R${ri + 1}`,
                    variant: data.variants[ci],
                    value: v,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                {v.toFixed(2)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Colour legend (below the matrix) ── */}
      <div className="flex items-center justify-center gap-1.5 px-4 pb-2.5 pt-1">
        <span className="text-[7.5px] font-mono text-[#ff453a]">Low</span>
        <div
          className="w-16 h-1.5 rounded-full"
          style={{
            background:
              "linear-gradient(to right, rgba(255,69,58,0.6), rgba(255,159,10,0.6), rgba(48,209,88,0.6))",
          }}
        />
        <span className="text-[7.5px] font-mono text-[#30d158]">High</span>
      </div>

      {/* ── Floating tooltip ── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none animate-fadeIn"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 shadow-2xl">
            <div className="text-[10px] font-mono text-[#86868b]">
              CLW-{tooltip.item} × {tooltip.variant}
            </div>
            <div
              className="text-[12px] font-mono font-bold mt-0.5"
              style={{
                color:
                  tooltip.value >= 0.7
                    ? "#30d158"
                    : tooltip.value >= 0.4
                    ? "#ff9f0a"
                    : "#ff453a",
              }}
            >
              {tooltip.value.toFixed(3)}
            </div>
            <div className="text-[8px] text-[#48484a] mt-0.5">
              {strengthLabel(tooltip.value)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
