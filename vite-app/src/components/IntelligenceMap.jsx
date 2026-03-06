/**
 * IntelligenceMap.jsx — Crisis-room style threat map.
 *
 * Displays geolocated biosurveillance incidents on a dark-themed Leaflet map
 * with pulsing severity markers, dark popups, and an overlay stats panel.
 *
 * Props:
 *   incidents — array of incident objects (defaults to mock data)
 */

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mapIncidents as defaultIncidents } from "../data/mockMapData";

/* ── Severity colour palette ── */
const SEVERITY_COLORS = {
  critical: "#ff453a",
  high: "#ff9f0a",
  moderate: "#ffd60a",
  low: "#30d158",
};

/* ── Custom pulsing DivIcon per severity ── */
function createMarkerIcon(severity) {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.moderate;
  const size = severity === "critical" ? 14 : 12;
  const pulse =
    severity === "critical" || severity === "high"
      ? "map-pulse"
      : "map-pulse-slow";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="position:absolute;inset:0;background:${color};border-radius:50%;box-shadow:0 0 8px ${color}80;z-index:2;"></div>
        <div class="${pulse}" style="position:absolute;top:50%;left:50%;width:${size}px;height:${size}px;margin-top:-${size / 2}px;margin-left:-${size / 2}px;border:2px solid ${color};border-radius:50%;"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

/* ── Auto-fit bounds + resize handling ── */
function MapController({ incidents }) {
  const map = useMap();

  useEffect(() => {
    if (incidents.length > 0) {
      const bounds = L.latLngBounds(incidents.map((i) => [i.lat, i.lng]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 5 });
    }
  }, [map, incidents]);

  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);

  return null;
}

/* ── Confidence badge colour ── */
function confidenceColor(c) {
  return c > 80 ? "#30d158" : c >= 50 ? "#ff9f0a" : "#ff453a";
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function IntelligenceMap({ incidents = defaultIncidents }) {
  const stats = {
    total: incidents.length,
    critical: incidents.filter((i) => i.severity === "critical").length,
    high: incidents.filter((i) => i.severity === "high").length,
    moderate: incidents.filter((i) => i.severity === "moderate").length,
  };

  return (
    <div className="relative w-full h-full" style={{ background: "#0A0F1F" }}>
      {/* ── Leaflet Map ── */}
      <MapContainer
        center={[20, 15]}
        zoom={2}
        minZoom={2}
        maxZoom={10}
        zoomControl={false}
        style={{ height: "100%", width: "100%", background: "#0A0F1F" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapController incidents={incidents} />

        {incidents.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.lat, inc.lng]}
            icon={createMarkerIcon(inc.severity)}
          >
            <Popup>
              <div style={{ minWidth: 220 }}>
                {/* Title row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: SEVERITY_COLORS[inc.severity],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#f5f5f7",
                    }}
                  >
                    {inc.title}
                  </span>
                </div>

                {/* Location */}
                <div
                  style={{
                    fontSize: 9,
                    color: "#86868b",
                    marginBottom: 8,
                    fontFamily: "monospace",
                  }}
                >
                  {inc.location}
                </div>

                {/* Detail rows */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                >
                  <div>
                    <span style={{ color: "#48484a" }}>Strain: </span>
                    <span style={{ color: "#b0b0b5" }}>{inc.strain}</span>
                  </div>
                  <div>
                    <span style={{ color: "#48484a" }}>Source: </span>
                    <span style={{ color: "#b0b0b5" }}>{inc.source}</span>
                  </div>
                  <div>
                    <span style={{ color: "#48484a" }}>Date: </span>
                    <span style={{ color: "#b0b0b5" }}>{inc.date}</span>
                  </div>
                  <div style={{ lineHeight: 1.4 }}>
                    <span style={{ color: "#48484a" }}>Assessment: </span>
                    <span style={{ color: "#86868b" }}>{inc.assessment}</span>
                  </div>

                  {/* Confidence badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      paddingTop: 4,
                    }}
                  >
                    <span style={{ color: "#48484a" }}>Confidence:</span>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 999,
                        fontSize: 9,
                        fontWeight: 600,
                        color: confidenceColor(inc.confidence),
                        background: `${confidenceColor(inc.confidence)}18`,
                      }}
                    >
                      {inc.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ── Stats overlay (top-left) ── */}
      <div
        className="absolute top-4 left-4 z-[1000]"
        style={{
          background: "rgba(10,10,10,0.88)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: "14px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ff453a",
              boxShadow: "0 0 6px rgba(255,69,58,0.4)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 600,
              color: "#ff453a",
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            Live
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: "#48484a",
              marginLeft: 2,
            }}
          >
            Threat Overview
          </span>
        </div>

        {/* Total */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 32,
            marginBottom: 6,
          }}
        >
          <span
            style={{ fontFamily: "monospace", fontSize: 10, color: "#86868b" }}
          >
            Active Incidents
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 16,
              fontWeight: 700,
              color: "#f5f5f7",
            }}
          >
            {stats.total}
          </span>
        </div>

        {/* Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[
            {
              label: "Critical",
              count: stats.critical,
              color: SEVERITY_COLORS.critical,
            },
            {
              label: "High",
              count: stats.high,
              color: SEVERITY_COLORS.high,
            },
            {
              label: "Moderate",
              count: stats.moderate,
              color: SEVERITY_COLORS.moderate,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 32,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: s.color,
                  }}
                />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 9,
                    color: s.color,
                  }}
                >
                  {s.label}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#b0b0b5",
                }}
              >
                {s.count}
              </span>
            </div>
          ))}
        </div>

        {/* Sources */}
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              color: "#3a3a3c",
            }}
          >
            Sources:{" "}
            {[...new Set(incidents.map((i) => i.source))].join(" \u00b7 ")}
          </div>
        </div>
      </div>

      {/* ── Legend (bottom-right) ── */}
      <div
        className="absolute bottom-4 right-4 z-[1000]"
        style={{
          background: "rgba(10,10,10,0.88)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          padding: "8px 12px",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 8,
            color: "#48484a",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          Severity
        </div>
        {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "2px 0",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 4px ${color}60`,
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 9,
                color: "#86868b",
                textTransform: "capitalize",
              }}
            >
              {key}
            </span>
          </div>
        ))}
      </div>

      {/* ── Bottom banner ── */}
      <div
        className="absolute bottom-4 left-1/2 z-[1000]"
        style={{
          transform: "translateX(-50%)",
          background: "rgba(10,10,10,0.7)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: 8,
          padding: "5px 16px",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 8,
            color: "#3a3a3c",
          }}
        >
          BioSentinel Intelligence Map &middot; Data refreshed{" "}
          {new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          &middot; OpenStreetMap
        </span>
      </div>
    </div>
  );
}
