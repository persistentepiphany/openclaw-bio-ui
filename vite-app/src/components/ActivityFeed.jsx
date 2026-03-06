/**
 * ActivityFeed.jsx — Left sidebar: system status, run button, threat feed.
 *
 * Props:
 *   items    – array of feed entries ({ sourceType, message, confidence, timestamp, time })
 *   status   – { status: string, confidence: number }
 *   running  – boolean, whether the pipeline is currently executing
 *   onRun    – callback fired when "Run Pipeline" is clicked
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
};

const LABELS = { twitter: "X / Twitter", rss: "RSS Feed", lab: "Lab", alert: "Alert", system: "System" };
const COLORS = { twitter: "#1d9bf0", rss: "#ff9f0a", lab: "#30d158", alert: "#ff453a", system: "#86868b" };

export default function ActivityFeed({ items, status, running, onRun }) {
  // Confidence badge colour thresholds (>80 green, 50-80 amber, <50 red)
  const confidenceColor = (c) => c > 80 ? "#30d158" : c >= 50 ? "#ff9f0a" : "#ff453a";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* ── Status indicator ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#141414]">
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

      {/* ── Run Pipeline button (with spinner while running) ── */}
      <button
        onClick={onRun}
        disabled={running}
        className={`mx-4 mt-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
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

      {/* ── Threat Feed header + refresh icon ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
          Threat Feed
        </span>
        <button
          className="text-[#48484a] hover:text-[#86868b] transition-colors p-0.5"
          title="Refresh feed"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>
      </div>

      {/* ── Feed items ── */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item, i) => {
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
        })}
      </div>
    </div>
  );
}
