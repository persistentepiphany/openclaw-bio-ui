/**
 * IntelligenceMapPage.jsx — Orchestrator component for the Intelligence Map.
 *
 * State: selected incident, severity filters, date range.
 * Composes: KpiRow, MapContainer, LeftSidebar, DetailPanel, BottomBar.
 */

import { useState, useCallback } from "react";
import {
  mapIncidents,
  threatArcs,
  timeSeriesData,
} from "../../data/mockMapData";
import useFilteredIncidents from "../../hooks/useFilteredIncidents";
import MapContainer from "./MapContainer";
import KpiRow from "./KpiRow";
import LeftSidebar from "./LeftSidebar";
import DetailPanel from "./DetailPanel";
import BottomBar from "./BottomBar";

export default function IntelligenceMapPage() {
  /* ── State ── */
  const [selectedId, setSelectedId] = useState(null);
  const [severities, setSeverities] = useState({
    critical: true,
    high: true,
    moderate: true,
    low: true,
  });
  const [dateRange, setDateRange] = useState(null);

  /* ── Filtered incidents ── */
  const filteredIncidents = useFilteredIncidents(mapIncidents, {
    severities,
    dateRange,
  });

  /* ── Handlers ── */
  const handleSelectIncident = useCallback((id) => {
    setSelectedId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleToggleSeverity = useCallback((level) => {
    setSeverities((prev) => ({ ...prev, [level]: !prev[level] }));
  }, []);

  const handleBrushChange = useCallback((range) => {
    setDateRange(range);
  }, []);

  const selectedIncident = selectedId
    ? mapIncidents.find((i) => i.id === selectedId)
    : null;

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: "#030305",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Scanline overlay */}
      <div className="scanline-overlay" />

      {/* Map */}
      <MapContainer
        incidents={filteredIncidents}
        arcs={threatArcs}
        selectedId={selectedId}
        onSelectIncident={handleSelectIncident}
      />

      {/* KPI Row */}
      <KpiRow incidents={filteredIncidents} />

      {/* Left Sidebar */}
      <LeftSidebar
        incidents={filteredIncidents}
        allIncidents={mapIncidents}
        timeSeriesData={timeSeriesData}
        severities={severities}
        onToggleSeverity={handleToggleSeverity}
        onBrushChange={handleBrushChange}
        onSelectIncident={handleSelectIncident}
      />

      {/* Detail Panel (right) */}
      <DetailPanel
        incident={selectedIncident}
        allIncidents={mapIncidents}
        arcs={threatArcs}
        onClose={handleCloseDetail}
        onSelectIncident={handleSelectIncident}
      />

      {/* Bottom Bar */}
      <BottomBar
        incidentCount={filteredIncidents.length}
        arcCount={threatArcs.length}
      />
    </div>
  );
}
