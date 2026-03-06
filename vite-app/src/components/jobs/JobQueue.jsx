/**
 * JobQueue.jsx — List of submitted jobs with status, progress, and results
 *
 * Props:
 *   jobs         — array of job objects from useJobQueue
 *   onViewResult — (job) => void, called when "View Result" clicked
 */

import { toolCatalog } from "../../data/mockDesignData";
import { downloadJSON } from "../../utils/download";

const STATUS_CONFIG = {
  queued: { label: "Queued", color: "#86868b", bg: "rgba(134,134,139,0.1)" },
  running: { label: "Running", color: "#ff9f0a", bg: "rgba(255,159,10,0.1)" },
  complete: { label: "Complete", color: "#30d158", bg: "rgba(48,209,88,0.1)" },
  failed: { label: "Failed", color: "#ff453a", bg: "rgba(255,69,58,0.1)" },
};

function formatElapsed(ms) {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export default function JobQueue({ jobs, onViewResult }) {
  if (!jobs || jobs.length === 0) {
    return (
      <div
        style={{
          padding: "40px 0",
          textAlign: "center",
          fontFamily: "monospace",
          fontSize: 10,
          color: "#48484a",
        }}
      >
        No jobs submitted yet
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 9,
          color: "#48484a",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 4,
        }}
      >
        Job Queue ({jobs.length})
      </div>

      {jobs.map((job) => {
        const tool = toolCatalog.find((t) => t.id === job.tool);
        const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
        const elapsed = job.completedAt
          ? job.completedAt - job.startedAt
          : Date.now() - job.startedAt;

        return (
          <div
            key={job.id}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Top row: tool name + status chip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>{tool?.icon || "?"}</span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#e5e5ea",
                  }}
                >
                  {tool?.name || job.tool}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  fontWeight: 600,
                  color: status.color,
                  background: status.bg,
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {status.label}
              </span>
            </div>

            {/* Progress bar (running/queued) */}
            {(job.status === "running" || job.status === "queued") && (
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.06)",
                  marginBottom: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${job.progress}%`,
                    background: tool?.accentColor || "#5e5ce6",
                    transition: "width 0.3s",
                    borderRadius: 2,
                  }}
                />
              </div>
            )}

            {/* Bottom row: elapsed time + actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: "#48484a",
                }}
              >
                {formatElapsed(elapsed)}
                {job.status === "running" && ` · ${job.progress}%`}
              </span>

              {job.status === "complete" && (
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => onViewResult?.(job)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 4,
                      border: `1px solid ${tool?.accentColor || "#5e5ce6"}40`,
                      background: `${tool?.accentColor || "#5e5ce6"}15`,
                      color: tool?.accentColor || "#5e5ce6",
                      fontFamily: "monospace",
                      fontSize: 8,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = 0.8)}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = 1)}
                  >
                    View Result
                  </button>
                  <button
                    onClick={() => downloadJSON(`${job.id}_${job.tool}_result.json`, {
                      jobId: job.id,
                      tool: tool?.name || job.tool,
                      config: job.config,
                      status: job.status,
                      resultPdb: job.resultPdb,
                      resultMode: job.resultMode,
                      elapsed: formatElapsed(job.completedAt - job.startedAt),
                      completedAt: new Date(job.completedAt).toISOString(),
                    })}
                    title="Download job results"
                    style={{
                      padding: "3px 6px",
                      borderRadius: 4,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#86868b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      transition: "all 0.15s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.color = "#e5e5ea";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = "#86868b";
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                  </button>
                </div>
              )}

              {job.status === "failed" && job.error && (
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    color: "#ff453a",
                  }}
                >
                  {job.error}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
