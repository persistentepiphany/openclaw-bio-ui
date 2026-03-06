/**
 * JobPanel.jsx — Modal overlay for design tool job management
 *
 * Tab bar: Tools / Configure / Queue. Glass backdrop. Close button.
 *
 * Props:
 *   tools        — toolCatalog array
 *   jobs         — jobs array from useJobQueue
 *   onSubmitJob  — (toolId, config) => void
 *   onViewResult — (job) => void
 *   onClose      — () => void
 */

import { useState } from "react";
import ToolSelector from "./ToolSelector";
import JobConfigForm from "./JobConfigForm";
import JobQueue from "./JobQueue";

const TABS = [
  { key: "tools", label: "Tools" },
  { key: "configure", label: "Configure" },
  { key: "queue", label: "Queue" },
];

export default function JobPanel({ tools, jobs, onSubmitJob, onViewResult, onClose }) {
  const [tab, setTab] = useState("tools");
  const [selectedTool, setSelectedTool] = useState(null);

  const handleSelectTool = (toolId) => {
    setSelectedTool(toolId);
    setTab("configure");
  };

  const handleSubmit = (config) => {
    onSubmitJob?.(selectedTool, config);
    setTab("queue");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: 420,
          maxHeight: "80vh",
          background: "rgba(10,10,14,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🧪</span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                fontWeight: 600,
                color: "#f5f5f7",
              }}
            >
              Design Tools
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              color: "#86868b",
              width: 24,
              height: 24,
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(255,69,58,0.15)";
              e.target.style.color = "#ff453a";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "rgba(255,255,255,0.06)";
              e.target.style.color = "#86868b";
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: "12px 18px 0",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "5px 14px",
                borderRadius: 5,
                border: "none",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 9,
                fontWeight: 500,
                background:
                  tab === t.key ? "rgba(94,92,230,0.15)" : "transparent",
                color: tab === t.key ? "#5e5ce6" : "#48484a",
                transition: "all 0.15s",
              }}
            >
              {t.label}
              {t.key === "queue" && jobs.length > 0 && (
                <span
                  style={{
                    marginLeft: 4,
                    padding: "1px 5px",
                    borderRadius: 8,
                    background: "rgba(94,92,230,0.2)",
                    fontSize: 8,
                    color: "#5e5ce6",
                  }}
                >
                  {jobs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.06)",
            margin: "8px 18px 0",
          }}
        />

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 18px 18px",
          }}
        >
          {tab === "tools" && (
            <ToolSelector
              tools={tools}
              onSelect={handleSelectTool}
              selectedId={selectedTool}
            />
          )}
          {tab === "configure" && (
            <JobConfigForm toolId={selectedTool} onSubmit={handleSubmit} />
          )}
          {tab === "queue" && (
            <JobQueue jobs={jobs} onViewResult={onViewResult} />
          )}
        </div>
      </div>
    </div>
  );
}
