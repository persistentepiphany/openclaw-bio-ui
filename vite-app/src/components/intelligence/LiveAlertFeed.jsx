/**
 * LiveAlertFeed.jsx — Scrollable alert feed (adapted from ActivityFeed pattern).
 * Click an alert to fly the map to that incident.
 */

import { SEVERITY_COLORS, SEVERITY_ORDER } from "../../utils/mapConstants";

export default function LiveAlertFeed({ incidents, onSelectIncident }) {
  // Sort by severity then date
  const sorted = [...incidents].sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] || 9) - (SEVERITY_ORDER[b.severity] || 9);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        className="flex items-center justify-between mb-1.5"
        style={{ paddingLeft: 2, paddingRight: 2 }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="animate-pulse-glow"
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#ff453a",
              boxShadow: "0 0 6px rgba(255,69,58,0.4)",
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              color: "#48484a",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Live Feed
          </span>
        </div>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            color: "#3a3a3c",
          }}
        >
          {incidents.length}
        </span>
      </div>

      <div
        className="overflow-y-auto"
        style={{ maxHeight: 220, scrollbarWidth: "thin" }}
      >
        {sorted.map((inc) => {
          const color = SEVERITY_COLORS[inc.severity];
          const timeAgo = getTimeAgo(inc.timestamp);

          return (
            <div
              key={inc.id}
              onClick={() => onSelectIncident(inc.id)}
              className="flex gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
              style={{ marginBottom: 2 }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 4px ${color}40`,
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontSize: 10,
                    color: "#b0b0b5",
                    lineHeight: 1.3,
                    fontFamily: "'Inter', system-ui",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {inc.title}
                </div>
                <div
                  className="flex items-center gap-1.5"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    color: "#3a3a3c",
                    marginTop: 1,
                  }}
                >
                  <span>{inc.location}</span>
                  <span style={{ color: "#1c1c1c" }}>|</span>
                  <span>{timeAgo}</span>
                </div>
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 7,
                  padding: "1px 4px",
                  borderRadius: 3,
                  background: `${color}15`,
                  color,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  alignSelf: "center",
                  flexShrink: 0,
                }}
              >
                {inc.severity.slice(0, 4)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
