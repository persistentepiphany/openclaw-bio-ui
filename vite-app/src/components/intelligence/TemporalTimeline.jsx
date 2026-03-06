/**
 * TemporalTimeline.jsx — Recharts area chart with brush for 30-day incident timeline.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
  ResponsiveContainer,
} from "recharts";
import { SEVERITY_COLORS } from "../../utils/mapConstants";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div
      style={{
        background: "rgba(8,8,12,0.95)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 6,
        padding: "6px 10px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
      }}
    >
      <div style={{ color: "#86868b", marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 1 }}>
          {p.dataKey}: {p.value}
        </div>
      ))}
    </div>
  );
}

export default function TemporalTimeline({ data, onBrushChange }) {
  const handleBrush = (range) => {
    if (!range || range.startIndex === undefined) return;
    const start = new Date(data[range.startIndex].date).getTime();
    const end = new Date(data[range.endIndex].date).getTime() + 86400000;
    onBrushChange([start, end]);
  };

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
        Incident Timeline (30d)
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <AreaChart data={data} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SEVERITY_COLORS.critical} stopOpacity={0.4} />
              <stop offset="100%" stopColor={SEVERITY_COLORS.critical} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SEVERITY_COLORS.high} stopOpacity={0.3} />
              <stop offset="100%" stopColor={SEVERITY_COLORS.high} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradModerate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SEVERITY_COLORS.moderate} stopOpacity={0.2} />
              <stop offset="100%" stopColor={SEVERITY_COLORS.moderate} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 7, fill: "#3a3a3c", fontFamily: "'JetBrains Mono', monospace" }}
            tickFormatter={(d) => d.slice(5)}
            axisLine={{ stroke: "#1c1c1c" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 7, fill: "#3a3a3c", fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="critical"
            stackId="1"
            stroke={SEVERITY_COLORS.critical}
            fill="url(#gradCritical)"
            strokeWidth={1}
          />
          <Area
            type="monotone"
            dataKey="high"
            stackId="1"
            stroke={SEVERITY_COLORS.high}
            fill="url(#gradHigh)"
            strokeWidth={1}
          />
          <Area
            type="monotone"
            dataKey="moderate"
            stackId="1"
            stroke={SEVERITY_COLORS.moderate}
            fill="url(#gradModerate)"
            strokeWidth={1}
          />
          <Brush
            dataKey="date"
            height={16}
            stroke="#1c1c1c"
            fill="rgba(8,8,12,0.9)"
            tickFormatter={(d) => d.slice(5)}
            onChange={handleBrush}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
