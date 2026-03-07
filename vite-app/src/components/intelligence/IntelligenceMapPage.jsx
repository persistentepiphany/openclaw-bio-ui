/**
 * IntelligenceMapPage.jsx — Orchestrator component for the Intelligence Map.
 *
 * State: selected incident, severity filters, date range.
 * Composes: KpiRow, MapContainer, LeftSidebar, DetailPanel, BottomBar.
 *
 * Props:
 *   scraperReport – optional report object from the Scraper API
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  mapIncidents as defaultIncidents,
  timeSeriesData as mockTimeSeriesData,
} from "../../data/mockMapData";
import { fetchBiosecurity } from "../../api/client";
import useFilteredIncidents from "../../hooks/useFilteredIncidents";
import MapContainer from "./MapContainer";
import KpiRow from "./KpiRow";
import LeftSidebar from "./LeftSidebar";
import DetailPanel from "./DetailPanel";
import BottomBar from "./BottomBar";

/* ── Geocoding lookup — covers all real scraper locations + common countries ── */
const LOCATION_COORDS = {
  // Countries
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
  "england": { lat: 52.36, lng: -1.17 },
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
  "hong kong": { lat: 22.40, lng: 114.11 },
  "bangladesh": { lat: 23.68, lng: 90.36 },
  "belgium": { lat: 50.50, lng: 4.47 },
  "comoros": { lat: -11.88, lng: 43.87 },
  "equatorial guinea": { lat: 1.65, lng: 10.27 },
  "gambia": { lat: 13.44, lng: -15.31 },
  "the gambia": { lat: 13.44, lng: -15.31 },
  "laos": { lat: 19.86, lng: 102.50 },
  "lebanon": { lat: 33.85, lng: 35.86 },
  "madagascar": { lat: -18.77, lng: 46.87 },
  "peru": { lat: -9.19, lng: -75.02 },
  "puerto rico": { lat: 18.22, lng: -66.59 },
  "sierra leone": { lat: 8.46, lng: -11.78 },
  "slovakia": { lat: 48.67, lng: 19.70 },
  "switzerland": { lat: 46.82, lng: 8.23 },
  "uganda": { lat: 1.37, lng: 32.29 },
  "kenya": { lat: -0.02, lng: 37.91 },
  "tanzania": { lat: -6.37, lng: 34.89 },
  "ethiopia": { lat: 9.15, lng: 40.49 },
  "pakistan": { lat: 30.38, lng: 69.35 },
  "malaysia": { lat: 4.21, lng: 101.98 },
  "nepal": { lat: 28.39, lng: 84.12 },
  "myanmar": { lat: 21.91, lng: 95.96 },
  "colombia": { lat: 4.57, lng: -74.30 },
  "argentina": { lat: -38.42, lng: -63.62 },
  "chile": { lat: -35.68, lng: -71.54 },
  "poland": { lat: 51.92, lng: 19.15 },
  "netherlands": { lat: 52.13, lng: 5.29 },
  "sweden": { lat: 60.13, lng: 18.64 },
  "norway": { lat: 60.47, lng: 8.47 },
  "finland": { lat: 61.92, lng: 25.75 },
  "ghana": { lat: 7.95, lng: -1.02 },
  "senegal": { lat: 14.50, lng: -14.45 },
  "mali": { lat: 17.57, lng: -4.00 },
  "mozambique": { lat: -18.67, lng: 35.53 },
  "zimbabwe": { lat: -19.02, lng: 29.15 },
  "cameroon": { lat: 7.37, lng: 12.35 },
  "guinea": { lat: 9.95, lng: -9.70 },
  "liberia": { lat: 6.43, lng: -9.43 },
  "somalia": { lat: 5.15, lng: 46.20 },
  "sudan": { lat: 12.86, lng: 30.22 },
  "south sudan": { lat: 6.88, lng: 31.31 },
  "yemen": { lat: 15.55, lng: 48.52 },
  "iraq": { lat: 33.22, lng: 43.68 },
  "afghanistan": { lat: 33.94, lng: 67.71 },
  "taiwan": { lat: 23.70, lng: 120.96 },
  "singapore": { lat: 1.35, lng: 103.82 },
  // US states
  "iowa": { lat: 42.03, lng: -93.63 },
  "texas": { lat: 31.97, lng: -99.90 },
  "california": { lat: 36.78, lng: -119.42 },
  "minnesota": { lat: 46.73, lng: -94.69 },
  "nebraska": { lat: 41.49, lng: -99.90 },
  "new york": { lat: 40.71, lng: -74.01 },
  "washington": { lat: 47.75, lng: -120.74 },
  "wisconsin": { lat: 43.78, lng: -88.79 },
  "florida": { lat: 27.66, lng: -81.52 },
  "colorado": { lat: 39.55, lng: -105.78 },
  "ohio": { lat: 40.42, lng: -82.91 },
  "michigan": { lat: 44.31, lng: -85.60 },
  "pennsylvania": { lat: 41.20, lng: -77.19 },
  "georgia": { lat: 32.17, lng: -82.90 },
  "idaho": { lat: 44.07, lng: -114.74 },
  "oregon": { lat: 43.80, lng: -120.55 },
  "king county": { lat: 47.49, lng: -121.84 },
  // Regions
  "africa": { lat: 8.78, lng: 34.51 },
  "west africa": { lat: 8.00, lng: -5.00 },
  "central africa": { lat: 2.00, lng: 20.00 },
  "east africa": { lat: 0.00, lng: 37.00 },
  "europe": { lat: 50.00, lng: 10.00 },
  "americas": { lat: 15.00, lng: -80.00 },
  "southeast asia": { lat: 14.00, lng: 108.00 },
  "middle east": { lat: 29.00, lng: 42.00 },
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

/**
 * Haversine distance in km between two lat/lng points.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Generate threat arcs from incidents.
 *
 * Reduces noise by first grouping incidents by location, then connecting
 * distinct locations that share a pathogen. Only one arc per
 * (pathogen, locationA, locationB) pair. Keeps the map clean.
 */
function generateArcsFromIncidents(incidents) {
  if (!incidents || incidents.length < 2) return [];

  // Group by location (rounded to 1° to collapse jittered points)
  const locKey = (inc) => `${Math.round(inc.lat)},${Math.round(inc.lng)}`;

  // Build: pathogen → Set of { locKey, lat, lng, severity, location }
  const pathogenLocations = new Map();
  for (const inc of incidents) {
    const pathogen = (inc.pathogen || inc.strain || "").toLowerCase();
    if (!pathogen) continue;
    const lk = locKey(inc);
    if (!pathogenLocations.has(pathogen)) pathogenLocations.set(pathogen, new Map());
    const locs = pathogenLocations.get(pathogen);
    if (!locs.has(lk)) {
      locs.set(lk, {
        lat: inc.lat,
        lng: inc.lng,
        severity: inc.severity,
        location: inc.location || "",
        confidence: inc.confidence || 50,
      });
    } else {
      // Keep highest severity
      const existing = locs.get(lk);
      const sevRank = { critical: 4, high: 3, moderate: 2, low: 1 };
      if ((sevRank[inc.severity] || 0) > (sevRank[existing.severity] || 0)) {
        existing.severity = inc.severity;
      }
      if (inc.confidence > existing.confidence) existing.confidence = inc.confidence;
    }
  }

  const arcs = [];
  const seen = new Set();

  for (const [pathogen, locs] of pathogenLocations) {
    const points = [...locs.values()];
    if (points.length < 2) continue;

    // Connect locations for this pathogen (limit to avoid clutter)
    for (let i = 0; i < points.length && i < 8; i++) {
      for (let j = i + 1; j < points.length && j < 8; j++) {
        const a = points[i];
        const b = points[j];
        const dist = haversineKm(a.lat, a.lng, b.lat, b.lng);

        // Skip very short arcs (same region, jitter noise)
        if (dist < 200) continue;

        const arcKey = `${Math.round(a.lat)},${Math.round(a.lng)}-${Math.round(b.lat)},${Math.round(b.lng)}`;
        if (seen.has(arcKey)) continue;
        seen.add(arcKey);

        const sev =
          a.severity === "critical" || b.severity === "critical"
            ? "critical"
            : a.severity === "high" || b.severity === "high"
            ? "high"
            : "moderate";

        arcs.push({
          startLat: a.lat,
          startLng: a.lng,
          endLat: b.lat,
          endLng: b.lng,
          severity: sev,
          type: "genomic",
          label: `${pathogen.toUpperCase()} — ${a.location} ↔ ${b.location}`,
        });
      }
    }
  }

  return arcs;
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

  /* ── Fetch biosecurity data from API (live mode only) ── */
  useEffect(() => {
    if (dashboardMode !== "live") return;
    let cancelled = false;
    (async () => {
      const result = await fetchBiosecurity();
      if (!cancelled && Array.isArray(result) && result.length > 0) {
        setIncidents(result);
      }
    })();
    return () => { cancelled = true; };
  }, [dashboardMode]);

  /* ── Merge scraper threat data into map incidents (live mode only) ── */
  useEffect(() => {
    if (dashboardMode !== "live") return;
    if (!scraperReport?.threats) return;

    let nextId = 1000;
    const scraperIncidents = scraperReport.threats.flatMap((threat) =>
      (threat.entries || [])
        .map((e) => {
          const coords = geocodeLocation(e.location);
          if (!coords) return null;
          return {
            id: nextId++,
            lat: coords.lat + (Math.random() - 0.5) * 2,
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
        const existing = prev.filter((i) => !i.fromScraper);
        // Cap at 500 incidents to prevent map performance degradation
        return [...existing, ...scraperIncidents].slice(0, 500);
      });
    }
  }, [scraperReport, dashboardMode]);

  /* ── Time series: mock in demo, derived from live incidents in live mode ── */
  const timeSeriesData = useMemo(() => {
    if (dashboardMode !== "live") return mockTimeSeriesData;
    if (incidents.length === 0) return [];

    // Build 30-day buckets from actual incident dates
    const now = new Date();
    const buckets = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      buckets.push({ date: dateStr, critical: 0, high: 0, moderate: 0, low: 0, total: 0 });
    }
    const dateSet = new Set(buckets.map((b) => b.date));

    for (const inc of incidents) {
      const incDate = (inc.date || inc.timestamp?.split("T")[0] || "").slice(0, 10);
      if (!dateSet.has(incDate)) continue;
      const bucket = buckets.find((b) => b.date === incDate);
      if (!bucket) continue;
      const sev = (inc.severity || "moderate").toLowerCase();
      if (bucket[sev] !== undefined) bucket[sev]++;
      bucket.total++;
    }
    return buckets;
  }, [dashboardMode, incidents]);

  /* ── Filtered incidents ── */
  const filteredIncidents = useFilteredIncidents(incidents, {
    severities,
    dateRange,
  });

  /* ── Arcs: generated from actual map incidents ── */
  const arcs = useMemo(
    () => generateArcsFromIncidents(filteredIncidents),
    [filteredIncidents]
  );

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
        arcs={arcs}
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
        arcs={arcs}
        onClose={handleCloseDetail}
        onSelectIncident={handleSelectIncident}
      />

      {/* Bottom Bar */}
      <BottomBar
        incidentCount={filteredIncidents.length}
        arcCount={arcs.length}
        dashboardMode={dashboardMode}
      />
    </div>
  );
}
