/**
 * mapConstants.js — Shared constants for the Intelligence Map
 */

/* ── Severity palette ── */
export const SEVERITY_COLORS = {
  critical: "#ff453a",
  high: "#ff9f0a",
  moderate: "#ffd60a",
  low: "#30d158",
};

/* ── Arc type colours ── */
export const ARC_TYPE_COLORS = {
  genomic: "#ff453a",
  flyway: "#4d9eff",
  intel: "#bf5af2",
  proximity: "#ff9f0a",
};

/* ── Mapbox style ── */
export const MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";

/* ── Default viewport (globe projection) ── */
export const DEFAULT_VIEW = {
  longitude: 20,
  latitude: 20,
  zoom: 1.5,
  pitch: 0,
  bearing: 0,
};

/* ── Fog / atmosphere config ── */
export const FOG_CONFIG = {
  range: [1, 10],
  color: "#0a0a0f",
  "high-color": "#1a1a2e",
  "horizon-blend": 0.05,
};

/* ── Glass panel style ── */
export const GLASS_STYLE = {
  background: "rgba(8,8,12,0.88)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
};

/* ── Cluster config ── */
export const CLUSTER_CONFIG = {
  clusterMaxZoom: 6,
  clusterRadius: 50,
};

/* ── Confidence colour helper ── */
export function confColor(c) {
  return c > 80 ? "#30d158" : c >= 50 ? "#ff9f0a" : "#ff453a";
}

/* ── Severity order for sorting ── */
export const SEVERITY_ORDER = { critical: 0, high: 1, moderate: 2, low: 3 };

/* ── Generate circle polygon for containment zones (no turf dependency) ── */
export function circleGeoJSON(center, radiusKm, steps = 64) {
  const coords = [];
  const lat = center[1];
  const lng = center[0];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    const dy = radiusKm / 110.574;
    coords.push([lng + dx * Math.cos(angle), lat + dy * Math.sin(angle)]);
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}
