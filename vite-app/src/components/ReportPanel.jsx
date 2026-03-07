/**
 * ReportPanel.jsx — Epidemiological report generator panel.
 *
 * Demo mode: instantly serves the pre-generated LaTeX report.
 * Live mode: calls Z.AI (with Flock fallback) to generate a fresh report
 *            from current dashboard data, then downloads the .tex file.
 */
import { useState, useCallback } from "react";
import { generateReport, isReportGenAvailable } from "../api/reportGenerator";
import { downloadFile } from "../utils/download";
import { DEMO_REPORT_TEX, DEMO_REPORT_DATE, DEMO_REPORT_ID } from "../data/demoReport";

/* ── Helpers ─────────────────────────────────────────────────────── */

function downloadTex(content, id) {
  const filename = `biosentinel-epi-report-${id || "draft"}.tex`;
  downloadFile(filename, content, "text/plain");
}

/* ── Sub-components ──────────────────────────────────────────────── */

function StatusLine({ status, isError }) {
  if (!status) return null;
  return (
    <div style={{
      fontFamily: "monospace",
      fontSize: 11,
      color: isError ? "#ff453a" : "#86868b",
      marginTop: 10,
      display: "flex",
      alignItems: "center",
      gap: 6,
    }}>
      {!isError && (
        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#30d158", flexShrink: 0 }} />
      )}
      {status}
    </div>
  );
}

function SectionBullet({ children }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "3px 0" }}>
      <span style={{ color: "#30d158", fontFamily: "monospace", fontSize: 10, marginTop: 2 }}>▸</span>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#8e8e93", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

/**
 * @param {object} props
 * @param {"demo"|"live"} props.dashboardMode
 * @param {Array}  props.candidates
 * @param {Array}  props.feedItems
 * @param {object} props.heatmapData
 * @param {Array}  props.proteinList
 * @param {function} props.onClose
 */
export default function ReportPanel({ dashboardMode, candidates = [], feedItems = [], heatmapData = null, proteinList = [], onClose }) {
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [latexReady, setLatexReady] = useState(null); // { content, id }

  const isDemo = dashboardMode === "demo";

  /* ── Demo download ─────────────────────────────────────────────── */
  const handleDemoDownload = useCallback(() => {
    downloadTex(DEMO_REPORT_TEX, DEMO_REPORT_ID);
    setStatus("Downloaded: biosentinel-epi-report-BSR-20250307-AUTO.tex");
    setIsError(false);
  }, []);

  /* ── Live generate ─────────────────────────────────────────────── */
  const handleGenerate = useCallback(async () => {
    if (!isReportGenAvailable()) {
      setStatus("No AI API key configured. Set VITE_Z_AI_API_KEY or VITE_FLOCK_API_KEY.");
      setIsError(true);
      return;
    }

    setGenerating(true);
    setLatexReady(null);
    setIsError(false);
    setStatus("");

    const id = `BSR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-AUTO`;

    const content = await generateReport(
      { candidates, feedItems, heatmapData, proteinList },
      (msg) => { setStatus(msg); setIsError(false); }
    );

    setGenerating(false);

    if (content) {
      setLatexReady({ content, id });
      setStatus("Report ready — click Download to save.");
      setIsError(false);
    } else {
      setIsError(true);
    }
  }, [candidates, feedItems, heatmapData, proteinList]);

  /* ── Download generated ────────────────────────────────────────── */
  const handleDownloadGenerated = useCallback(() => {
    if (!latexReady) return;
    downloadTex(latexReady.content, latexReady.id);
    setStatus(`Downloaded: biosentinel-epi-report-${latexReady.id}.tex`);
  }, [latexReady]);

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 540,
        maxWidth: "calc(100vw - 40px)",
        background: "#0a0a0f",
        border: "1px solid rgba(10,132,255,0.25)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(10,132,255,0.12)",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,132,255,0.05)",
        }}>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#0a84ff", letterSpacing: "0.02em" }}>
              Epidemiological Report
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              AI-Generated · LaTeX · BioSentinel
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "#48484a", fontSize: 18, lineHeight: 1, padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px 24px" }}>

          {/* Mode badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{
              fontFamily: "monospace", fontSize: 9, fontWeight: 700,
              padding: "3px 8px", borderRadius: 4, letterSpacing: "0.1em",
              background: isDemo ? "rgba(255,159,10,0.12)" : "rgba(48,209,88,0.12)",
              color: isDemo ? "#ff9f0a" : "#30d158",
              border: `1px solid ${isDemo ? "rgba(255,159,10,0.25)" : "rgba(48,209,88,0.25)"}`,
            }}>
              {isDemo ? "DEMO MODE" : "LIVE MODE"}
            </span>
            {isDemo && (
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#3a3a3c" }}>
                Pre-generated · {DEMO_REPORT_DATE}
              </span>
            )}
          </div>

          {/* Report contents preview */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 8,
            padding: "14px 16px",
            marginBottom: 18,
          }}>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "#5e5ce6", fontWeight: 600, marginBottom: 10, letterSpacing: "0.06em" }}>
              REPORT SECTIONS
            </div>
            <SectionBullet>Executive Summary + threat priority matrix</SectionBullet>
            <SectionBullet>Threat intelligence overview — all feed signals analyzed</SectionBullet>
            <SectionBullet>Priority pathogen analysis (H5N1, Nipah, betaCoV, Ebola)</SectionBullet>
            <SectionBullet>Drug candidate pipeline — full scoring table + lead profiles</SectionBullet>
            <SectionBullet>Cross-variant resistance heatmap — combination strategy</SectionBullet>
            <SectionBullet>Target protein structures — binding site druggability</SectionBullet>
            <SectionBullet>Biosecurity risk matrix + GOF assessment</SectionBullet>
            <SectionBullet>Recommendations — immediate / short-term / strategic</SectionBullet>
          </div>

          {/* Data summary */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8, marginBottom: 20,
          }}>
            {[
              { label: "Threat Signals", value: isDemo ? "10" : feedItems.length },
              { label: "Candidates", value: isDemo ? "8" : candidates.length },
              { label: "Proteins", value: isDemo ? "12" : proteinList.length },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 6, padding: "8px 12px", textAlign: "center",
              }}>
                <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#e5e5ea" }}>{value}</div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", marginTop: 2, letterSpacing: "0.06em" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Output format info */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 14px",
            background: "rgba(94,92,230,0.06)",
            border: "1px solid rgba(94,92,230,0.15)",
            borderRadius: 6,
            marginBottom: 20,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5e5ce6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "#5e5ce6" }}>
              Output format: LaTeX (.tex) · Compile with pdflatex or Overleaf
            </span>
          </div>

          {/* Action buttons */}
          {isDemo ? (
            <button
              onClick={handleDemoDownload}
              style={{
                width: "100%",
                padding: "11px 0",
                borderRadius: 8,
                border: "1px solid rgba(48,209,88,0.4)",
                background: "rgba(48,209,88,0.12)",
                color: "#30d158",
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.05em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(48,209,88,0.2)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "rgba(48,209,88,0.12)")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Pre-Generated Report (.tex)
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  width: "100%",
                  padding: "11px 0",
                  borderRadius: 8,
                  border: "1px solid rgba(10,132,255,0.4)",
                  background: generating ? "rgba(10,132,255,0.05)" : "rgba(10,132,255,0.12)",
                  color: generating ? "#48484a" : "#0a84ff",
                  fontFamily: "monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: generating ? "not-allowed" : "pointer",
                  letterSpacing: "0.05em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => { if (!generating) e.currentTarget.style.background = "rgba(10,132,255,0.2)"; }}
                onMouseOut={(e) => { if (!generating) e.currentTarget.style.background = "rgba(10,132,255,0.12)"; }}
              >
                {generating ? (
                  <>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "1.5px solid #48484a", borderTopColor: "#0a84ff", animation: "spin 0.8s linear infinite" }} />
                    Generating…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    Generate Report with Z.AI
                  </>
                )}
              </button>

              {latexReady && (
                <button
                  onClick={handleDownloadGenerated}
                  style={{
                    width: "100%",
                    padding: "11px 0",
                    borderRadius: 8,
                    border: "1px solid rgba(48,209,88,0.4)",
                    background: "rgba(48,209,88,0.12)",
                    color: "#30d158",
                    fontFamily: "monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(48,209,88,0.2)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "rgba(48,209,88,0.12)")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download Report (.tex)
                </button>
              )}
            </div>
          )}

          <StatusLine status={status} isError={isError} />

          {/* Footer note */}
          {!isDemo && (
            <div style={{
              marginTop: 16,
              fontFamily: "monospace", fontSize: 9, color: "#3a3a3c",
              lineHeight: 1.5, letterSpacing: "0.03em",
            }}>
              Generation uses Z.AI GLM-4.5 with Flock.io fallback. Requires{" "}
              <span style={{ color: "#636366" }}>VITE_Z_AI_API_KEY</span> or{" "}
              <span style={{ color: "#636366" }}>VITE_FLOCK_API_KEY</span> in .env.
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
