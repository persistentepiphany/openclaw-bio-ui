/**
 * App.jsx — BioSentinel Dashboard
 *
 * Two-page layout: Dashboard (CSS Grid with drag-to-resize) and Intelligence Map.
 * Header with nav tabs persists across pages.
 * Includes Design Tools (JobPanel) integration.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import MoleculeViewer from "./components/MoleculeViewer";
import ActivityFeed from "./components/ActivityFeed";
import WorkflowStatus from "./components/WorkflowStatus";
import DataTable from "./components/DataTable";
import Heatmap from "./components/Heatmap";
import ChatInterface from "./components/ChatInterface";
import ViewerOverlay from "./components/ViewerOverlay";
import IntelligenceMapPage from "./components/intelligence/IntelligenceMapPage";
import JobPanel from "./components/jobs/JobPanel";
import useJobQueue from "./hooks/useJobQueue";
import { toolCatalog } from "./data/mockDesignData";
import {
  feedItems as initialFeed,
  systemStatus,
  candidates as initialCandidates,
  heatmapData,
  pipelineSteps,
  initialStep,
  proteinList,
  generateFreshData,
} from "./data/mockData";
import "./App.css";

export default function App() {
  /* ── State ── */
  const [page, setPage] = useState("dashboard");
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedPdb, setSelectedPdb] = useState("1CRN");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState(initialCandidates);
  const [heatData, setHeatData] = useState(heatmapData);
  const [activities, setActivities] = useState(initialFeed);
  const [showJobPanel, setShowJobPanel] = useState(false);
  const [viewerMode, setViewerMode] = useState(null);

  /* ── Resizable panel sizes (px) ── */
  const [leftW, setLeftW] = useState(248);
  const [rightW, setRightW] = useState(280);
  const [chatH, setChatH] = useState(168);
  const [dragging, setDragging] = useState(null);

  const runTimers = useRef([]);

  useEffect(() => {
    return () => runTimers.current.forEach(clearTimeout);
  }, []);

  /* ── Job queue with activity feed integration ── */
  const { jobs, submitJob } = useJobQueue({
    onJobComplete: (result) => {
      const toolName = toolCatalog.find((t) => t.id === result.tool)?.name || result.tool;
      setActivities((prev) => [
        {
          sourceType: "job",
          message: `${toolName} job completed — results ready for ${result.resultPdb}`,
          confidence: 100,
          timestamp: "just now",
          time: new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        ...prev,
      ]);
    },
  });

  /* ── View job result: close modal, switch PDB + viewer mode ── */
  const handleViewResult = useCallback((job) => {
    setShowJobPanel(false);
    if (job.resultPdb) setSelectedPdb(job.resultPdb);
    if (job.resultMode) setViewerMode(job.resultMode);
  }, []);

  /* ── Drag-to-resize ── */
  const onDragStart = (type) => (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startVal =
      type === "left" ? leftW : type === "right" ? rightW : chatH;

    setDragging(type);
    document.body.style.userSelect = "none";

    const onMove = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;

      if (type === "left")
        setLeftW(Math.max(180, Math.min(400, startVal + dx)));
      else if (type === "right")
        setRightW(Math.max(200, Math.min(450, startVal - dx)));
      else setChatH(Math.max(100, Math.min(400, startVal - dy)));

      window.dispatchEvent(new Event("resize"));
    };

    const onUp = () => {
      setDragging(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  /* ── Pipeline animation ── */
  const handleRun = useCallback(() => {
    if (running) return;

    runTimers.current.forEach(clearTimeout);
    runTimers.current = [];

    setRunning(true);
    setLoading(true);
    setCurrentStep(0);
    setSelectedItem(null);

    const stepDelay = 700;
    const totalSteps = pipelineSteps.length;

    for (let i = 1; i <= totalSteps; i++) {
      const t = setTimeout(() => {
        setCurrentStep(i);

        if (i === totalSteps) {
          const finishTimer = setTimeout(() => {
            const fresh = generateFreshData();
            setTableData(fresh.candidates);
            setHeatData(fresh.heatmap);
            setLoading(false);
            setRunning(false);

            setActivities((prev) => [
              {
                sourceType: "system",
                message: `Pipeline completed — ${fresh.candidates.length} candidates scored`,
                confidence: 100,
                timestamp: "just now",
                time: new Date().toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
              ...prev,
            ]);
          }, 500);
          runTimers.current.push(finishTimer);
        }
      }, stepDelay * i);
      runTimers.current.push(t);
    }
  }, [running]);

  const selectedCandidate = tableData.find((d) => d.id === selectedItem);
  const viewerPdb = selectedCandidate?.pdb || selectedPdb;

  /* ── Layout ── */
  return (
    <div
      className="w-screen h-screen bg-black overflow-hidden flex flex-col"
      style={{
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ═══ Header ═══ */}
      <div className="bg-[#0a0a0a] flex items-center justify-between px-5 border-b border-[#141414] flex-shrink-0 h-[44px]">
        <div className="flex items-center gap-2.5">
          <div className="w-[22px] h-[22px] rounded-[5px] bg-[#30d158] flex items-center justify-center text-[11px] font-semibold text-black">
            B
          </div>
          <span className="text-[13px] font-medium text-[#f5f5f7]">
            BioSentinel
          </span>
          <span className="font-mono text-[10px] text-[#48484a]">v2.4</span>
        </div>

        {/* Nav tabs */}
        <div className="flex items-center gap-0.5 bg-[rgba(255,255,255,0.03)] rounded-lg p-0.5">
          {[
            { key: "dashboard", label: "Dashboard" },
            { key: "intelligence", label: "Intelligence Map" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPage(tab.key)}
              className={`px-3 py-1 rounded-md text-[10px] font-mono font-medium transition-all border-none cursor-pointer ${
                page === tab.key
                  ? "bg-[rgba(48,209,88,0.15)] text-[#30d158]"
                  : "bg-transparent text-[#48484a] hover:text-[#86868b]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3.5">
          {/* Design Tools button */}
          <button
            onClick={() => setShowJobPanel(true)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid rgba(94,92,230,0.3)",
              background: "rgba(94,92,230,0.1)",
              color: "#5e5ce6",
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(94,92,230,0.2)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(94,92,230,0.1)")}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3h6M10 3v7l-5 9h14l-5-9V3"/>
            </svg>
            Design Tools
          </button>

          {running && (
            <span className="font-mono text-[9px] text-[#ff9f0a] animate-pulse-glow">
              PIPELINE ACTIVE
            </span>
          )}
          <span className="w-[5px] h-[5px] rounded-full bg-[#30d158] shadow-[0_0_6px_rgba(48,209,88,0.25)]" />
          <span className="font-mono text-[10px] text-[#48484a]">
            {new Date().toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* ═══ Page Content ═══ */}
      {page === "intelligence" ? (
        <div className="flex-1 overflow-hidden">
          <IntelligenceMapPage />
        </div>
      ) : (
        <div
          className="flex-1 overflow-hidden"
          style={{
            display: "grid",
            gridTemplateColumns: `${leftW}px 5px 1fr 5px ${rightW}px`,
            gridTemplateRows: `1fr 5px ${chatH}px`,
          }}
        >
          {/* ═══ Left sidebar ═══ */}
          <div
            className="overflow-hidden"
            style={{ gridRow: 1, gridColumn: 1 }}
          >
            <ActivityFeed
              items={activities}
              status={systemStatus}
              running={running}
              onRun={handleRun}
              onOpenJobPanel={() => setShowJobPanel(true)}
            />
          </div>

          {/* ─── Left resize handle ─── */}
          <div
            className={`drag-handle drag-handle-h${dragging === "left" ? " active" : ""}`}
            style={{ gridRow: 1, gridColumn: 2 }}
            onMouseDown={onDragStart("left")}
          >
            <div className="drag-line" />
          </div>

          {/* ═══ Centre: Viewer + Workflow ═══ */}
          <div
            className="flex flex-col overflow-hidden relative"
            style={{ gridRow: 1, gridColumn: 3, background: "#030305" }}
          >
            {/* Pipeline progress bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] z-30 bg-[#1c1c1c] overflow-hidden">
              <div
                className="h-full bg-[#30d158] transition-all duration-700 ease-out"
                style={{
                  width: `${(currentStep / pipelineSteps.length) * 100}%`,
                  opacity: currentStep > 0 ? 1 : 0,
                }}
              />
            </div>

            <div className="flex-1 relative">
              <MoleculeViewer pdbId={viewerPdb} externalMode={viewerMode} />

              {/* Protein selector */}
              <div className="absolute top-2.5 right-2.5 z-20">
                <select
                  value={selectedPdb}
                  onChange={(e) => {
                    setSelectedPdb(e.target.value);
                    setViewerMode(null); // Reset external mode on PDB change
                  }}
                  className="bg-[rgba(0,0,0,0.6)] backdrop-blur-lg border border-[rgba(255,255,255,0.06)]
                    rounded-lg px-2.5 py-1.5 font-mono text-[10.5px] text-[#86868b] cursor-pointer outline-none"
                  style={{ WebkitAppearance: "none" }}
                >
                  {proteinList.map((p) => (
                    <option
                      key={p.pdbId}
                      value={p.pdbId}
                      style={{ background: "#111" }}
                    >
                      {p.label} ({p.pdbId})
                    </option>
                  ))}
                </select>
              </div>

              <ViewerOverlay candidate={selectedCandidate} />
            </div>

            <WorkflowStatus
              steps={pipelineSteps}
              currentStep={currentStep}
              running={running}
            />
          </div>

          {/* ─── Right resize handle ─── */}
          <div
            className={`drag-handle drag-handle-h${dragging === "right" ? " active" : ""}`}
            style={{ gridRow: 1, gridColumn: 4 }}
            onMouseDown={onDragStart("right")}
          >
            <div className="drag-line" />
          </div>

          {/* ═══ Right sidebar ═══ */}
          <div
            className="flex flex-col overflow-hidden bg-[#0a0a0a]"
            style={{ gridRow: 1, gridColumn: 5 }}
          >
            <DataTable
              items={tableData}
              selectedId={selectedItem}
              onSelect={setSelectedItem}
              loading={loading}
            />
            <Heatmap data={heatData} loading={loading} />
          </div>

          {/* ─── Bottom resize handle ─── */}
          <div
            className={`drag-handle drag-handle-v${dragging === "chat" ? " active" : ""}`}
            style={{ gridRow: 2, gridColumn: "1 / -1" }}
            onMouseDown={onDragStart("chat")}
          >
            <div className="drag-line" />
          </div>

          {/* ═══ Chat ═══ */}
          <div style={{ gridRow: 3, gridColumn: "1 / -1" }}>
            <ChatInterface candidates={tableData} feedItems={activities} />
          </div>
        </div>
      )}

      {/* ═══ Job Panel Modal ═══ */}
      {showJobPanel && (
        <JobPanel
          tools={toolCatalog}
          jobs={jobs}
          onSubmitJob={submitJob}
          onViewResult={handleViewResult}
          onClose={() => setShowJobPanel(false)}
        />
      )}
    </div>
  );
}
