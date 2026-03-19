/**
 * ActivityFeed.jsx — Left sidebar: system status, live flow banner, run button, threat feed.
 *
 * Props:
 *   items                  – array of feed entries
 *   status                 – { status, confidence }
 *   running                – boolean
 *   onRun                  – callback for "Run Pipeline"
 *   pipelineMode           – "mock" | "real"
 *   onTogglePipelineMode   – callback
 *   onOpenJobPanel         – callback
 *   onOpenPipelineConfig   – callback
 *   refreshingIntel        – boolean
 *   onGatherIntel          – callback({ mode, query })
 *   scraperRunning         – boolean
 *   lastScraperUpdate      – timestamp (ms) or null
 *   dashboardMode          – "demo" | "live"
 *   scraperHealth          – "checking" | "connected" | "offline"
 *   hasSuggestions         – boolean
 *   onOpenDiscoveryPanel   – callback
 *   liveFlowStage          – null | "scraping" | "strains_found" | "ready_to_run" | "running" | "complete"
 *   highlightedStrains     – string[] of strain names (lowercased)
 *   suggestedProteins      – array of suggested protein objects
 *   intelValidation        – null | { status: "validating"|"accepted"|"rejected", reason?, query? }
 *   scraperSourceCount     – number of sources found so far
 */
import { useState } from "react";

function relativeTime(ts) {
  if (!ts) return null;
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/* ── SVG icons per source type ── */
const Icons = {
  twitter: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  rss: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.5" fill="currentColor"/>
    </svg>
  ),
  lab: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M10 3v7l-5 9h14l-5-9V3"/>
    </svg>
  ),
  alert: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 20h20L12 2zM12 9v4M12 16h.01"/>
    </svg>
  ),
  system: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6M9 12h6M9 15h3"/>
    </svg>
  ),
  job: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M10 3v7l-5 9h14l-5-9V3"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/>
    </svg>
  ),
  news: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M18 18h-8M18 6h-8v4h8V6z"/>
    </svg>
  ),
};

const LABELS = { twitter: "X / Twitter", rss: "RSS Feed", lab: "Lab", alert: "Alert", system: "System", job: "Design Job", news: "News" };
const COLORS = { twitter: "#1d9bf0", rss: "#ff9f0a", lab: "#30d158", alert: "#ff453a", system: "#86868b", job: "#5e5ce6", news: "#ac8e68" };

/* ── Live flow stage banner config ── */
const STAGE_BANNER = {
  scraping: { color: "#30d158", pulse: true, text: "Scraper active — gathering threat intelligence…" },
  strains_found: { color: "#ff9f0a", pulse: false, text: null }, // dynamic text
  ready_to_run: { color: "#30d158", pulse: false, text: "Ready — configure and run pipeline" },
  running: { color: "#5e5ce6", pulse: true, text: "Pipeline executing…" },
  complete: { color: "#30d158", pulse: false, icon: "check", text: "Pipeline complete — view results" },
};

/** Highlight strain names within a message string */
function highlightMessage(message, strains) {
  if (!strains?.length || !message) return message;
  const escaped = strains.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = message.split(regex);
  if (parts.length === 1) return message;
  return parts.map((part, i) =>
    i % 2 !== 0
      ? <span key={i} style={{ color: "#30d158", fontWeight: 700 }}>{part}</span>
      : part
  );
}

/** Check if a message mentions any highlighted strain */
function mentionsStrain(message, strains) {
  if (!strains || strains.length === 0 || !message) return false;
  const lower = message.toLowerCase();
  return strains.some((s) => lower.includes(s));
}

export default function ActivityFeed({
  items, status, running, onRun, pipelineMode, onTogglePipelineMode,
  onOpenJobPanel, onOpenPipelineConfig, refreshingIntel, onGatherIntel,
  scraperRunning, lastScraperUpdate,
  dashboardMode, scraperHealth, hasSuggestions, onOpenDiscoveryPanel,
  liveFlowStage, highlightedStrains, suggestedProteins,
  intelValidation, scraperSourceCount = 0,
}) {
  const [intelMode, setIntelMode] = useState("default"); // "default" | "custom"
  const [queryText, setQueryText] = useState("");

  const confidenceColor = (c) => c > 80 ? "#30d158" : c >= 50 ? "#ff9f0a" : "#ff453a";

  // Build dynamic banner text for strains_found
  const stageBanner = liveFlowStage ? STAGE_BANNER[liveFlowStage] : null;
  const bannerText = liveFlowStage === "strains_found" && highlightedStrains?.length > 0
    ? `${highlightedStrains.length} strain${highlightedStrains.length !== 1 ? "s" : ""} detected — review targets below`
    : stageBanner?.text;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* ── Live flow status banner ── */}
      {dashboardMode === "live" && stageBanner && bannerText && (
        <div
          className="live-flow-banner"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: `${stageBanner.color}10`,
            borderBottom: `1px solid ${stageBanner.color}30`,
          }}
        >
          {stageBanner.icon === "check" ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stageBanner.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: stageBanner.color,
                flexShrink: 0,
                animation: stageBanner.pulse ? "pulse 1.5s ease-in-out infinite" : "none",
              }}
            />
          )}
          <span style={{
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: 600,
            color: stageBanner.color,
          }}>
            {bannerText}
          </span>
        </div>
      )}

      {/* ── Status indicator ── */}
      <div className="flex flex-col gap-1 px-4 py-2.5 border-b border-[#141414]">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium
              ${running ? "bg-[rgba(255,159,10,0.1)] text-[#ff9f0a]" : "bg-[rgba(48,209,88,0.1)] text-[#30d158]"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full bg-current ${running ? "animate-pulse-glow" : ""}`} />
            {running ? "Processing" : status.status}
          </span>
          <span className="font-mono text-xs font-medium text-[#f5f5f7]">
            {status.confidence}<span className="text-[10px] text-[#48484a]">%</span>
          </span>
        </div>
        {status.topPathogen && (
          <div className="flex items-center gap-2 font-mono text-[8px] text-[#48484a]">
            <span className="uppercase">{status.severity || "monitoring"}</span>
            <span className="text-[#2a2a2a]">|</span>
            <span>{status.threatsDetected || 0} threats</span>
            <span className="text-[#2a2a2a]">|</span>
            <span className="text-[#ff9f0a]">{status.topPathogen}</span>
          </div>
        )}
      </div>

      {/* ── Run Pipeline button + config gear ── */}
      <div className="flex items-center gap-1.5 mx-4 mt-2.5">
        <button
          onClick={onRun}
          disabled={running}
          className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all
            flex items-center justify-center gap-2
            ${running
              ? "bg-[#111] text-[#ff9f0a] border border-[#1c1c1c] cursor-default"
              : "bg-[#30d158] text-black border border-transparent cursor-pointer hover:opacity-90 active:scale-[0.98]"}`}
        >
          {running ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
              </svg>
              Running Pipeline…
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4l16 8-16 8V4z"/>
              </svg>
              Run Pipeline
            </>
          )}
        </button>
        {onOpenPipelineConfig && (
          <button
            onClick={onOpenPipelineConfig}
            disabled={running}
            className="pipeline-config-trigger w-[30px] h-[30px] rounded-lg border border-[#1c1c1c] bg-[rgba(255,255,255,0.04)] flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-all disabled:opacity-40 disabled:cursor-default"
            title="Pipeline configuration"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Pipeline mode toggle ── */}
      {onTogglePipelineMode && (
        <div className="flex items-center justify-center mt-1.5 mb-0.5">
          <button
            onClick={onTogglePipelineMode}
            disabled={running}
            className="font-mono text-[9px] transition-colors border-none bg-transparent cursor-pointer"
            style={{
              color: pipelineMode === "real" ? "#30d158" : "#48484a",
              opacity: running ? 0.4 : 1,
            }}
          >
            mode: {pipelineMode}
          </button>
        </div>
      )}

      {/* ── Pipeline CTA card (Part 3) ── */}
      {liveFlowStage === "ready_to_run" && suggestedProteins?.length > 0 && onOpenPipelineConfig && !running && (
        <div
          style={{
            margin: "8px 16px 4px",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(48,209,88,0.3)",
            background: "rgba(48,209,88,0.06)",
          }}
        >
          <div style={{
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "#f5f5f7",
            marginBottom: 6,
          }}>
            {suggestedProteins.length} protein target{suggestedProteins.length !== 1 ? "s" : ""} identified from threat data
          </div>
          <button
            onClick={onOpenPipelineConfig}
            style={{
              width: "100%",
              padding: "6px 0",
              borderRadius: 6,
              border: "none",
              background: "#30d158",
              color: "#000",
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "opacity 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4l16 8-16 8V4z"/>
            </svg>
            Run Pipeline
          </button>
          <div style={{
            fontFamily: "monospace",
            fontSize: 8,
            color: "#48484a",
            marginTop: 4,
            textAlign: "center",
          }}>
            Recommended: Quick Scan for rapid assessment
          </div>
        </div>
      )}

      {/* ── Threat Feed header + New Job button ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
          Threat Feed
        </span>
        {onOpenJobPanel && (
          <button
            onClick={onOpenJobPanel}
            className="text-[#5e5ce6] hover:text-[#7d7bff] transition-colors"
            style={{
              padding: "1px 6px",
              borderRadius: 3,
              border: "1px solid rgba(94,92,230,0.2)",
              background: "rgba(94,92,230,0.08)",
              fontFamily: "monospace",
              fontSize: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="New Design Job"
          >
            + New Job
          </button>
        )}
      </div>

      {/* ── Gather Intel panel (live mode only) ── */}
      {dashboardMode === "live" && (
        <div style={{
          margin: "4px 16px 6px",
          borderRadius: 7,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.015)",
          overflow: "hidden",
        }}>
          {/* Header row: label + mode pills + status */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px 5px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "monospace", fontSize: 8, fontWeight: 700, color: "#636366", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Intel
              </span>
              {/* Mode pills */}
              {[
                { key: "default", label: "Outbreak", color: "#30d158" },
                { key: "custom", label: "Custom", color: "#5e5ce6" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => { setIntelMode(m.key); setQueryText(""); }}
                  disabled={scraperRunning}
                  style={{
                    padding: "1px 7px", borderRadius: 3, border: "none",
                    cursor: scraperRunning ? "default" : "pointer",
                    fontFamily: "monospace", fontSize: 7, fontWeight: 700, textTransform: "uppercase",
                    background: intelMode === m.key ? `${m.color}20` : "rgba(255,255,255,0.04)",
                    color: intelMode === m.key ? m.color : "#48484a",
                    transition: "all 0.15s",
                    opacity: scraperRunning ? 0.5 : 1,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {/* Status indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                background: scraperHealth === "connected" ? "#30d158" : scraperHealth === "offline" ? "#ff453a" : "#636366",
                animation: scraperHealth === "checking" || scraperRunning ? "pulse 1.5s ease-in-out infinite" : "none",
              }} />
              <span style={{ fontFamily: "monospace", fontSize: 7, color: "#48484a" }}>
                {scraperRunning
                  ? scraperSourceCount > 0 ? `${scraperSourceCount} found` : "scanning…"
                  : lastScraperUpdate ? `${relativeTime(lastScraperUpdate)}` : "no data"}
              </span>
            </div>
          </div>

          {/* Custom query input */}
          {intelMode === "custom" && (
            <div style={{ padding: "0 10px 6px" }}>
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !scraperRunning && queryText.trim()) {
                    onGatherIntel({ mode: "custom", query: queryText });
                  }
                }}
                disabled={scraperRunning}
                placeholder="e.g. H5N1 avian influenza mutations…"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "5px 8px", borderRadius: 5,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#e5e5ea", fontFamily: "monospace", fontSize: 9,
                  outline: "none", caretColor: "#5e5ce6",
                  opacity: scraperRunning ? 0.5 : 1,
                }}
              />
              {/* Z.AI validation feedback */}
              {intelValidation && (
                <div style={{ marginTop: 4, display: "flex", alignItems: "flex-start", gap: 4 }}>
                  {intelValidation.status === "validating" && (
                    <>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite", flexShrink: 0, marginTop: 1 }}>
                        <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontFamily: "monospace", fontSize: 8, color: "#ff9f0a" }}>Validating with AI…</span>
                    </>
                  )}
                  {intelValidation.status === "accepted" && (
                    <>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span style={{ fontFamily: "monospace", fontSize: 8, color: "#30d158" }}>Searching: "{intelValidation.query}"</span>
                    </>
                  )}
                  {intelValidation.status === "rejected" && (
                    <>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ff453a" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      <span style={{ fontFamily: "monospace", fontSize: 8, color: "#ff453a" }}>{intelValidation.reason}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active scraping status bar */}
          {scraperRunning && (
            <div style={{ padding: "0 10px 6px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 8px", borderRadius: 4,
                background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.15)",
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
                  <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
                </svg>
                <span style={{ fontFamily: "monospace", fontSize: 8, color: "#30d158", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {intelMode === "custom" && intelValidation?.query
                    ? `Scraping: "${intelValidation.query}"`
                    : "Scanning global outbreak data…"}
                </span>
                {scraperSourceCount > 0 && (
                  <span style={{
                    fontFamily: "monospace", fontSize: 8, fontWeight: 700,
                    color: "#30d158", background: "rgba(48,209,88,0.15)",
                    padding: "0 5px", borderRadius: 3, flexShrink: 0,
                  }}>
                    {scraperSourceCount} src
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action button */}
          <div style={{ padding: "0 10px 8px" }}>
            <button
              onClick={() => onGatherIntel({ mode: intelMode, query: queryText })}
              disabled={scraperRunning || (intelMode === "custom" && !queryText.trim())}
              style={{
                width: "100%", padding: "5px 0", borderRadius: 5,
                border: `1px solid ${scraperRunning ? "rgba(255,255,255,0.06)" : intelMode === "custom" ? "rgba(94,92,230,0.35)" : "rgba(48,209,88,0.35)"}`,
                cursor: (scraperRunning || (intelMode === "custom" && !queryText.trim())) ? "default" : "pointer",
                fontFamily: "monospace", fontSize: 9, fontWeight: 600,
                background: scraperRunning ? "rgba(255,255,255,0.03)" : intelMode === "custom" ? "rgba(94,92,230,0.12)" : "rgba(48,209,88,0.10)",
                color: scraperRunning ? "#48484a" : intelMode === "custom" ? "#5e5ce6" : "#30d158",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                opacity: (intelMode === "custom" && !queryText.trim() && !scraperRunning) ? 0.35 : 1,
                transition: "all 0.15s",
              }}
            >
              {scraperRunning ? (
                <>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
                  </svg>
                  Scraping…
                </>
              ) : intelMode === "custom" ? (
                <>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Search Intel
                </>
              ) : (
                <>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Gather Intel
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Protein discovery notification ── */}
      {hasSuggestions && dashboardMode === "live" && onOpenDiscoveryPanel && (
        <div
          className="protein-discovery-notification"
          onClick={onOpenDiscoveryPanel}
          style={{
            margin: "6px 16px",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid rgba(48,209,88,0.25)",
            background: "rgba(48,209,88,0.06)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 600, color: "#30d158", textTransform: "uppercase" }}>
              Proteins Discovered
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 8, color: "#48484a" }}>
              Click to review suggested targets
            </div>
          </div>
        </div>
      )}

      {/* ── Feed items ── */}
      <div className="threat-feed-container flex-1 overflow-y-auto">
        {/* Skeleton rows while gathering intel with empty scraper items */}
        {scraperRunning && items.filter((i) => i.fromScraper).length === 0 && (
          <>
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="flex gap-2.5 px-4 py-2 items-start">
                <div className="skeleton w-6 h-6 rounded-[5px] flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-1.5 pt-0.5">
                  <div className="skeleton h-2.5 rounded w-full" />
                  <div className="skeleton h-2 rounded w-2/3" />
                </div>
              </div>
            ))}
          </>
        )}
        {dashboardMode === "live" && items.length === 0 && !scraperRunning ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  scraperHealth === "connected"
                    ? "bg-[#30d158] animate-pulse"
                    : scraperHealth === "offline"
                    ? "bg-[#ff453a]"
                    : "bg-[#636366] animate-pulse"
                }`}
              />
              <span className="font-mono text-[10px] text-[#48484a]">
                {scraperHealth === "connected"
                  ? "Connected — waiting for data"
                  : scraperHealth === "offline"
                  ? "Scraper offline"
                  : "Connecting to APIs…"}
              </span>
            </div>
            <span className="font-mono text-[8px] text-[#2a2a2a] text-center">
              Threat feed populates from live scraper and Bio API.
              {scraperHealth === "offline" && " Check backend services."}
            </span>
          </div>
        ) : (
          items.map((item, i) => {
            const color = COLORS[item.sourceType] || "#86868b";
            const isStrainMatch = mentionsStrain(item.message, highlightedStrains);
            return (
              <div
                key={item._id || `${item.time}-${item.source || ""}-${i}`}
                className="flex gap-2.5 px-4 py-2 items-start hover:bg-[#161616] transition-colors cursor-default"
                style={{
                  ...(isStrainMatch ? { borderLeft: "4px solid #30d158", paddingLeft: 12, background: "rgba(48,209,88,0.03)" } : {}),
                  ...(item.revealDelay != null ? {
                    opacity: 0,
                    animation: `feedItemReveal 0.28s ease-out ${item.revealDelay}ms forwards`,
                  } : {}),
                }}
              >
                {/* Source icon */}
                <div
                  className="w-6 h-6 rounded-[5px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15`, color }}
                >
                  {Icons[item.sourceType] || "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-[#b0b0b5] leading-snug">
                    {isStrainMatch ? highlightMessage(item.message, highlightedStrains) : item.message}
                  </div>

                  <div className="flex items-center gap-2 mt-1 font-mono text-[9px] text-[#48484a]">
                    <span>{item.time}</span>
                    <span className="text-[#2a2a2a]">|</span>
                    <span style={{ color, opacity: 0.7 }}>{LABELS[item.sourceType]}</span>

                    {/* NEW badge for strain matches from scraper */}
                    {isStrainMatch && item.fromScraper && (
                      <span style={{
                        padding: "0 4px",
                        borderRadius: 3,
                        background: "rgba(48,209,88,0.15)",
                        color: "#30d158",
                        fontSize: 7,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}>
                        NEW
                      </span>
                    )}

                    {/* Confidence badge */}
                    {item.confidence != null && item.confidence < 100 && (
                      <span
                        className="ml-auto px-1.5 py-px rounded-full text-[8px] font-medium"
                        style={{
                          color: confidenceColor(item.confidence),
                          background: `${confidenceColor(item.confidence)}15`,
                        }}
                      >
                        {item.confidence}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
