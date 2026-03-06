/**
 * KpiRow.jsx — 4 KPI cards above the map.
 */

import { SEVERITY_COLORS, GLASS_STYLE } from "../../utils/mapConstants";

const kpiCardStyle = {
  ...GLASS_STYLE,
  padding: "10px 16px",
  minWidth: 140,
  flex: 1,
};

export default function KpiRow({ incidents }) {
  const critical = incidents.filter((i) => i.severity === "critical").length;
  const high = incidents.filter((i) => i.severity === "high").length;
  const pathogens = [...new Set(incidents.map((i) => i.pathogen))].length;
  const containmentZones = incidents.filter((i) => i.containmentZone > 0).length;

  const cards = [
    {
      label: "Active Incidents",
      value: incidents.length,
      color: "#f5f5f7",
      accent: "#4d9eff",
    },
    {
      label: "Critical Alerts",
      value: critical,
      color: SEVERITY_COLORS.critical,
      accent: SEVERITY_COLORS.critical,
    },
    {
      label: "Pathogens Tracked",
      value: pathogens,
      color: "#bf5af2",
      accent: "#bf5af2",
    },
    {
      label: "Containment Zones",
      value: containmentZones,
      color: SEVERITY_COLORS.high,
      accent: SEVERITY_COLORS.high,
    },
  ];

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-2.5">
      {cards.map((card) => (
        <div key={card.label} style={kpiCardStyle}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              color: "#48484a",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 22,
              fontWeight: 700,
              color: card.color,
              lineHeight: 1,
            }}
          >
            {card.value}
          </div>
          <div
            style={{
              marginTop: 4,
              height: 2,
              borderRadius: 1,
              background: `${card.accent}30`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (card.value / incidents.length) * 100)}%`,
                background: card.accent,
                borderRadius: 1,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
