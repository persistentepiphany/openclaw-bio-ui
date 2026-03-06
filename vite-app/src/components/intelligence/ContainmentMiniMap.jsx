/**
 * ContainmentMiniMap.jsx — Static Mapbox mini map showing a containment circle.
 */

import Map, { Source, Layer } from "react-map-gl/mapbox";
import { MAPBOX_STYLE, SEVERITY_COLORS, circleGeoJSON } from "../../utils/mapConstants";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function ContainmentMiniMap({ center, radiusKm, severity }) {
  const color = SEVERITY_COLORS[severity] || "#ff9f0a";
  const circle = circleGeoJSON(center, radiusKm);

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", height: 140 }}>
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom: Math.max(4, 9 - Math.log2(radiusKm / 10)),
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAPBOX_STYLE}
        interactive={false}
        attributionControl={false}
      >
        <Source id="containment" type="geojson" data={circle}>
          <Layer
            id="containment-fill"
            type="fill"
            paint={{
              "fill-color": color,
              "fill-opacity": 0.1,
            }}
          />
          <Layer
            id="containment-outline"
            type="line"
            paint={{
              "line-color": color,
              "line-width": 1.5,
              "line-dasharray": [3, 2],
              "line-opacity": 0.6,
            }}
          />
        </Source>

        {/* Center dot */}
        <Source
          id="center-point"
          type="geojson"
          data={{
            type: "Feature",
            geometry: { type: "Point", coordinates: center },
          }}
        >
          <Layer
            id="center-dot"
            type="circle"
            paint={{
              "circle-radius": 5,
              "circle-color": color,
              "circle-stroke-width": 2,
              "circle-stroke-color": "rgba(0,0,0,0.5)",
            }}
          />
        </Source>
      </Map>
    </div>
  );
}
