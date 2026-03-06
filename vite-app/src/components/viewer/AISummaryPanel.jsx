/**
 * AISummaryPanel.jsx — Rich protein analysis dashboard (side panel)
 *
 * Displays instant data-driven content from Amino Analytica analysis,
 * with AI-generated insights loaded in background.
 *
 * Sections:
 *   1. Overview — protein metadata + threat context
 *   2. Structure Quality — Ramachandran, B-factor, clashes, flexible regions
 *   3. Surface Exposure — SASA totals + top exposed residues
 *   4. Pipeline & Design — candidates, available tools
 *   5. AI Insights — generated commentary (loaded async)
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { GLASS_STYLE } from "../../utils/mapConstants";
import { getAnalysisData, getAIInsights, getCachedAnalysis, getCachedAI } from "../../utils/proteinDataCache";
import { downloadMarkdown } from "../../utils/download";
import { toolCatalog } from "../../data/mockDesignData";

/* ── Colors ── */
const ACCENT = "#bf5af2";
const GREEN = "#30d158";
const ORANGE = "#ff9f0a";
const RED = "#ff453a";
const BLUE = "#5e5ce6";
const LABEL = "#636366";
const TEXT = "#b0b0b5";
const DIM = "#48484a";

/* ── Threat context mapping ── */
const PROTEIN_THREATS = {
  "4NQJ": { name: "H5N1 Avian Influenza", level: "critical" },
  "7L1F": { name: "Nipah Virus", level: "critical" },
  "5T6N": { name: "Ebola Virus", level: "critical" },
  "6VMZ": { name: "SARS-CoV-2 (Mpro)", level: "high" },
  "6LU7": { name: "SARS-CoV-2 (Mpro + N3)", level: "high" },
  "7BV2": { name: "SARS-CoV-2 (Spike RBD)", level: "high" },
  "3I6G": { name: "Anthrax (B. anthracis)", level: "critical" },
};

const LEVEL_COLORS = { critical: RED, high: ORANGE, moderate: "#ffd60a", low: GREEN };

/* ── Shared styles ── */
const sectionHeaderStyle = (color = LABEL) => ({
  fontFamily: "monospace",
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color,
  paddingLeft: 8,
  borderLeft: `2px solid ${color}`,
  marginBottom: 8,
  marginTop: 14,
});

const cardStyle = {
  padding: "6px 8px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
  flex: 1,
  minWidth: 0,
};

/* ── Metric card ── */
function Metric({ label, value, unit, color = GREEN }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: "monospace", fontSize: 7, color: LABEL, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color }}>
        {value}
        {unit && <span style={{ fontSize: 7, color: LABEL, marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}

/* ── Bullet item ── */
function Bullet({ children, color = DIM }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: color, marginTop: 4, flexShrink: 0 }} />
      <span style={{ fontFamily: "monospace", fontSize: 9, color: TEXT, lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

export default function AISummaryPanel({ pdbId, pdbInfo, candidates = [], width = 320, onResize, onClose, viewerMode, mockPlddt, mockPae, mockTrajectory, mockSequenceDesign }) {
  const [analysis, setAnalysis] = useState(() => getCachedAnalysis(pdbId));
  const [aiInsights, setAiInsights] = useState(() => getCachedAI(pdbId));
  const [analysisLoading, setAnalysisLoading] = useState(!analysis);
  const [aiLoading, setAiLoading] = useState(!aiInsights);

  // Fetch analysis data (usually instant from pre-fetch cache)
  useEffect(() => {
    let cancelled = false;
    const cached = getCachedAnalysis(pdbId);
    if (cached) {
      setAnalysis(cached);
      setAnalysisLoading(false);
    } else {
      setAnalysisLoading(true);
      getAnalysisData(pdbId).then(data => {
        if (!cancelled) {
          setAnalysis(data);
          setAnalysisLoading(false);
        }
      });
    }
    return () => { cancelled = true; };
  }, [pdbId]);

  // Fetch AI insights (may already be cached from pre-fetch)
  useEffect(() => {
    let cancelled = false;
    const cached = getCachedAI(pdbId);
    if (cached) {
      setAiInsights(cached);
      setAiLoading(false);
    } else {
      setAiLoading(true);
      getAIInsights(pdbId, pdbInfo, analysis).then(result => {
        if (!cancelled) {
          setAiInsights(result);
          setAiLoading(false);
        }
      });
    }
    return () => { cancelled = true; };
  }, [pdbId, pdbInfo, analysis]);

  // Derived data
  const threat = PROTEIN_THREATS[pdbId];
  const sasa = analysis?.sasa;
  const quality = analysis?.quality;
  const rama = quality?.ramachandran?.statistics;
  const bfac = quality?.bfactor;
  const geom = quality?.geometry;
  const flex = bfac?.flexibleRegions || [];

  const topExposed = useMemo(() => {
    if (!sasa?.residues) return [];
    return [...sasa.residues].sort((a, b) => b.sasa - a.sasa).slice(0, 5);
  }, [sasa]);

  const proteinCandidates = useMemo(() => {
    return candidates.filter(c => c.pdb === pdbId);
  }, [candidates, pdbId]);

  /* ── pLDDT stats ── */
  const plddtStats = useMemo(() => {
    if (!mockPlddt || mockPlddt.length === 0) return null;
    const scores = mockPlddt.map(r => r.plddt);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bins = { veryHigh: 0, confident: 0, low: 0, veryLow: 0 };
    scores.forEach(s => {
      if (s > 90) bins.veryHigh++;
      else if (s > 70) bins.confident++;
      else if (s > 50) bins.low++;
      else bins.veryLow++;
    });
    const total = scores.length;
    return { mean, bins, total, min: Math.min(...scores), max: Math.max(...scores) };
  }, [mockPlddt]);

  /* ── PAE stats ── */
  const paeStats = useMemo(() => {
    if (!mockPae || mockPae.length === 0) return null;
    let sum = 0, count = 0, maxVal = 0;
    const n = mockPae.length;
    const domainBoundary = Math.floor(n * 0.55);
    let intraDomain = 0, intraN = 0, interDomain = 0, interN = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = mockPae[i][j];
        sum += v; count++;
        if (v > maxVal) maxVal = v;
        const same = (i < domainBoundary && j < domainBoundary) || (i >= domainBoundary && j >= domainBoundary);
        if (same) { intraDomain += v; intraN++; } else { interDomain += v; interN++; }
      }
    }
    return {
      mean: sum / count,
      max: maxVal,
      intraMean: intraN > 0 ? intraDomain / intraN : 0,
      interMean: interN > 0 ? interDomain / interN : 0,
      size: n,
    };
  }, [mockPae]);

  /* ── Trajectory stats ── */
  const trajStats = useMemo(() => {
    if (!mockTrajectory?.displacements) return null;
    const frames = mockTrajectory.displacements;
    const rmsdPerFrame = frames.map(f => {
      if (!f.length) return 0;
      const msd = f.reduce((s, d) => s + d * d, 0) / f.length;
      return Math.sqrt(msd);
    });
    const finalRmsd = rmsdPerFrame[rmsdPerFrame.length - 1] || 0;
    const maxRmsd = Math.max(...rmsdPerFrame);
    const convergence = rmsdPerFrame.length > 2 ? (rmsdPerFrame[1] - finalRmsd) / (rmsdPerFrame[1] || 1) * 100 : 0;
    return { rmsdPerFrame, finalRmsd, maxRmsd, numFrames: frames.length, convergence };
  }, [mockTrajectory]);

  /* ── Sequence design stats ── */
  const seqStats = useMemo(() => {
    if (!mockSequenceDesign?.residues) return null;
    const { residues, stats } = mockSequenceDesign;
    const designed = residues.filter(r => r.isDesigned);
    const highConf = designed.filter(r => r.confidence > 0.8).length;
    const medConf = designed.filter(r => r.confidence >= 0.6 && r.confidence <= 0.8).length;
    const lowConf = designed.filter(r => r.confidence < 0.6).length;
    return { ...stats, highConf, medConf, lowConf, designed };
  }, [mockSequenceDesign]);

  // B-factor quality color
  const bfacColor = (mean) => mean < 25 ? GREEN : mean < 40 ? ORANGE : RED;
  const ramaColor = (fav) => fav > 90 ? GREEN : fav > 80 ? ORANGE : RED;
  const clashColor = (n) => n === 0 ? GREEN : n <= 2 ? ORANGE : RED;

  /* ── Resize drag handler ── */
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const onMove = (me) => {
      const newW = Math.max(240, Math.min(560, startW - (me.clientX - startX)));
      onResize?.(newW);
    };
    const onUp = () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.dispatchEvent(new Event("resize"));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [width, onResize]);

  /* ── Download handler ── */
  const handleDownload = () => {
    const lines = [`# Protein Analysis: ${pdbInfo?.label || pdbId} (${pdbId})\n`];
    lines.push(`**Organism:** ${pdbInfo?.organism || "Unknown"}`);
    lines.push(`**Residues:** ${pdbInfo?.residues || "?"} | **Chains:** ${pdbInfo?.chains || "?"} | **MW:** ${pdbInfo?.mw || "?"}`);
    if (threat) lines.push(`**Biosecurity context:** ${threat.name} (${threat.level})\n`);
    if (sasa) {
      lines.push(`\n## Surface Exposure (SASA)`);
      lines.push(`- Total: ${sasa.totalSasa?.toFixed(1)} nm²`);
      lines.push(`- Average: ${sasa.avgSasa?.toFixed(2)} nm²`);
      lines.push(`- Maximum: ${sasa.maxSasa?.toFixed(2)} nm²`);
      if (topExposed.length > 0) {
        lines.push(`- Most exposed: ${topExposed.map(r => `${r.resName}${r.resNum} (${r.sasa.toFixed(2)})`).join(", ")}`);
      }
    }
    if (rama) {
      lines.push(`\n## Structure Quality`);
      lines.push(`- Ramachandran: ${rama.favored_percent.toFixed(1)}% favored, ${rama.allowed_percent.toFixed(1)}% allowed, ${rama.outlier_percent.toFixed(1)}% outlier`);
    }
    if (bfac?.statistics) {
      lines.push(`- B-factor: mean=${bfac.statistics.mean.toFixed(1)}, max=${bfac.statistics.max.toFixed(1)}, std=${bfac.statistics.std.toFixed(1)}`);
    }
    if (geom) lines.push(`- Clashes: ${geom.clashCount}`);
    if (flex.length > 0) {
      lines.push(`- Flexible regions: ${flex.map(r => `${r.resName}${r.resNum} (B=${r.avgBfactor.toFixed(1)})`).join(", ")}`);
    }
    if (aiInsights) {
      lines.push(`\n## AI Analysis`);
      lines.push(aiInsights.insight);
      if (aiInsights.highlights) lines.push(`\n${aiInsights.highlights.map(h => `- ${h}`).join("\n")}`);
      if (aiInsights.recommendation) lines.push(`\n**Recommendation:** ${aiInsights.recommendation}`);
    }
    downloadMarkdown(`${pdbId}_analysis_report.md`, lines.join("\n"));
  };

  return (
    <motion.div
      initial={{ x: width + 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: width + 20, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      style={{
        width,
        ...GLASS_STYLE,
        borderRadius: 0,
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
        alignSelf: "stretch",
        position: "relative",
      }}
    >
      {/* ═══ Resize handle (left edge) ═══ */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 5,
          cursor: "col-resize",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseOver={(e) => e.currentTarget.firstChild.style.opacity = 1}
        onMouseOut={(e) => e.currentTarget.firstChild.style.opacity = 0}
      >
        <div style={{
          width: 2,
          height: 32,
          borderRadius: 1,
          background: ACCENT,
          opacity: 0,
          transition: "opacity 0.15s",
        }} />
      </div>

      {/* ═══ Header ═══ */}
      <div style={{
        padding: "10px 14px 8px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'Inter', system-ui", fontSize: 11, fontWeight: 600, color: "#e5e5ea" }}>
            {pdbInfo?.label || pdbId}
          </span>
          <span style={{
            padding: "2px 6px", borderRadius: 4, background: `${ACCENT}20`,
            fontFamily: "monospace", fontSize: 8, fontWeight: 600, color: ACCENT,
          }}>
            {pdbId}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={handleDownload} title="Download report" style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "flex", alignItems: "center", color: LABEL, transition: "color 0.15s",
          }}
            onMouseOver={e => e.currentTarget.style.color = ACCENT}
            onMouseOut={e => e.currentTarget.style.color = LABEL}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "flex", alignItems: "center", color: LABEL, transition: "color 0.15s",
          }}
            onMouseOver={e => e.currentTarget.style.color = "#e5e5ea"}
            onMouseOut={e => e.currentTarget.style.color = LABEL}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ═══ Scrollable content ═══ */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0, padding: "6px 14px 14px" }}>

        {/* ── Overview ── */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: DIM, marginBottom: 4 }}>
            {pdbInfo?.organism || "Unknown organism"}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: TEXT, marginBottom: 6 }}>
            {pdbInfo?.residues || "?"} residues · {pdbInfo?.chains || "?"} chain{(pdbInfo?.chains || 0) > 1 ? "s" : ""} · {pdbInfo?.mw || "?"}
          </div>
          {threat && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px",
              borderRadius: 4, background: `${LEVEL_COLORS[threat.level]}12`,
              border: `1px solid ${LEVEL_COLORS[threat.level]}30`,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: LEVEL_COLORS[threat.level],
                boxShadow: `0 0 4px ${LEVEL_COLORS[threat.level]}60`,
              }} />
              <span style={{ fontFamily: "monospace", fontSize: 8, fontWeight: 600, color: LEVEL_COLORS[threat.level] }}>
                {threat.name}
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 7, color: DIM, textTransform: "uppercase" }}>
                {threat.level}
              </span>
            </div>
          )}
        </div>

        {/* ── Mode-specific stats ── */}
        {viewerMode === "plddt" && plddtStats && (
          <>
            <div style={sectionHeaderStyle("#65cbf3")}>pLDDT Confidence</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <Metric label="Mean" value={plddtStats.mean.toFixed(1)} color={plddtStats.mean > 70 ? GREEN : ORANGE} />
              <Metric label="Min" value={plddtStats.min.toFixed(1)} color={plddtStats.min > 50 ? ORANGE : RED} />
              <Metric label="Max" value={plddtStats.max.toFixed(1)} color={GREEN} />
            </div>
            {/* Distribution bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: "monospace", fontSize: 7, color: LABEL, marginBottom: 4 }}>Confidence distribution</div>
              <div style={{ display: "flex", height: 12, borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                <div style={{ width: `${(plddtStats.bins.veryHigh / plddtStats.total) * 100}%`, background: "#0053d6" }} title={`Very high (>90): ${plddtStats.bins.veryHigh}`} />
                <div style={{ width: `${(plddtStats.bins.confident / plddtStats.total) * 100}%`, background: "#65cbf3" }} title={`Confident (70-90): ${plddtStats.bins.confident}`} />
                <div style={{ width: `${(plddtStats.bins.low / plddtStats.total) * 100}%`, background: "#ffdb13" }} title={`Low (50-70): ${plddtStats.bins.low}`} />
                <div style={{ width: `${(plddtStats.bins.veryLow / plddtStats.total) * 100}%`, background: "#ff7d45" }} title={`Very low (<50): ${plddtStats.bins.veryLow}`} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { label: `Very high ${((plddtStats.bins.veryHigh / plddtStats.total) * 100).toFixed(0)}%`, color: "#0053d6" },
                  { label: `Confident ${((plddtStats.bins.confident / plddtStats.total) * 100).toFixed(0)}%`, color: "#65cbf3" },
                  { label: `Low ${((plddtStats.bins.low / plddtStats.total) * 100).toFixed(0)}%`, color: "#ffdb13" },
                  { label: `Very low ${((plddtStats.bins.veryLow / plddtStats.total) * 100).toFixed(0)}%`, color: "#ff7d45" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 1, background: l.color }} />
                    <span style={{ fontFamily: "monospace", fontSize: 7, color: LABEL }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <Bullet color="#65cbf3">
              {plddtStats.bins.veryHigh + plddtStats.bins.confident} of {plddtStats.total} residues above 70 confidence ({((plddtStats.bins.veryHigh + plddtStats.bins.confident) / plddtStats.total * 100).toFixed(1)}%)
            </Bullet>
            {plddtStats.bins.veryLow > 0 && (
              <Bullet color="#ff7d45">
                {plddtStats.bins.veryLow} residues with very low confidence — likely disordered or unresolved
              </Bullet>
            )}
          </>
        )}

        {viewerMode === "pae" && paeStats && (
          <>
            <div style={sectionHeaderStyle(ORANGE)}>Predicted Aligned Error</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <Metric label="Mean PAE" value={paeStats.mean.toFixed(1)} unit="Å" color={paeStats.mean < 5 ? GREEN : paeStats.mean < 10 ? ORANGE : RED} />
              <Metric label="Max PAE" value={paeStats.max.toFixed(1)} unit="Å" color={RED} />
              <Metric label="Matrix" value={`${paeStats.size}×${paeStats.size}`} color={BLUE} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: "monospace", fontSize: 7, color: LABEL, marginBottom: 4 }}>Domain coupling</div>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={cardStyle}>
                  <div style={{ fontFamily: "monospace", fontSize: 7, color: LABEL, marginBottom: 2 }}>Intra-domain</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: GREEN }}>
                    {paeStats.intraMean.toFixed(1)}<span style={{ fontSize: 7, color: LABEL, marginLeft: 2 }}>Å</span>
                  </div>
                </div>
                <div style={cardStyle}>
                  <div style={{ fontFamily: "monospace", fontSize: 7, color: LABEL, marginBottom: 2 }}>Inter-domain</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: paeStats.interMean < 10 ? ORANGE : RED }}>
                    {paeStats.interMean.toFixed(1)}<span style={{ fontSize: 7, color: LABEL, marginLeft: 2 }}>Å</span>
                  </div>
                </div>
              </div>
            </div>
            <Bullet color={GREEN}>Low intra-domain PAE indicates well-defined domain cores</Bullet>
            <Bullet color={paeStats.interMean > 10 ? RED : ORANGE}>
              {paeStats.interMean > 10
                ? "High inter-domain PAE suggests flexible domain orientation"
                : "Moderate inter-domain PAE — domains may have defined relative orientation"}
            </Bullet>
          </>
        )}

        {viewerMode === "trajectory" && trajStats && (
          <>
            <div style={sectionHeaderStyle(BLUE)}>Trajectory Analysis</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <Metric label="Final RMSD" value={trajStats.finalRmsd.toFixed(2)} unit="Å" color={trajStats.finalRmsd < 1 ? GREEN : ORANGE} />
              <Metric label="Max RMSD" value={trajStats.maxRmsd.toFixed(2)} unit="Å" color={ORANGE} />
              <Metric label="Frames" value={trajStats.numFrames} color={BLUE} />
            </div>
            {/* RMSD sparkline */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: "monospace", fontSize: 7, color: LABEL, marginBottom: 4 }}>RMSD per frame</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 32 }}>
                {trajStats.rmsdPerFrame.map((rmsd, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${trajStats.maxRmsd > 0 ? (rmsd / trajStats.maxRmsd) * 100 : 0}%`,
                      minHeight: 1,
                      background: `linear-gradient(180deg, ${BLUE}, ${BLUE}60)`,
                      borderRadius: "1px 1px 0 0",
                    }}
                    title={`Frame ${i}: ${rmsd.toFixed(3)} Å`}
                  />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontFamily: "monospace", fontSize: 6, color: DIM }}>Frame 0</span>
                <span style={{ fontFamily: "monospace", fontSize: 6, color: DIM }}>Frame {trajStats.numFrames - 1}</span>
              </div>
            </div>
            <Bullet color={GREEN}>
              Convergence: {trajStats.convergence.toFixed(0)}% RMSD reduction from initial to final frame
            </Bullet>
            <Bullet color={BLUE}>
              Diffusion trajectory shows {trajStats.finalRmsd < 0.5 ? "strong" : trajStats.finalRmsd < 1.5 ? "good" : "moderate"} convergence to target structure
            </Bullet>
          </>
        )}

        {viewerMode === "sequence" && seqStats && (
          <>
            <div style={sectionHeaderStyle("#af52de")}>Sequence Design</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <Metric label="Designed" value={seqStats.designedResidues} unit={`/ ${seqStats.totalResidues}`} color="#af52de" />
              <Metric label="Avg Conf." value={(seqStats.avgConfidence * 100).toFixed(0)} unit="%" color={seqStats.avgConfidence > 0.7 ? GREEN : ORANGE} />
              <Metric label="Coverage" value={(seqStats.designFraction * 100).toFixed(0)} unit="%" color={BLUE} />
            </div>
            {/* Confidence breakdown */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: "monospace", fontSize: 7, color: LABEL, marginBottom: 4 }}>Designed residue confidence</div>
              <div style={{ display: "flex", height: 10, borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                {seqStats.designedResidues > 0 && (
                  <>
                    <div style={{ width: `${(seqStats.highConf / seqStats.designedResidues) * 100}%`, background: GREEN }} title={`High (>80%): ${seqStats.highConf}`} />
                    <div style={{ width: `${(seqStats.medConf / seqStats.designedResidues) * 100}%`, background: ORANGE }} title={`Medium (60-80%): ${seqStats.medConf}`} />
                    <div style={{ width: `${(seqStats.lowConf / seqStats.designedResidues) * 100}%`, background: RED }} title={`Low (<60%): ${seqStats.lowConf}`} />
                  </>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: `High ${seqStats.highConf}`, color: GREEN },
                  { label: `Medium ${seqStats.medConf}`, color: ORANGE },
                  { label: `Low ${seqStats.lowConf}`, color: RED },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 1, background: l.color }} />
                    <span style={{ fontFamily: "monospace", fontSize: 7, color: LABEL }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <Bullet color="#af52de">
              {seqStats.conservedResidues} residues conserved ({((seqStats.conservedResidues / seqStats.totalResidues) * 100).toFixed(0)}% identity with original)
            </Bullet>
            {seqStats.lowConf > 0 && (
              <Bullet color={RED}>
                {seqStats.lowConf} mutations below 60% confidence — consider manual review
              </Bullet>
            )}
          </>
        )}

        {/* ── Structure Quality ── */}
        {analysis && quality && (
          <>
            <div style={sectionHeaderStyle(GREEN)}>Structure Quality</div>

            {/* Metric cards row */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {rama && (
                <Metric
                  label="Ramachandran"
                  value={rama.favored_percent?.toFixed(1)}
                  unit="% fav"
                  color={ramaColor(rama.favored_percent)}
                />
              )}
              {bfac?.statistics && (
                <Metric
                  label="Mean B-factor"
                  value={bfac.statistics.mean?.toFixed(1)}
                  unit="Å²"
                  color={bfacColor(bfac.statistics.mean)}
                />
              )}
              {geom && (
                <Metric
                  label="Clashes"
                  value={geom.clashCount}
                  unit=""
                  color={clashColor(geom.clashCount)}
                />
              )}
            </div>

            {/* Ramachandran stacked bar */}
            {rama && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", height: 10, borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ width: `${rama.favored_percent}%`, background: GREEN }} title={`Favored: ${rama.favored_percent.toFixed(1)}%`} />
                  <div style={{ width: `${rama.allowed_percent}%`, background: ORANGE }} title={`Allowed: ${rama.allowed_percent.toFixed(1)}%`} />
                  <div style={{ width: `${rama.outlier_percent}%`, background: RED }} title={`Outlier: ${rama.outlier_percent.toFixed(1)}%`} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: `Favored ${rama.favored_percent.toFixed(0)}%`, color: GREEN },
                    { label: `Allowed ${rama.allowed_percent.toFixed(0)}%`, color: ORANGE },
                    { label: `Outlier ${rama.outlier_percent.toFixed(0)}%`, color: RED },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: 1, background: l.color }} />
                      <span style={{ fontFamily: "monospace", fontSize: 7, color: LABEL }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B-factor range */}
            {bfac?.statistics && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 7, color: LABEL }}>B-factor range</span>
                  <span style={{ fontFamily: "monospace", fontSize: 7, color: TEXT }}>
                    {bfac.statistics.min?.toFixed(1)} — {bfac.statistics.max?.toFixed(1)} Å²
                  </span>
                </div>
                {/* Mini range bar */}
                <div style={{ position: "relative", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  {(() => {
                    const range = bfac.statistics.max - bfac.statistics.min;
                    const meanPos = range > 0 ? ((bfac.statistics.mean - bfac.statistics.min) / range) * 100 : 50;
                    return (
                      <>
                        <div style={{ position: "absolute", left: 0, width: `${meanPos}%`, height: "100%", background: `linear-gradient(90deg, ${BLUE}40, ${BLUE})`, borderRadius: 3 }} />
                        <div style={{ position: "absolute", left: `${meanPos - 1}%`, width: 3, height: "100%", background: "#fff", borderRadius: 1 }} title={`Mean: ${bfac.statistics.mean.toFixed(1)}`} />
                      </>
                    );
                  })()}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 6, color: DIM }}>min {bfac.statistics.min?.toFixed(1)}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 6, color: BLUE }}>mean {bfac.statistics.mean?.toFixed(1)}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 6, color: DIM }}>max {bfac.statistics.max?.toFixed(1)}</span>
                </div>
              </div>
            )}

            {/* Flexible regions */}
            {flex.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontFamily: "monospace", fontSize: 7, color: ORANGE, marginBottom: 4 }}>
                  Flexible regions ({flex.length})
                </div>
                {flex.map((r, i) => (
                  <Bullet key={i} color={ORANGE}>
                    <span style={{ color: "#e5e5ea", fontWeight: 600 }}>{r.resName}{r.resNum}</span>
                    {" "}— B-factor {r.avgBfactor?.toFixed(1)} Å²
                    {r.avgBfactor > 50 && <span style={{ color: RED, marginLeft: 4 }}>high</span>}
                  </Bullet>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Surface Exposure ── */}
        {sasa && (
          <>
            <div style={sectionHeaderStyle(BLUE)}>Surface Exposure</div>

            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <Metric label="Total SASA" value={sasa.totalSasa?.toFixed(1)} unit="nm²" color={BLUE} />
              <Metric label="Avg" value={sasa.avgSasa?.toFixed(2)} unit="nm²" color={BLUE} />
              <Metric label="Max" value={sasa.maxSasa?.toFixed(2)} unit="nm²" color={ORANGE} />
            </div>

            {topExposed.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontFamily: "monospace", fontSize: 7, color: LABEL, marginBottom: 4 }}>
                  Most exposed residues
                </div>
                {topExposed.map((r, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 3,
                  }}>
                    <span style={{
                      fontFamily: "monospace", fontSize: 8, color: "#e5e5ea", fontWeight: 600,
                      minWidth: 52,
                    }}>
                      {r.resName}{r.resNum}
                    </span>
                    {/* Mini bar */}
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                      <div style={{
                        width: `${sasa.maxSasa > 0 ? (r.sasa / sasa.maxSasa) * 100 : 0}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, ${BLUE}80, ${BLUE})`,
                        borderRadius: 2,
                      }} />
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 7, color: TEXT, minWidth: 38, textAlign: "right" }}>
                      {r.sasa.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── No analysis data message ── */}
        {!analysisLoading && !analysis && (
          <div style={{
            marginTop: 14, padding: "12px 10px", borderRadius: 8,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
            textAlign: "center",
          }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: LABEL, marginBottom: 4 }}>
              No Amino Analytica data for {pdbId}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 8, color: DIM }}>
              Run analysis via CLI to see SASA, B-factor, Ramachandran, and quality metrics.
            </div>
          </div>
        )}

        {/* ── Pipeline & Design ── */}
        <div style={sectionHeaderStyle("#af52de")}>Pipeline & Design</div>

        {proteinCandidates.length > 0 ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: "monospace", fontSize: 7, color: LABEL, marginBottom: 4 }}>
              Active candidates ({proteinCandidates.length})
            </div>
            {proteinCandidates.map(c => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "4px 8px", borderRadius: 4, marginBottom: 3,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ fontFamily: "monospace", fontSize: 8, color: "#e5e5ea", fontWeight: 600 }}>
                  {c.id}
                </span>
                <span style={{ fontFamily: "monospace", fontSize: 8, color: TEXT }}>{c.name}</span>
                <span style={{
                  fontFamily: "monospace", fontSize: 8, fontWeight: 600,
                  color: c.score > 0.85 ? GREEN : c.score > 0.6 ? ORANGE : RED,
                }}>
                  {c.score?.toFixed(2)}
                </span>
                <span style={{
                  fontFamily: "monospace", fontSize: 7, padding: "1px 4px", borderRadius: 3,
                  background: c.status === "pass" ? `${GREEN}15` : `${ORANGE}15`,
                  color: c.status === "pass" ? GREEN : ORANGE,
                }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: "monospace", fontSize: 8, color: DIM, marginBottom: 8 }}>
            No candidates targeting this protein yet.
          </div>
        )}

        {/* Design tools */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
          {toolCatalog.map(tool => (
            <span key={tool.id} style={{
              padding: "3px 7px", borderRadius: 4, fontFamily: "monospace", fontSize: 7,
              background: `${tool.accentColor}12`, border: `1px solid ${tool.accentColor}25`,
              color: tool.accentColor,
            }}>
              {tool.icon} {tool.name}
            </span>
          ))}
        </div>

        {/* ── AI Insights ── */}
        <div style={sectionHeaderStyle(ACCENT)}>AI Analysis</div>

        {aiLoading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 0",
          }}>
            <div style={{
              width: 16, height: 16, border: "2px solid rgba(255,255,255,0.1)",
              borderTopColor: ACCENT, borderRadius: "50%", animation: "spin 1s linear infinite",
              flexShrink: 0,
            }} />
            <span style={{ fontFamily: "monospace", fontSize: 8, color: DIM }}>
              Generating AI analysis...
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!aiLoading && aiInsights && (
          <div style={{ marginBottom: 6 }}>
            {/* Insight paragraph */}
            <div style={{
              fontFamily: "'Inter', system-ui", fontSize: 10, color: TEXT,
              lineHeight: 1.65, marginBottom: 8, padding: "8px 10px",
              borderRadius: 6, background: `${ACCENT}08`, border: `1px solid ${ACCENT}15`,
            }}>
              {aiInsights.insight}
            </div>

            {/* Highlights */}
            {aiInsights.highlights?.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                {aiInsights.highlights.map((h, i) => (
                  <Bullet key={i} color={ACCENT}>{h}</Bullet>
                ))}
              </div>
            )}

            {/* Recommendation */}
            {aiInsights.recommendation && (
              <div style={{
                display: "flex", gap: 6, alignItems: "flex-start",
                padding: "6px 8px", borderRadius: 4,
                background: `${GREEN}08`, border: `1px solid ${GREEN}15`,
              }}>
                <span style={{ fontFamily: "monospace", fontSize: 7, color: GREEN, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>REC</span>
                <span style={{ fontFamily: "monospace", fontSize: 8, color: TEXT, lineHeight: 1.4 }}>
                  {aiInsights.recommendation}
                </span>
              </div>
            )}
          </div>
        )}

        {!aiLoading && !aiInsights && (
          <div style={{ fontFamily: "monospace", fontSize: 8, color: DIM, padding: "6px 0" }}>
            AI insights unavailable. Check API configuration.
          </div>
        )}
      </div>

      {/* ═══ Footer ═══ */}
      <div style={{
        padding: "6px 14px", borderTop: "1px solid rgba(255,255,255,0.04)",
        fontFamily: "monospace", fontSize: 7, color: "#2c2c2e", textAlign: "right", flexShrink: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{analysis ? "Amino Analytica" : ""}</span>
        <span>Z.AI + Flock.io</span>
      </div>
    </motion.div>
  );
}
