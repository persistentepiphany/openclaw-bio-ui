/**
 * ActivityFeed.jsx — Left sidebar: system status, run button, threat feed.
 *
 * Props:
 *   items                  – array of feed entries ({ sourceType, message, confidence, timestamp, time })
 *   status                 – { status: string, confidence: number }
 *   running                – boolean, whether the pipeline is currently executing
 *   onRun                  – callback fired when "Run Pipeline" is clicked
 *   pipelineMode           – "mock" | "real"
 *   onTogglePipelineMode   – callback to toggle between mock and real pipeline
 *   onOpenJobPanel         – callback to open the Design Tools panel
 *   refreshingIntel        – boolean, whether intel refresh is in progress
 *   onRefreshIntel         – callback to trigger scraper pipeline refresh
 */

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

export default function ActivityFeed({ items, status, running, onRun, pipelineMode, onTogglePipelineMode, onOpenJobPanel, onOpenPipelineConfig, refreshingIntel, onRefreshIntel, dashboardMode, scraperHealth }) {
  // Confidence badge colour thresholds (>80 green, 50-80 amber, <50 red)
  const confidenceColor = (c) => c > 80 ? "#30d158" : c >= 50 ? "#ff9f0a" : "#ff453a";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
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
        {/* Scraper summary line */}
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
            className="w-[30px] h-[30px] rounded-lg border border-[#1c1c1c] bg-[rgba(255,255,255,0.04)] flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-all disabled:opacity-40 disabled:cursor-default"
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

      {/* ── Threat Feed header + New Job button + refresh icon ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
          Threat Feed
        </span>
        <div className="flex items-center gap-2">
          {/* New Job button */}
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
          <button
            onClick={onRefreshIntel}
            disabled={refreshingIntel}
            className={`text-[#48484a] hover:text-[#86868b] transition-colors p-0.5 border-none bg-transparent cursor-pointer disabled:cursor-default disabled:opacity-40 ${refreshingIntel ? "animate-spin" : ""}`}
            title={refreshingIntel ? "Refreshing intel…" : "Refresh intel"}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Feed items ── */}
      <div className="flex-1 overflow-y-auto">
        {dashboardMode === "live" && items.length === 0 ? (
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
            return (
              <div
                key={`${item.time}-${i}`}
                className={`flex gap-2.5 px-4 py-2 items-start hover:bg-[#161616] transition-colors cursor-default
                  ${i === 0 ? "animate-fadeIn" : ""}`}
              >
                {/* Source icon */}
                <div
                  className="w-6 h-6 rounded-[5px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15`, color }}
                >
                  {Icons[item.sourceType] || "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-[#b0b0b5] leading-snug">{item.message}</div>

                  <div className="flex items-center gap-2 mt-1 font-mono text-[9px] text-[#48484a]">
                    <span>{item.time}</span>
                    <span className="text-[#2a2a2a]">|</span>
                    <span style={{ color, opacity: 0.7 }}>{LABELS[item.sourceType]}</span>

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
