/**
 * DetailPanel.jsx — Right slide-in panel with incident info,
 * containment mini map, and related incidents.
 */

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SEVERITY_COLORS, confColor, GLASS_STYLE } from "../../utils/mapConstants";
import ContainmentMiniMap from "./ContainmentMiniMap";
import RelatedIncidents from "./RelatedIncidents";

export default function DetailPanel({
  incident,
  allIncidents,
  arcs,
  onClose,
  onSelectIncident,
}) {
  /* ── Related arcs for selected incident ── */
  const relatedArcs = useMemo(() => {
    if (!incident) return [];
    return arcs
      .filter(
        (a) =>
          (a.startLat === incident.lat && a.startLng === incident.lng) ||
          (a.endLat === incident.lat && a.endLng === incident.lng)
      )
      .map((a) => {
        const otherLat =
          a.startLat === incident.lat && a.startLng === incident.lng
            ? a.endLat
            : a.startLat;
        const otherLng =
          a.startLng === incident.lng && a.startLat === incident.lat
            ? a.endLng
            : a.startLng;
        const other = allIncidents.find(
          (i) => i.lat === otherLat && i.lng === otherLng
        );
        return { ...a, otherIncident: other };
      });
  }, [incident, arcs, allIncidents]);

  const sev = incident ? SEVERITY_COLORS[incident.severity] : "#ffd60a";
  const cc = incident ? confColor(incident.confidence) : "#86868b";

  return (
    <AnimatePresence>
      {incident && (
        <motion.div
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 340, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="absolute top-3 right-3 bottom-10 z-30 overflow-hidden flex flex-col"
          style={{
            width: 320,
            ...GLASS_STYLE,
          }}
        >
          {/* Classification strip */}
          <div
            style={{
              background: `${sev}12`,
              borderBottom: `1px solid ${sev}25`,
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                fontWeight: 700,
                color: sev,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {incident.severity} // Biosurveillance Report
            </span>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: 4,
                color: "#86868b",
                cursor: "pointer",
                padding: "2px 8px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
              }}
            >
              ESC
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto" style={{ padding: 14 }}>
            {/* Title + location */}
            <div style={{ marginBottom: 12 }}>
              <div className="flex items-center gap-2 mb-1">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: sev,
                    boxShadow: `0 0 8px ${sev}60`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#f5f5f7",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {incident.title}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "#86868b",
                }}
              >
                {incident.location}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  color: "#3a3a3c",
                  marginTop: 2,
                }}
              >
                {incident.lat.toFixed(4)}&deg;N, {incident.lng.toFixed(4)}
                &deg;E
              </div>
            </div>

            {/* Key metrics grid */}
            <div className="grid grid-cols-2 gap-1.5 mb-3.5">
              {[
                { label: "Confidence", value: `${incident.confidence}%`, color: cc },
                { label: "Source", value: incident.source, color: "#4d9eff" },
                { label: "Date", value: incident.date, color: "#b0b0b5" },
                {
                  label: "Casualties",
                  value: incident.casualties || 0,
                  color: incident.casualties > 0 ? "#ff453a" : "#30d158",
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
                      fontFamily: "'JetBrains Mono', monospace",
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
                      fontFamily: "'JetBrains Mono', monospace",
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
            <Section label="Pathogen / Strain">
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "#b0b0b5",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 6,
                  padding: "6px 10px",
                }}
              >
                {incident.strain}
              </div>
            </Section>

            {/* Assessment */}
            <Section label="Assessment">
              <div
                style={{
                  fontSize: 10,
                  color: "#86868b",
                  lineHeight: 1.6,
                  fontFamily: "'Inter', system-ui",
                }}
              >
                {incident.assessment}
              </div>
            </Section>

            {/* Actions */}
            {incident.actions?.length > 0 && (
              <Section label="Actions / Response">
                {incident.actions.map((a, i) => (
                  <div key={i} className="flex gap-1.5 items-start mb-1">
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
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
                        fontFamily: "'Inter', system-ui",
                      }}
                    >
                      {a}
                    </span>
                  </div>
                ))}
              </Section>
            )}

            {/* Containment Mini Map */}
            {incident.containmentZone > 0 && (
              <Section label={`Containment Zone (${incident.containmentZone}km radius)`}>
                <ContainmentMiniMap
                  center={[incident.lng, incident.lat]}
                  radiusKm={incident.containmentZone}
                  severity={incident.severity}
                />
              </Section>
            )}

            {/* Related Incidents */}
            <RelatedIncidents
              relatedArcs={relatedArcs}
              onSelectIncident={onSelectIncident}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.04)",
              padding: "6px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7,
                color: "#2a2a2c",
              }}
            >
              INC-{String(incident.id).padStart(4, "0")} &middot; Auto-generated
              briefing
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7,
                color: "#2a2a2c",
              }}
            >
              {incident.affected
                ? `${incident.affected.toLocaleString()} affected`
                : ""}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          color: "#48484a",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
