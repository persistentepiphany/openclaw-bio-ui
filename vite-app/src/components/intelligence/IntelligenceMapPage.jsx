/**
 * IntelligenceMapPage.jsx — Orchestrator component for the Intelligence Map.
 *
 * State: selected incident, severity filters, date range.
 * Composes: KpiRow, MapContainer, LeftSidebar, DetailPanel, BottomBar.
 *
 * Props:
 *   scraperReport – optional report object from the Scraper API
 */

import { useState, useCallback, useEffect } from "react";
import {
  mapIncidents as defaultIncidents,
  threatArcs,
  timeSeriesData,
} from "../../data/mockMapData";
import { fetchBiosecurity } from "../../api/client";
import useFilteredIncidents from "../../hooks/useFilteredIncidents";
import MapContainer from "./MapContainer";
import KpiRow from "./KpiRow";
import LeftSidebar from "./LeftSidebar";
import DetailPanel from "./DetailPanel";
import BottomBar from "./BottomBar";

/* ── Simple geocoding lookup for common locations ── */
const LOCATION_COORDS = {
  "cambodia": { lat: 12.57, lng: 104.99 },
  "united states": { lat: 39.83, lng: -98.58 },
  "usa": { lat: 39.83, lng: -98.58 },
  "china": { lat: 35.86, lng: 104.20 },
  "india": { lat: 20.59, lng: 78.96 },
  "brazil": { lat: -14.24, lng: -51.93 },
  "indonesia": { lat: -0.79, lng: 113.92 },
  "nigeria": { lat: 9.08, lng: 8.68 },
  "japan": { lat: 36.20, lng: 138.25 },
  "south korea": { lat: 35.91, lng: 127.77 },
  "germany": { lat: 51.17, lng: 10.45 },
  "france": { lat: 46.60, lng: 1.89 },
  "united kingdom": { lat: 55.38, lng: -3.44 },
  "uk": { lat: 55.38, lng: -3.44 },
  "australia": { lat: -25.27, lng: 133.78 },
  "canada": { lat: 56.13, lng: -106.35 },
  "mexico": { lat: 23.63, lng: -102.55 },
  "egypt": { lat: 26.82, lng: 30.80 },
  "south africa": { lat: -30.56, lng: 22.94 },
  "russia": { lat: 61.52, lng: 105.32 },
  "thailand": { lat: 15.87, lng: 100.99 },
  "vietnam": { lat: 14.06, lng: 108.28 },
  "philippines": { lat: 12.88, lng: 121.77 },
  "italy": { lat: 41.87, lng: 12.57 },
  "spain": { lat: 40.46, lng: -3.75 },
  "iran": { lat: 32.43, lng: 53.69 },
  "turkey": { lat: 38.96, lng: 35.24 },
  "democratic republic of the congo": { lat: -4.04, lng: 21.76 },
  "drc": { lat: -4.04, lng: 21.76 },
  "saudi arabia": { lat: 23.89, lng: 45.08 },
  "iowa": { lat: 42.03, lng: -93.63 },
  "texas": { lat: 31.97, lng: -99.90 },
  "california": { lat: 36.78, lng: -119.42 },
  "hong kong": { lat: 22.40, lng: 114.11 },
  "global": { lat: 20.0, lng: 0.0 },
};

/**
 * Try to resolve a location string to lat/lng.
 * Returns null if no match found.
 */
function geocodeLocation(location) {
  if (!location) return null;
  const lower = location.toLowerCase().trim();
  // Direct match
  if (LOCATION_COORDS[lower]) return LOCATION_COORDS[lower];
  // Partial match — check if any known key is contained in the location string
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (lower.includes(key) || key.includes(lower)) return coords;
  }
  return null;
}

export default function IntelligenceMapPage({ scraperReport, dashboardMode }) {
  /* ── State ── */
  const [selectedId, setSelectedId] = useState(null);
  const [incidents, setIncidents] = useState(
    dashboardMode === "live" ? [] : defaultIncidents
  );
  const [severities, setSeverities] = useState({
    critical: true,
    high: true,
    moderate: true,
    low: true,
  });
  const [dateRange, setDateRange] = useState(null);

  /* ── Reset incidents on mode switch ── */
  useEffect(() => {
    setIncidents(dashboardMode === "live" ? [] : defaultIncidents);
  }, [dashboardMode]);

  /* ── Fetch biosecurity data from API (mock stays as fallback) ── */
  useEffect(() => {
    (async () => {
      const result = await fetchBiosecurity();
      // Only replace if we got actual data (not empty array)
      if (Array.isArray(result) && result.length > 0) setIncidents(result);
    })();
  }, []);

  /* ── Merge scraper threat data into map incidents ── */
  useEffect(() => {
    if (!scraperReport?.threats) return;

    let nextId = 1000; // Offset to avoid colliding with mock incident IDs
    const scraperIncidents = scraperReport.threats.flatMap((threat) =>
      (threat.entries || [])
        .map((e) => {
          const coords = geocodeLocation(e.location);
          if (!coords) return null; // Skip entries we can't place on the map
          return {
            id: nextId++,
            lat: coords.lat + (Math.random() - 0.5) * 2, // Jitter to avoid stacking
            lng: coords.lng + (Math.random() - 0.5) * 2,
            title: e.title,
            location: e.location,
            source: e.source_name || "Scraper",
            date: e.timestamp?.split("T")[0] || "",
            strain: threat.pathogen,
            pathogen: threat.pathogen,
            timestamp: e.timestamp,
            assessment: e.reasoning || e.title,
            severity: (threat.severity || "moderate").toLowerCase(),
            confidence: e.confidence || 50,
            casualties: 0,
            affected: 0,
            actions: [],
            url: e.url,
            fromScraper: true,
          };
        })
        .filter(Boolean)
    );

    if (scraperIncidents.length > 0) {
      setIncidents((prev) => {
        const mockItems = prev.filter((i) => !i.fromScraper);
        return [...mockItems, ...scraperIncidents];
      });
    }
  }, [scraperReport]);

  /* ── Filtered incidents ── */
  const filteredIncidents = useFilteredIncidents(incidents, {
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
    ? incidents.find((i) => i.id === selectedId)
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
        allIncidents={incidents}
        timeSeriesData={timeSeriesData}
        severities={severities}
        onToggleSeverity={handleToggleSeverity}
        onBrushChange={handleBrushChange}
        onSelectIncident={handleSelectIncident}
      />

      {/* Detail Panel (right) */}
      <DetailPanel
        incident={selectedIncident}
        allIncidents={incidents}
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
