/**
 * MapContainer.jsx — Mapbox GL JS map with globe projection, fog, clusters,
 * severity-colored markers, pulsing animation on critical, and arc lines.
 */

import { useRef, useCallback, useEffect, useState } from "react";
import Map, { Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  MAPBOX_STYLE,
  DEFAULT_VIEW,
  FOG_CONFIG,
  SEVERITY_COLORS,
  ARC_TYPE_COLORS,
  CLUSTER_CONFIG,
} from "../../utils/mapConstants";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/* ── Build GeoJSON from incidents ── */
function toGeoJSON(incidents) {
  return {
    type: "FeatureCollection",
    features: incidents.map((inc) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [inc.lng, inc.lat] },
      properties: {
        id: inc.id,
        title: inc.title,
        severity: inc.severity,
        confidence: inc.confidence,
        location: inc.location,
        pathogen: inc.pathogen,
        date: inc.date,
      },
    })),
  };
}

/* ── Build arc GeoJSON from threatArcs ── */
function arcsToGeoJSON(arcs) {
  return {
    type: "FeatureCollection",
    features: arcs.map((arc, i) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [arc.startLng, arc.startLat],
          [arc.endLng, arc.endLat],
        ],
      },
      properties: {
        type: arc.type,
        severity: arc.severity,
        label: arc.label,
        id: i,
      },
    })),
  };
}

/* ── Layer styles ── */

// Cluster circle
const clusterLayer = {
  id: "clusters",
  type: "circle",
  source: "incidents",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#ff9f0a",
      4, "#ff453a",
      8, "#ff453a",
    ],
    "circle-radius": ["step", ["get", "point_count"], 18, 4, 24, 8, 30],
    "circle-opacity": 0.85,
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(255,255,255,0.1)",
  },
};

// Cluster count text
const clusterCountLayer = {
  id: "cluster-count",
  type: "symbol",
  source: "incidents",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 12,
  },
  paint: {
    "text-color": "#ffffff",
  },
};

// Unclustered point
const unclusteredPointLayer = {
  id: "unclustered-point",
  type: "circle",
  source: "incidents",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": [
      "match",
      ["get", "severity"],
      "critical", SEVERITY_COLORS.critical,
      "high", SEVERITY_COLORS.high,
      "moderate", SEVERITY_COLORS.moderate,
      "low", SEVERITY_COLORS.low,
      SEVERITY_COLORS.moderate,
    ],
    "circle-radius": [
      "match",
      ["get", "severity"],
      "critical", 8,
      "high", 7,
      "moderate", 6,
      "low", 5,
      6,
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(0,0,0,0.5)",
    "circle-opacity": 0.95,
  },
};

// Pulsing outer ring for critical incidents
const pulseRingLayer = {
  id: "pulse-ring",
  type: "circle",
  source: "incidents",
  filter: [
    "all",
    ["!", ["has", "point_count"]],
    ["in", ["get", "severity"], ["literal", ["critical", "high"]]],
  ],
  paint: {
    "circle-color": "transparent",
    "circle-radius": [
      "match",
      ["get", "severity"],
      "critical", 20,
      "high", 16,
      14,
    ],
    "circle-stroke-width": 1.5,
    "circle-stroke-color": [
      "match",
      ["get", "severity"],
      "critical", "rgba(255,69,58,0.35)",
      "high", "rgba(255,159,10,0.25)",
      "rgba(255,214,10,0.2)",
    ],
    "circle-opacity": [
      "match",
      ["get", "severity"],
      "critical", 0.6,
      "high", 0.4,
      0.3,
    ],
  },
};

// Arc line layers (one per type since line-dasharray doesn't support expressions)
const ARC_TYPES = [
  { type: "genomic", dash: [4, 2] },
  { type: "flyway", dash: [2, 3] },
  { type: "intel", dash: [1, 3] },
  { type: "proximity", dash: [3, 1] },
];

const arcLineLayers = ARC_TYPES.map(({ type, dash }) => ({
  id: `arc-lines-${type}`,
  type: "line",
  source: "arcs",
  filter: ["==", ["get", "type"], type],
  paint: {
    "line-color": ARC_TYPE_COLORS[type],
    "line-width": 1.2,
    "line-opacity": 0.4,
  },
  layout: {
    "line-cap": "round",
  },
}));

/* ── Satellite night layer opacity by zoom (used when satellite is ON) ── */
const SAT_OPACITY_ZOOM = [
  "interpolate",
  ["linear"],
  ["zoom"],
  0, 0.85,
  3, 0.7,
  5, 0.2,
  6, 0,
];

export default function MapContainer({
  incidents,
  arcs,
  selectedId,
  onSelectIncident,
}) {
  const mapRef = useRef(null);
  const [cursor, setCursor] = useState("grab");
  const [pulseRadius, setPulseRadius] = useState(14);
  const [satelliteOn, setSatelliteOn] = useState(true);
  const mapReady = useRef(false);

  const geojson = toGeoJSON(incidents);
  const arcsGeojson = arcsToGeoJSON(arcs);

  /* ── Pulsing animation ── */
  useEffect(() => {
    let raf;
    let start;
    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = (elapsed % 2000) / 2000; // 0-1 over 2s
      setPulseRadius(14 + t * 12);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── Toggle satellite layer visibility ── */
  useEffect(() => {
    if (!mapReady.current) return;
    const map = mapRef.current?.getMap();
    if (!map || !map.getLayer("satellite-night-layer")) return;

    if (satelliteOn) {
      map.setLayoutProperty("satellite-night-layer", "visibility", "visible");
    } else {
      map.setLayoutProperty("satellite-night-layer", "visibility", "none");
    }
  }, [satelliteOn]);

  /* ── Map load: set projection + fog + night satellite layer ── */
  const onLoad = useCallback((e) => {
    const map = e.target;
    map.setProjection("globe");
    map.setFog(FOG_CONFIG);

    // Add darkened satellite imagery — ON by default, gives night-earth look.
    map.addSource("satellite-night", {
      type: "raster",
      url: "mapbox://mapbox.satellite",
      tileSize: 256,
    });

    // Insert below all vector symbol layers so labels remain readable
    const firstSymbolLayer = map
      .getStyle()
      .layers.find((l) => l.type === "symbol");

    map.addLayer(
      {
        id: "satellite-night-layer",
        type: "raster",
        source: "satellite-night",
        paint: {
          "raster-brightness-max": 0.25,
          "raster-brightness-min": 0.0,
          "raster-saturation": -0.3,
          "raster-contrast": 0.4,
          "raster-opacity": SAT_OPACITY_ZOOM,
        },
      },
      firstSymbolLayer?.id
    );

    mapReady.current = true;
  }, []);

  /* ── Click on unclustered point ── */
  const onClick = useCallback(
    (e) => {
      const features = e.features;
      if (!features || features.length === 0) return;

      const f = features[0];
      if (f.layer.id === "clusters") {
        // Zoom into cluster
        const map = mapRef.current?.getMap();
        if (!map) return;
        const source = map.getSource("incidents");
        source.getClusterExpansionZoom(f.properties.cluster_id, (err, zoom) => {
          if (err) return;
          map.easeTo({
            center: f.geometry.coordinates,
            zoom: zoom,
            duration: 500,
          });
        });
      } else if (f.layer.id === "unclustered-point") {
        const id = f.properties.id;
        onSelectIncident(id);
      }
    },
    [onSelectIncident]
  );

  /* ── Fly to incident when selected ── */
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const inc = incidents.find((i) => i.id === selectedId);
    if (!inc) return;
    mapRef.current.getMap()?.flyTo({
      center: [inc.lng, inc.lat],
      zoom: 5,
      duration: 1200,
      essential: true,
    });
  }, [selectedId, incidents]);

  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor("grab"), []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={DEFAULT_VIEW}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAPBOX_STYLE}
      cursor={cursor}
      interactiveLayerIds={["clusters", "unclustered-point"]}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onLoad={onLoad}
      attributionControl={false}
      logoPosition="bottom-right"
    >
      {/* Incident markers (clustered) */}
      <Source
        id="incidents"
        type="geojson"
        data={geojson}
        cluster={true}
        clusterMaxZoom={CLUSTER_CONFIG.clusterMaxZoom}
        clusterRadius={CLUSTER_CONFIG.clusterRadius}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer
          {...pulseRingLayer}
          paint={{
            ...pulseRingLayer.paint,
            "circle-radius": pulseRadius,
            "circle-opacity": Math.max(0, 0.6 - ((pulseRadius - 14) / 12) * 0.6),
          }}
        />
        <Layer {...unclusteredPointLayer} />
      </Source>

      {/* Arc lines */}
      <Source id="arcs" type="geojson" data={arcsGeojson}>
        {arcLineLayers.map((layer) => (
          <Layer key={layer.id} {...layer} />
        ))}
      </Source>
    </Map>

    {/* Satellite / Dark map toggle */}
    <button
      onClick={() => setSatelliteOn((v) => !v)}
      title={satelliteOn ? "Switch to dark map" : "Switch to satellite night"}
      style={{
        position: "absolute",
        bottom: 36,
        right: 12,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(8,8,12,0.85)",
        backdropFilter: "blur(12px)",
        cursor: "pointer",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8,
        color: satelliteOn ? "#4d9eff" : "#48484a",
        transition: "all 0.2s",
      }}
    >
      {/* Globe/satellite icon */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      {satelliteOn ? "Satellite" : "Dark Map"}
    </button>
    </div>
  );
}
