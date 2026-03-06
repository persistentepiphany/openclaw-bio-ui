/**
 * IntelligenceMap.jsx — 3D intelligence globe (react-globe.gl)
 *
 * Features:
 *   - Night-earth texture with topology bump map + starfield background
 *   - Atmospheric glow
 *   - 3D point markers coloured by severity, height by confidence
 *   - Animated dashed arcs showing intelligence connections
 *   - Expanding ring pulses on critical/high incidents
 *   - Rich HTML hover tooltips
 *   - Click-to-select detail panel (classified document style)
 *   - Auto-rotation (pauses on selection)
 *   - Responsive via ResizeObserver
 *
 * Props:
 *   incidents — array of incident objects (defaults to mock data)
 *   arcs      — array of arc connection objects
 */

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Globe from "react-globe.gl";
import {
  mapIncidents as defaultIncidents,
  threatArcs as defaultArcs,
} from "../data/mockMapData";

/* ── Palette ── */
const SEV = {
  critical: "#ff453a",
  high: "#ff9f0a",
  moderate: "#ffd60a",
  low: "#30d158",
};

const ARC_TYPE_DASH = {
  genomic: { len: 0.6, gap: 0.15, speed: 1200 },
  flyway: { len: 0.4, gap: 0.2, speed: 2000 },
  intel: { len: 0.25, gap: 0.35, speed: 2800 },
  proximity: { len: 0.5, gap: 0.1, speed: 1600 },
};

function confColor(c) {
  return c > 80 ? "#30d158" : c >= 50 ? "#ff9f0a" : "#ff453a";
}

/* ── Tooltip HTML (hover) ── */
function tooltipHtml(d) {
  const sc = SEV[d.severity] || "#ffd60a";
  const cc = confColor(d.confidence);
  return `
<div style="background:rgba(8,8,12,0.94);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 14px;min-width:200px;max-width:260px;font-family:'DM Sans',system-ui,monospace;pointer-events:none;">
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
    <span style="width:7px;height:7px;border-radius:50%;background:${sc};box-shadow:0 0 6px ${sc}60;flex-shrink:0;"></span>
    <span style="font-size:11px;font-weight:600;color:#f5f5f7;line-height:1.3;">${d.title}</span>
  </div>
  <div style="font-size:9px;color:#86868b;margin-bottom:6px;font-family:monospace;">${d.location}</div>
  <div style="display:flex;gap:8px;margin-bottom:4px;">
    <span style="font-size:8px;padding:2px 6px;border-radius:4px;background:${sc}18;color:${sc};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${d.severity}</span>
    <span style="font-size:8px;padding:2px 6px;border-radius:4px;background:${cc}18;color:${cc};font-weight:600;">${d.confidence}%</span>
  </div>
  <div style="font-size:9px;color:#48484a;line-height:1.4;margin-top:6px;">${d.strain}</div>
  <div style="font-size:7px;color:#2a2a2c;margin-top:6px;">Click for full briefing</div>
</div>`;
}

function arcTooltipHtml(d) {
  const sc = SEV[d.severity] || "#ffd60a";
  return `
<div style="background:rgba(8,8,12,0.94);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;max-width:240px;font-family:monospace;pointer-events:none;">
  <div style="font-size:8px;color:${sc};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">${d.type} link</div>
  <div style="font-size:9px;color:#86868b;line-height:1.4;">${d.label}</div>
</div>`;
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function IntelligenceMap({
  incidents = defaultIncidents,
  arcs = defaultArcs,
}) {
  const globeRef = useRef();
  const containerRef = useRef(null);
  const [dims, setDims] = useState(null);
  const [selected, setSelected] = useState(null);

  /* ── Responsive sizing ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Globe ready: camera + controls ── */
  const onReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView({ lat: 25, lng: 10, altitude: 2.2 }, 0);
    const c = g.controls();
    c.autoRotate = true;
    c.autoRotateSpeed = 0.35;
    c.enableDamping = true;
    c.dampingFactor = 0.12;
    c.minDistance = 120;
    c.maxDistance = 500;
  }, []);

  /* ── Pause rotation when detail panel open ── */
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    try {
      g.controls().autoRotate = !selected;
    } catch {
      /* controls not ready yet */
    }
  }, [selected]);

  /* ── Click handler ── */
  const handleClick = useCallback((pt) => {
    if (!pt) return;
    setSelected(pt);
    globeRef.current?.pointOfView(
      { lat: pt.lat, lng: pt.lng, altitude: 1.6 },
      800
    );
  }, []);

  /* ── Derived data ── */
  const ringsData = useMemo(
    () => incidents.filter((i) => i.severity === "critical" || i.severity === "high"),
    [incidents]
  );

  const stats = useMemo(
    () => ({
      total: incidents.length,
      critical: incidents.filter((i) => i.severity === "critical").length,
      high: incidents.filter((i) => i.severity === "high").length,
      moderate: incidents.filter((i) => i.severity === "moderate").length,
      low: incidents.filter((i) => i.severity === "low").length,
    }),
    [incidents]
  );

  /* ── Related arcs for selected incident ── */
  const relatedArcs = useMemo(() => {
    if (!selected) return [];
    return arcs
      .filter(
        (a) =>
          (a.startLat === selected.lat && a.startLng === selected.lng) ||
          (a.endLat === selected.lat && a.endLng === selected.lng)
      )
      .map((a) => {
        const otherLat =
          a.startLat === selected.lat && a.startLng === selected.lng
            ? a.endLat
            : a.startLat;
        const otherLng =
          a.startLng === selected.lng && a.startLat === selected.lat
            ? a.endLng
            : a.startLng;
        const other = incidents.find(
          (i) => i.lat === otherLat && i.lng === otherLng
        );
        return { ...a, otherIncident: other };
      });
  }, [selected, arcs, incidents]);

  /* ═══ Render ═══ */
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#030305" }}
    >
      {/* ── 3D Globe ── */}
      {dims && (
        <Globe
          ref={globeRef}
          width={dims.w}
          height={dims.h}
          onGlobeReady={onReady}
          /* Appearance */
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          atmosphereColor="#4d9eff"
          atmosphereAltitude={0.18}
          /* Points */
          pointsData={incidents}
          pointLat="lat"
          pointLng="lng"
          pointColor={(d) => SEV[d.severity] || "#ffd60a"}
          pointAltitude={(d) =>
            d.severity === "critical"
              ? 0.14
              : d.severity === "high"
                ? 0.08
                : d.severity === "moderate"
                  ? 0.04
                  : 0.02
          }
          pointRadius={(d) =>
            d.severity === "critical"
              ? 0.4
              : d.severity === "high"
                ? 0.3
                : 0.2
          }
          pointsMerge={false}
          pointLabel={tooltipHtml}
          onPointClick={handleClick}
          /* Arcs */
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={(d) => {
            const c = SEV[d.severity] || "#ffd60a";
            return [`${c}bb`, `${c}33`];
          }}
          arcDashLength={(d) =>
            (ARC_TYPE_DASH[d.type] || ARC_TYPE_DASH.intel).len
          }
          arcDashGap={(d) =>
            (ARC_TYPE_DASH[d.type] || ARC_TYPE_DASH.intel).gap
          }
          arcDashAnimateTime={(d) =>
            (ARC_TYPE_DASH[d.type] || ARC_TYPE_DASH.intel).speed
          }
          arcStroke={0.4}
          arcLabel={arcTooltipHtml}
          /* Rings */
          ringsData={ringsData}
          ringLat="lat"
          ringLng="lng"
          ringColor={(d) => {
            const c = SEV[d.severity] || "#ff9f0a";
            return (t) =>
              `${c}${Math.round((1 - t) * 180)
                .toString(16)
                .padStart(2, "0")}`;
          }}
          ringMaxRadius={d => d.severity === "critical" ? 5 : 3}
          ringPropagationSpeed={d => d.severity === "critical" ? 3 : 2}
          ringRepeatPeriod={d => d.severity === "critical" ? 1200 : 1800}
          /* Labels */
          labelsData={incidents}
          labelLat="lat"
          labelLng="lng"
          labelText="title"
          labelSize={(d) => (d.severity === "critical" ? 0.6 : 0.4)}
          labelDotRadius={0}
          labelColor={() => "rgba(255,255,255,0.25)"}
          labelResolution={2}
          labelAltitude={(d) =>
            d.severity === "critical"
              ? 0.018
              : d.severity === "high"
                ? 0.012
                : 0.008
          }
        />
      )}

      {/* ── Classification banner ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 24,
          background: "rgba(255,69,58,0.08)",
          borderBottom: "1px solid rgba(255,69,58,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: 700,
            color: "#ff453a",
            letterSpacing: 2.5,
            textTransform: "uppercase",
          }}
        >
          Classified // BioSentinel SIGINT // Handle via COMINT channels only
        </span>
      </div>

      {/* ── Stats overlay (top-left) ── */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 16,
          zIndex: 20,
          background: "rgba(8,8,12,0.88)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: "14px 18px",
          minWidth: 180,
        }}
      >
        {/* LIVE header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
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
              fontFamily: "monospace",
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
              fontFamily: "monospace",
              fontSize: 10,
              color: "#48484a",
            }}
          >
            Global Threat Picture
          </span>
        </div>

        {/* Total */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: "#86868b",
            }}
          >
            Active Incidents
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 20,
              fontWeight: 700,
              color: "#f5f5f7",
            }}
          >
            {stats.total}
          </span>
        </div>

        {/* Severity breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { k: "critical", l: "Critical", c: SEV.critical },
            { k: "high", l: "High", c: SEV.high },
            { k: "moderate", l: "Moderate", c: SEV.moderate },
            { k: "low", l: "Low", c: SEV.low },
          ].map((s) => (
            <div
              key={s.k}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
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
                    background: s.c,
                    boxShadow: `0 0 4px ${s.c}50`,
                  }}
                />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 9,
                    color: s.c,
                  }}
                >
                  {s.l}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#b0b0b5",
                }}
              >
                {stats[s.k]}
              </span>
            </div>
          ))}
        </div>

        {/* Arcs count */}
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              color: "#48484a",
            }}
          >
            Intel Links
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 600,
              color: "#4d9eff",
            }}
          >
            {arcs.length}
          </span>
        </div>

        {/* Sources */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 7,
              color: "#2a2a2c",
              lineHeight: 1.5,
            }}
          >
            Sources:{" "}
            {[...new Set(incidents.map((i) => i.source))].join(" \u00b7 ")}
          </div>
        </div>
      </div>

      {/* ── Arc type legend (bottom-left) ── */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          zIndex: 20,
          background: "rgba(8,8,12,0.88)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          padding: "8px 12px",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 7,
            color: "#48484a",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          Severity / Link Type
        </div>

        {/* Severity dots */}
        {Object.entries(SEV).map(([key, color]) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "1.5px 0",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 4px ${color}50`,
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 8,
                color: "#86868b",
                textTransform: "capitalize",
              }}
            >
              {key}
            </span>
          </div>
        ))}

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.04)",
            marginTop: 5,
            paddingTop: 5,
          }}
        >
          {[
            { type: "Genomic", dash: "\u2500\u2500\u2500" },
            { type: "Flyway", dash: "\u2500 \u2500 \u2500" },
            { type: "Intel", dash: "\u00b7 \u00b7 \u00b7 \u00b7" },
          ].map((l) => (
            <div
              key={l.type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "1.5px 0",
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: "#4d9eff",
                  width: 36,
                }}
              >
                {l.dash}
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: "#86868b",
                }}
              >
                {l.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Timestamp (bottom-center) ── */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "rgba(8,8,12,0.7)",
          border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: 8,
          padding: "4px 14px",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 8,
            color: "#3a3a3c",
          }}
        >
          BioSentinel SIGINT &middot;{" "}
          {new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          UTC &middot; {incidents.length} active signals &middot;{" "}
          {arcs.length} intel links
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         DETAIL PANEL (right side, shown on point click)
         ══════════════════════════════════════════════════════════════ */}
      {selected && (
        <div
          className="animate-fadeIn"
          style={{
            position: "absolute",
            top: 40,
            right: 16,
            bottom: 50,
            width: 320,
            zIndex: 30,
            background: "rgba(8,8,12,0.92)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Classification strip */}
          <div
            style={{
              background: `${SEV[selected.severity]}12`,
              borderBottom: `1px solid ${SEV[selected.severity]}25`,
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 8,
                fontWeight: 700,
                color: SEV[selected.severity],
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {selected.severity} // Biosurveillance Report
            </span>
            <button
              onClick={() => setSelected(null)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: 4,
                color: "#86868b",
                cursor: "pointer",
                padding: "2px 8px",
                fontFamily: "monospace",
                fontSize: 9,
              }}
            >
              ESC
            </button>
          </div>

          {/* Scrollable content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px",
            }}
          >
            {/* Title + location */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: SEV[selected.severity],
                    boxShadow: `0 0 8px ${SEV[selected.severity]}60`,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#f5f5f7",
                  }}
                >
                  {selected.title}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: "#86868b",
                }}
              >
                {selected.location}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: "#3a3a3c",
                  marginTop: 2,
                }}
              >
                {selected.lat.toFixed(4)}&deg;N, {selected.lng.toFixed(4)}
                &deg;E
              </div>
            </div>

            {/* Key metrics grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {[
                {
                  label: "Confidence",
                  value: `${selected.confidence}%`,
                  color: confColor(selected.confidence),
                },
                { label: "Source", value: selected.source, color: "#4d9eff" },
                { label: "Date", value: selected.date, color: "#b0b0b5" },
                {
                  label: "Casualties",
                  value: selected.casualties || 0,
                  color:
                    selected.casualties > 0 ? "#ff453a" : "#30d158",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 7,
                      color: "#48484a",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 3,
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      color: m.color,
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Strain */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: "#48484a",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 4,
                }}
              >
                Pathogen / Strain
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: "#b0b0b5",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 6,
                  padding: "6px 10px",
                }}
              >
                {selected.strain}
              </div>
            </div>

            {/* Assessment */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: "#48484a",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 4,
                }}
              >
                Assessment
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#86868b",
                  lineHeight: 1.6,
                  fontFamily: "'DM Sans', system-ui",
                }}
              >
                {selected.assessment}
              </div>
            </div>

            {/* Recommended actions */}
            {selected.actions && selected.actions.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    color: "#48484a",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 6,
                  }}
                >
                  Actions / Response
                </div>
                {selected.actions.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "flex-start",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 8,
                        color: "#30d158",
                        marginTop: 1,
                      }}
                    >
                      &rsaquo;
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: "#86868b",
                        lineHeight: 1.4,
                        fontFamily: "'DM Sans', system-ui",
                      }}
                    >
                      {a}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Related connections */}
            {relatedArcs.length > 0 && (
              <div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    color: "#48484a",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 6,
                  }}
                >
                  Intelligence Links ({relatedArcs.length})
                </div>
                {relatedArcs.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(77,158,255,0.04)",
                      border: "1px solid rgba(77,158,255,0.08)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      marginBottom: 4,
                      cursor: a.otherIncident ? "pointer" : "default",
                    }}
                    onClick={() =>
                      a.otherIncident && handleClick(a.otherIncident)
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 7,
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: `${SEV[a.severity]}18`,
                          color: SEV[a.severity],
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {a.type}
                      </span>
                      {a.otherIncident && (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 9,
                            color: "#4d9eff",
                          }}
                        >
                          &rarr; {a.otherIncident.title}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 8,
                        color: "#636366",
                        lineHeight: 1.4,
                      }}
                    >
                      {a.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.04)",
              padding: "6px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 7,
                color: "#2a2a2c",
              }}
            >
              INC-{String(selected.id).padStart(4, "0")} &middot; Auto-generated
              briefing
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 7,
                color: "#2a2a2c",
              }}
            >
              {selected.affected
                ? `${selected.affected.toLocaleString()} affected`
                : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
