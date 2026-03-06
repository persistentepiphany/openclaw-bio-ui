/**
 * SeverityFilters.jsx — Toggle badges with counts + mini sparklines.
 */

import { SEVERITY_COLORS } from "../../utils/mapConstants";

// Mini inline sparkline using simple SVG (no extra dep)
function MiniSparkline({ data, color }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 40;
  const h = 14;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} style={{ opacity: 0.6 }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

const LEVELS = ["critical", "high", "moderate", "low"];
const LABELS = { critical: "Critical", high: "High", moderate: "Moderate", low: "Low" };

export default function SeverityFilters({
  severities,
  onToggle,
  incidents,
  timeSeriesData,
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          color: "#48484a",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 6,
          paddingLeft: 2,
        }}
      >
        Severity Filter
      </div>
      <div className="flex flex-col gap-1">
        {LEVELS.map((level) => {
          const color = SEVERITY_COLORS[level];
          const count = incidents.filter((i) => i.severity === level).length;
          const sparkData = timeSeriesData.map((d) => d[level]);
          const active = severities[level];

          return (
            <button
              key={level}
              onClick={() => onToggle(level)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-all border-none cursor-pointer"
              style={{
                background: active ? `${color}12` : "rgba(255,255,255,0.02)",
                opacity: active ? 1 : 0.4,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: active ? `0 0 6px ${color}50` : "none",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: active ? color : "#48484a",
                  flex: 1,
                  textAlign: "left",
                }}
              >
                {LABELS[level]}
              </span>
              <MiniSparkline data={sparkData} color={color} />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  color: active ? "#b0b0b5" : "#3a3a3c",
                  minWidth: 16,
                  textAlign: "right",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
