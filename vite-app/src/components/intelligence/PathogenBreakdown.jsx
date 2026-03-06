/**
 * PathogenBreakdown.jsx — Horizontal bar chart showing pathogen distribution.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const PATHOGEN_COLORS = [
  "#ff453a",
  "#ff9f0a",
  "#ffd60a",
  "#30d158",
  "#4d9eff",
  "#bf5af2",
  "#ff6482",
  "#64d2ff",
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
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
      <div style={{ color: "#b0b0b5" }}>
        {d.name}: {d.count} incident{d.count !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default function PathogenBreakdown({ incidents }) {
  // Group by pathogen
  const counts = {};
  incidents.forEach((inc) => {
    const p = inc.pathogen || "Unknown";
    counts[p] = (counts[p] || 0) + 1;
  });

  const data = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div>
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
        Pathogen Breakdown
      </div>
      <ResponsiveContainer width="100%" height={Math.max(80, data.length * 22 + 10)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 4, left: -10, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 7, fill: "#3a3a3c", fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 8, fill: "#86868b", fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={12}>
            {data.map((_, i) => (
              <Cell key={i} fill={PATHOGEN_COLORS[i % PATHOGEN_COLORS.length]} opacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
