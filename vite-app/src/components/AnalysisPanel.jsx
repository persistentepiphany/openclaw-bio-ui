/**
 * AnalysisPanel.jsx — Amino Analytica data dashboard
 *
 * Displays per-residue SASA, B-factor bar charts, a Ramachandran scatter
 * plot, and quality metrics. All visualizations use inline SVG.
 *
 * Props:
 *   pdbId — PDB code string ("1CRN", "4HHB", …)
 */

import { useEffect, useState } from "react";
import { bioFetch } from "../api/client";
import { downloadJSON } from "../utils/download";

/* ── Shared chart styles ── */
const CHART_BG = "rgba(255,255,255,0.03)";
const AXIS_COLOR = "#3a3a3c";
const LABEL_COLOR = "#636366";
const ACCENT = "#30d158";
const ACCENT2 = "#5e5ce6";
const ACCENT3 = "#ff9f0a";
const WARN = "#ff453a";

/* ── Colour ramp for bar values (low → high) ── */
function valueColor(t, palette = "green") {
  if (palette === "green") {
    const r = Math.round(20 + t * 200);
    const g = Math.round(200 - t * 120);
    const b = Math.round(80 - t * 60);
    return `rgb(${r},${g},${b})`;
  }
  // blue-red for B-factor
  const r = Math.round(60 + t * 195);
  const g = Math.round(120 - t * 80);
  const b = Math.round(220 - t * 180);
  return `rgb(${r},${g},${b})`;
}

/* ── Mini metric card ── */
function Metric({ label, value, unit, accent }) {
  return (
    <div style={{
      padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)", minWidth: 90,
    }}>
      <div style={{ fontFamily: "monospace", fontSize: 8, color: LABEL_COLOR, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: 16, color: accent || ACCENT, fontWeight: 600 }}>
        {value}<span style={{ fontSize: 9, color: LABEL_COLOR, marginLeft: 3 }}>{unit}</span>
      </div>
    </div>
  );
}

/* ── Bar chart (SASA or B-factor) ── */
function BarChart({ data, valueKey, labelKey, title, palette, height = 120, maxOverride }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d[valueKey]);
  const maxVal = maxOverride || Math.max(...values);
  const barW = Math.max(2, Math.min(8, (460 - 40) / data.length - 0.5));
  const chartW = data.length * (barW + 0.5) + 40;
  const chartH = height;
  const padL = 35, padB = 18, padT = 5;

  return (
    <div style={{ background: CHART_BG, borderRadius: 8, padding: "10px 8px 6px", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontFamily: "monospace", fontSize: 9, color: LABEL_COLOR, marginBottom: 6 }}>{title}</div>
      <div style={{ overflowX: "auto", overflowY: "hidden" }}>
        <svg width={Math.max(chartW, 200)} height={chartH} style={{ display: "block" }}>
          {/* Y axis gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map(f => {
            const y = padT + (1 - f) * (chartH - padT - padB);
            return (
              <g key={f}>
                <line x1={padL} x2={chartW} y1={y} y2={y} stroke={AXIS_COLOR} strokeWidth={0.5} strokeDasharray={f === 0 ? "none" : "2,3"} />
                <text x={padL - 4} y={y + 3} textAnchor="end" fill={LABEL_COLOR} fontSize={7} fontFamily="monospace">
                  {(maxVal * f).toFixed(1)}
                </text>
              </g>
            );
          })}
          {/* Bars */}
          {data.map((d, i) => {
            const v = d[valueKey];
            const t = maxVal > 0 ? v / maxVal : 0;
            const barH = t * (chartH - padT - padB);
            const x = padL + i * (barW + 0.5);
            const y = chartH - padB - barH;
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={Math.max(barH, 0.5)} rx={1}
                  fill={valueColor(t, palette)} opacity={0.85} />
                {/* Show residue number every Nth bar */}
                {(data.length <= 60 ? i % 5 === 0 : i % 10 === 0) && (
                  <text x={x + barW / 2} y={chartH - 4} textAnchor="middle" fill={LABEL_COLOR} fontSize={6} fontFamily="monospace">
                    {d[labelKey]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ── Ramachandran scatter plot ── */
function RamachandranPlot({ data }) {
  if (!data || data.length === 0) return null;
  const size = 200;
  const pad = 25;
  const inner = size - 2 * pad;

  // Map phi/psi (-180..180) to pixel coordinates
  const toX = phi => pad + ((phi + 180) / 360) * inner;
  const toY = psi => pad + ((180 - psi) / 360) * inner; // invert Y

  return (
    <div style={{ background: CHART_BG, borderRadius: 8, padding: "10px 8px 6px", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontFamily: "monospace", fontSize: 9, color: LABEL_COLOR, marginBottom: 6 }}>Ramachandran Plot</div>
      <svg width={size} height={size} style={{ display: "block" }}>
        {/* Background regions (simplified) */}
        {/* Alpha-helix favored region */}
        <rect x={toX(-160)} y={toY(0)} width={(80 / 360) * inner} height={(120 / 360) * inner}
          fill={ACCENT} opacity={0.06} rx={4} />
        {/* Beta-sheet favored region */}
        <rect x={toX(-180)} y={toY(180)} width={(100 / 360) * inner} height={(80 / 360) * inner}
          fill={ACCENT2} opacity={0.06} rx={4} />

        {/* Grid */}
        <line x1={pad} x2={size - pad} y1={toY(0)} y2={toY(0)} stroke={AXIS_COLOR} strokeWidth={0.5} />
        <line x1={toX(0)} x2={toX(0)} y1={pad} y2={size - pad} stroke={AXIS_COLOR} strokeWidth={0.5} />
        <rect x={pad} y={pad} width={inner} height={inner} fill="none" stroke={AXIS_COLOR} strokeWidth={0.5} />

        {/* Axis labels */}
        <text x={size / 2} y={size - 3} textAnchor="middle" fill={LABEL_COLOR} fontSize={8} fontFamily="monospace">Phi (deg)</text>
        <text x={4} y={size / 2} textAnchor="middle" fill={LABEL_COLOR} fontSize={8} fontFamily="monospace"
          transform={`rotate(-90, 4, ${size / 2})`}>Psi</text>
        {[-180, -90, 0, 90, 180].map(v => (
          <g key={`x${v}`}>
            <text x={toX(v)} y={size - pad + 12} textAnchor="middle" fill={LABEL_COLOR} fontSize={6} fontFamily="monospace">{v}</text>
            <text x={pad - 4} y={toY(v) + 2} textAnchor="end" fill={LABEL_COLOR} fontSize={6} fontFamily="monospace">{v}</text>
          </g>
        ))}

        {/* Data points */}
        {data.map((d, i) => {
          const isGly = d.resName === "GLY";
          const isPro = d.resName === "PRO";
          const color = isGly ? ACCENT3 : isPro ? ACCENT2 : ACCENT;
          return (
            <circle key={i} cx={toX(d.phi)} cy={toY(d.psi)} r={isGly ? 3 : 2.5}
              fill={color} opacity={0.7} stroke="rgba(0,0,0,0.3)" strokeWidth={0.3} />
          );
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {[
          { color: ACCENT, label: "General" },
          { color: ACCENT3, label: "Glycine" },
          { color: ACCENT2, label: "Proline" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: l.color, display: "inline-block" }} />
            <span style={{ fontFamily: "monospace", fontSize: 7, color: LABEL_COLOR }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main panel ── */
export default function AnalysisPanel({ pdbId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // Try Bio API first, fall back to static JSON
      const apiData = await bioFetch(`/api/analysis/${pdbId}`);
      if (!cancelled && apiData) {
        setData(apiData);
        setLoading(false);
        return;
      }
      // Fallback: static file
      try {
        const r = await fetch(`/analysis/${pdbId}.json`);
        if (!r.ok) throw new Error(`No analysis data for ${pdbId}`);
        const d = await r.json();
        if (!cancelled) { setData(d); setLoading(false); }
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [pdbId]);

  if (loading) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#030305" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 32, height: 32, border: "2px solid rgba(255,255,255,0.1)", borderTop: `2px solid ${ACCENT}`,
            borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px",
          }} />
          <div style={{ fontFamily: "monospace", fontSize: 10, color: LABEL_COLOR }}>Loading Amino Analytica data...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#030305" }}>
        <div style={{ textAlign: "center", maxWidth: 300 }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: LABEL_COLOR, marginBottom: 8 }}>
            Analysis not available
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a" }}>
            No Amino Analytica data for {pdbId}. Run analysis via the CLI to generate data.
          </div>
        </div>
      </div>
    );
  }

  const { sasa, quality } = data;
  const rama = quality?.ramachandran;
  const bfac = quality?.bfactor;
  const geom = quality?.geometry;

  return (
    <div style={{
      width: "100%", height: "100%", background: "#030305", overflow: "auto",
      padding: "16px 14px", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{
          fontFamily: "monospace", fontSize: 9, color: ACCENT, padding: "3px 8px",
          background: "rgba(48,209,88,0.1)", borderRadius: 4, border: "1px solid rgba(48,209,88,0.2)",
        }}>
          Amino Analytica
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: LABEL_COLOR }}>
          {pdbId} analysis results
        </span>
        <button
          onClick={() => downloadJSON(`${pdbId}_analysis.json`, data)}
          title="Export analysis as JSON"
          style={{
            marginLeft: "auto",
            padding: "3px 8px",
            borderRadius: 4,
            border: "1px solid rgba(94,92,230,0.3)",
            background: "rgba(94,92,230,0.1)",
            color: ACCENT2,
            fontFamily: "monospace",
            fontSize: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(94,92,230,0.2)"}
          onMouseOut={(e) => e.currentTarget.style.background = "rgba(94,92,230,0.1)"}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Export JSON
        </button>
      </div>

      {/* Metric cards */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {sasa && (
          <>
            <Metric label="Total SASA" value={sasa.totalSasa?.toFixed(1)} unit="nm²" />
            <Metric label="Avg SASA" value={sasa.avgSasa?.toFixed(2)} unit="nm²" />
            <Metric label="Max SASA" value={sasa.maxSasa?.toFixed(2)} unit="nm²" accent={ACCENT3} />
          </>
        )}
        {bfac && (
          <>
            <Metric label="Mean B-factor" value={bfac.statistics?.mean?.toFixed(1)} unit="Å²" accent={ACCENT2} />
            <Metric label="Max B-factor" value={bfac.statistics?.max?.toFixed(1)} unit="Å²" accent={WARN} />
          </>
        )}
        {geom && (
          <Metric label="Clashes" value={geom.clashCount} unit="" accent={geom.clashCount === 0 ? ACCENT : WARN} />
        )}
        {rama?.statistics && (
          <Metric label="Rama Favored" value={rama.statistics.favored_percent?.toFixed(1)} unit="%" accent={ACCENT} />
        )}
      </div>

      {/* Charts grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* SASA bar chart */}
        {sasa?.residues && (
          <BarChart
            data={sasa.residues}
            valueKey="sasa"
            labelKey="resNum"
            title="Solvent Accessible Surface Area (nm²)"
            palette="green"
          />
        )}

        {/* B-factor bar chart */}
        {bfac?.residues && (
          <BarChart
            data={bfac.residues}
            valueKey="avgBfactor"
            labelKey="resNum"
            title="B-factor by Residue (Å²)"
            palette="blue"
          />
        )}

        {/* Ramachandran plot */}
        {rama?.data && (
          <RamachandranPlot data={rama.data} />
        )}

        {/* Quality summary */}
        <div style={{ background: CHART_BG, borderRadius: 8, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: LABEL_COLOR, marginBottom: 8 }}>Quality Summary</div>

          {rama?.statistics && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: LABEL_COLOR, marginBottom: 4 }}>Ramachandran regions</div>
              {/* Stacked bar */}
              <div style={{ display: "flex", height: 14, borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
                <div style={{ width: `${rama.statistics.favored_percent}%`, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 7, color: "#000" }}>{rama.statistics.favored_percent?.toFixed(0)}%</span>
                </div>
                <div style={{ width: `${rama.statistics.allowed_percent}%`, background: ACCENT3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {rama.statistics.allowed_percent >= 5 && (
                    <span style={{ fontFamily: "monospace", fontSize: 7, color: "#000" }}>{rama.statistics.allowed_percent?.toFixed(0)}%</span>
                  )}
                </div>
                <div style={{ width: `${rama.statistics.outlier_percent}%`, background: WARN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {rama.statistics.outlier_percent >= 5 && (
                    <span style={{ fontFamily: "monospace", fontSize: 7, color: "#000" }}>{rama.statistics.outlier_percent?.toFixed(0)}%</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Favored", color: ACCENT },
                  { label: "Allowed", color: ACCENT3 },
                  { label: "Outlier", color: WARN },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: l.color, display: "inline-block" }} />
                    <span style={{ fontFamily: "monospace", fontSize: 7, color: LABEL_COLOR }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bfac?.statistics && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: LABEL_COLOR, marginBottom: 4 }}>B-factor distribution</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px" }}>
                {[
                  ["Mean", bfac.statistics.mean?.toFixed(2)],
                  ["Median", bfac.statistics.median?.toFixed(2)],
                  ["Std Dev", bfac.statistics.std?.toFixed(2)],
                  ["Range", `${bfac.statistics.min?.toFixed(1)} – ${bfac.statistics.max?.toFixed(1)}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 7, color: LABEL_COLOR }}>{k}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 7, color: "#aaa" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bfac?.flexibleRegions?.length > 0 && (
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: WARN, marginBottom: 3 }}>Flexible regions</div>
              {bfac.flexibleRegions.map((r, i) => (
                <div key={i} style={{ fontFamily: "monospace", fontSize: 7, color: LABEL_COLOR }}>
                  {r.resName} {r.resNum} — B={r.avgBfactor?.toFixed(1)}
                </div>
              ))}
            </div>
          )}

          {geom && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: LABEL_COLOR, marginBottom: 3 }}>Geometry</div>
              <div style={{ fontFamily: "monospace", fontSize: 7, color: geom.clashCount === 0 ? ACCENT : WARN }}>
                {geom.clashCount === 0 ? "No steric clashes detected" : `${geom.clashCount} clashes (threshold: ${geom.clashThreshold}Å)`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 10, fontFamily: "monospace", fontSize: 7, color: "#2c2c2e", textAlign: "right" }}>
        Powered by Amino Analytica · SASA + Quality Assessment
      </div>
    </div>
  );
}
