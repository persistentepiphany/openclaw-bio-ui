/**
 * LeftSidebar.jsx — Glass overlay panel (320px) containing:
 *   - TemporalTimeline
 *   - SeverityFilters
 *   - LiveAlertFeed
 *   - PathogenBreakdown
 */

import { GLASS_STYLE } from "../../utils/mapConstants";
import TemporalTimeline from "./TemporalTimeline";
import SeverityFilters from "./SeverityFilters";
import LiveAlertFeed from "./LiveAlertFeed";
import PathogenBreakdown from "./PathogenBreakdown";

export default function LeftSidebar({
  incidents,
  allIncidents,
  timeSeriesData,
  severities,
  onToggleSeverity,
  onBrushChange,
  onSelectIncident,
}) {
  return (
    <div
      className="absolute top-3 left-3 bottom-10 z-20 flex flex-col overflow-hidden"
      style={{
        width: 300,
        ...GLASS_STYLE,
        padding: "12px 10px",
      }}
    >
      {/* LIVE header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className="animate-pulse-glow"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#ff453a",
            boxShadow: "0 0 8px rgba(255,69,58,0.5)",
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            color: "#ff453a",
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}
        >
          Live
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "#48484a",
          }}
        >
          Global Threat Picture
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        <TemporalTimeline data={timeSeriesData} onBrushChange={onBrushChange} />

        <SeverityFilters
          severities={severities}
          onToggle={onToggleSeverity}
          incidents={allIncidents}
          timeSeriesData={timeSeriesData}
        />

        <LiveAlertFeed
          incidents={incidents}
          onSelectIncident={onSelectIncident}
        />

        <PathogenBreakdown incidents={incidents} />
      </div>

      {/* Sources footer */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          paddingTop: 6,
          marginTop: 6,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 7,
          color: "#2a2a2c",
          lineHeight: 1.5,
          paddingLeft: 2,
        }}
      >
        Sources:{" "}
        {[...new Set(allIncidents.map((i) => i.source))].join(" · ")}
      </div>
    </div>
  );
}
