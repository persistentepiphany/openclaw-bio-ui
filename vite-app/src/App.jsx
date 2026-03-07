/**
 * App.jsx — BioSentinel Dashboard
 *
 * Two-page layout: Dashboard (CSS Grid with drag-to-resize) and Intelligence Map.
 * Header with nav tabs persists across pages.
 * Includes Design Tools (JobPanel) integration.
 */

import { useState, useCallback, useRef, useEffect, Component } from "react";
import MoleculeViewer from "./components/MoleculeViewer";
import ActivityFeed from "./components/ActivityFeed";
import WorkflowStatus from "./components/WorkflowStatus";
import DataTable from "./components/DataTable";
import Heatmap from "./components/Heatmap";
import ChatInterface from "./components/ChatInterface";
import ViewerOverlay from "./components/ViewerOverlay";
import IntelligenceMapPage from "./components/intelligence/IntelligenceMapPage";
import PipelineConfigPanel from "./components/PipelineConfigPanel";
import JobPanel from "./components/jobs/JobPanel";
import OnboardingGuide from "./components/OnboardingGuide";
import ProteinDiscoveryPanel from "./components/ProteinDiscoveryPanel";
import useJobQueue from "./hooks/useJobQueue";
import useProteinDiscovery from "./hooks/useProteinDiscovery";
import {
  fetchThreatFeed,
  fetchCandidates,
  fetchHeatmap,
  fetchReport,
  refreshScraper,
  runPipeline,
  fetchPipelineStatus,
  checkScraperHealth,
  getScraperStatus,
  requestProteinBundle,
} from "./api/client";
import { toolCatalog } from "./data/mockDesignData";
import {
  feedItems as initialFeed,
  systemStatus as defaultStatus,
  candidates as initialCandidates,
  heatmapData,
  pipelineSteps,
  initialStep,
  proteinList,
  generateFreshData,
} from "./data/mockData";
import "./App.css";

/* ── Helper: initial state for each dashboard mode ── */
function getInitialState(mode) {
  if (mode === "live") {
    return {
      activities: [],
      tableData: [],
      heatData: { variants: [], items: [], matrix: [] },
      sysStatus: { status: "Connecting\u2026", confidence: 0 },
      currentStep: 0,
    };
  }
  // "demo" (default)
  return {
    activities: initialFeed,
    tableData: initialCandidates,
    heatData: heatmapData,
    sysStatus: defaultStatus,
    currentStep: initialStep,
  };
}

/* ── Error boundary for map and other crash-prone panels ── */
class PanelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(err, info) {
    console.warn(`[${this.props.name || "Panel"}] crashed:`, err.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", background: "#030305", flexDirection: "column", gap: 10,
        }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#ff453a" }}>
            {this.props.name || "Panel"} encountered an error
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a", maxWidth: 300, textAlign: "center" }}>
            {this.state.error?.message || "Unknown error"}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "5px 14px", borderRadius: 6, border: "1px solid #1c1c1c",
              background: "rgba(255,255,255,0.06)", color: "#86868b",
              fontFamily: "monospace", fontSize: 10, cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  /* ── Dashboard mode (demo / live) ── */
  const [dashboardMode, setDashboardMode] = useState(
    () => localStorage.getItem("biosentinel-dashboard-mode") || "demo"
  );
  const initState = getInitialState(dashboardMode);

  /* ── State ── */
  const [page, setPage] = useState("dashboard");
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentStep, setCurrentStep] = useState(initState.currentStep);
  const [selectedPdb, setSelectedPdb] = useState("1CRN");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState(initState.tableData);
  const [heatData, setHeatData] = useState(initState.heatData);
  const [activities, setActivities] = useState(initState.activities);
  const [showJobPanel, setShowJobPanel] = useState(false);
  const [viewerMode, setViewerMode] = useState(dashboardMode === "demo" ? "analysis" : null);
  const [apiLoading, setApiLoading] = useState(true);
  const [pipelineMode, setPipelineMode] = useState(dashboardMode === "live" ? "real" : "mock");
  const [sysStatus, setSysStatus] = useState(initState.sysStatus);
  const [scraperReport, setScraperReport] = useState(null);
  const [refreshingIntel, setRefreshingIntel] = useState(false);
  const [showPipelineConfig, setShowPipelineConfig] = useState(false);
  const [scraperHealth, setScraperHealth] = useState("checking");
  const [showDiscoveryPanel, setShowDiscoveryPanel] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  /* ── Protein discovery hook ── */
  const {
    selectedProteins,
    suggestedProteins,
    hasSuggestions,
    processReport: processReportForProteins,
    addProteins,
    removeProtein,
    fetchServerProteins,
    reset: resetProteinDiscovery,
  } = useProteinDiscovery();

  /* ── Effective protein list: demo uses mockData, live uses selected ── */
  const effectiveProteinList = dashboardMode === "demo"
    ? proteinList
    : selectedProteins.length > 0
      ? selectedProteins
      : [{ pdbId: "1CRN", label: "Crambin", desc: "Small plant protein" }];

  /* ── Convert scraper entries to activity feed items ── */
  const mapScraperEntries = useCallback((entries) =>
    entries.map((e) => ({
      sourceType: e.threat_detected && e.confidence > 70 ? "alert" : "rss",
      source: e.source_name || e.source || "Scraper",
      message: e.title,
      time: e.timestamp || "",
      confidence: e.confidence,
      url: e.url,
      location: e.location,
      topic: e.topic,
      fromScraper: true,
    })),
  []);

  /* ── Max feed items to prevent unbounded memory growth ── */
  const MAX_FEED_ITEMS = 200;

  /* ── Merge scraper items into activities (scraper first, then bio/mock) ── */
  const mergeScraperFeed = useCallback((scraperItems) => {
    setActivities((prev) => {
      const bioItems = prev.filter((item) => !item.fromScraper);
      return [...scraperItems, ...bioItems].slice(0, MAX_FEED_ITEMS);
    });
  }, []);

  /* ── Apply scraper report to all relevant state ── */
  const applyScraperReport = useCallback((report) => {
    setScraperReport(report);
    if (report.entries?.length > 0) {
      mergeScraperFeed(mapScraperEntries(report.entries));
    }
    if (report.summary) {
      setSysStatus((prev) => ({
        ...prev,
        confidence: report.summary.overall_confidence || prev.confidence,
        severity: report.summary.overall_severity,
        threatsDetected: report.summary.threats_detected,
        topPathogen: report.summary.top_pathogen,
        totalEntries: report.summary.total_entries,
      }));
    }
    // Extract protein suggestions from scraper report
    processReportForProteins(report);
  }, [mergeScraperFeed, mapScraperEntries, processReportForProteins]);

  /* ── Fetch all data from Bio API + Scraper ── */
  const refreshAllData = useCallback(async () => {
    const [feed, cands, hmap, report] = await Promise.all([
      fetchThreatFeed(),
      fetchCandidates(),
      fetchHeatmap(),
      fetchReport(),
    ]);
    // Also fetch server protein catalog in live mode
    fetchServerProteins();

    if (feed?.threats?.length > 0 || (Array.isArray(feed) && feed.length > 0)) {
      setActivities(Array.isArray(feed) ? feed : feed.threats);
    }
    if (cands?.length > 0) setTableData(cands);
    if (hmap?.matrix?.length > 0) {
      // Normalize API shape: API uses "candidates", component uses "items"
      setHeatData({
        variants: hmap.variants || [],
        items: hmap.items || hmap.candidates || [],
        matrix: hmap.matrix,
      });
    }
    if (report?.entries?.length > 0 || report?.summary) applyScraperReport(report);

    // In live mode, update system status based on what connected
    setDashboardMode((mode) => {
      if (mode === "live") {
        const bioOk = !!(feed || cands || hmap);
        const scraperOk = !!report;
        setSysStatus((prev) => ({
          ...prev,
          status: bioOk || scraperOk ? "Monitoring" : "Disconnected",
          ...((!bioOk && !scraperOk) ? { confidence: 0 } : {}),
        }));
      }
      return mode;
    });
  }, [applyScraperReport, fetchServerProteins]);

  /* ── Mode switch handler ── */
  const handleModeSwitch = useCallback((newMode) => {
    if (running) return;
    localStorage.setItem("biosentinel-dashboard-mode", newMode);
    setDashboardMode(newMode);

    const initial = getInitialState(newMode);
    setActivities(initial.activities);
    setTableData(initial.tableData);
    setHeatData(initial.heatData);
    setSysStatus(initial.sysStatus);
    setCurrentStep(initial.currentStep);
    setScraperReport(null);
    setViewerMode(newMode === "demo" ? "analysis" : null);
    setPipelineMode(newMode === "live" ? "real" : "mock");
    resetProteinDiscovery();
    setShowDiscoveryPanel(false);
    setShowOnboarding(false);

    if (newMode === "live") refreshAllData();
  }, [running, refreshAllData, resetProteinDiscovery]);

  /* ── Initial data load (live mode fetches from API, demo uses mock) ── */
  useEffect(() => {
    (async () => {
      if (dashboardMode === "live") {
        await refreshAllData();
      }
      setApiLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Periodic scraper refresh (60s, live mode only) ── */
  useEffect(() => {
    if (dashboardMode !== "live") return;
    const interval = setInterval(async () => {
      const report = await fetchReport();
      if (report) applyScraperReport(report);
    }, 60000);
    return () => clearInterval(interval);
  }, [applyScraperReport, dashboardMode]);

  /* ── Scraper health check (every 60s) ── */
  useEffect(() => {
    checkScraperHealth().then((ok) => setScraperHealth(ok ? "connected" : "offline"));
    const interval = setInterval(async () => {
      const ok = await checkScraperHealth();
      setScraperHealth(ok ? "connected" : "offline");
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ── Manual refresh intel (triggers scraper pipeline with progressive polling) ── */
  const handleRefreshIntel = useCallback(async () => {
    setRefreshingIntel(true);
    await refreshScraper();
    // Progressive polling: fetch at 2s, 4s, 7s after trigger
    const intervals = [2000, 2000, 3000]; // cumulative: 2s, 4s, 7s
    for (const wait of intervals) {
      await new Promise((r) => setTimeout(r, wait));
      const report = await fetchReport();
      if (report) applyScraperReport(report);
    }
    setRefreshingIntel(false);
  }, [applyScraperReport]);

  /* ── Auto-open discovery panel once when first suggestions arrive ── */
  const discoveryAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (dashboardMode === "live" && hasSuggestions && selectedProteins.length === 0 && !discoveryAutoOpenedRef.current) {
      discoveryAutoOpenedRef.current = true;
      setShowDiscoveryPanel(true);
    }
  }, [hasSuggestions, selectedProteins.length, dashboardMode]);

  // Reset auto-open flag on mode switch
  useEffect(() => {
    discoveryAutoOpenedRef.current = false;
  }, [dashboardMode]);

  /* ── Resizable panel sizes (px) ── */
  const [leftW, setLeftW] = useState(248);
  const [rightW, setRightW] = useState(280);
  const [chatH, setChatH] = useState(168);
  const [dragging, setDragging] = useState(null);

  const runTimers = useRef([]);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      runTimers.current.forEach(clearTimeout);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  /* ── Job queue with activity feed integration ── */
  const { jobs, submitJob } = useJobQueue({
    dashboardMode,
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
      ].slice(0, MAX_FEED_ITEMS));
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

  /* ── Helper: timestamp for activity feed items ── */
  const nowTimestamp = () => new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  /* ── Mock pipeline fallback (setTimeout chain) ── */
  const runMockPipeline = useCallback(() => {
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
                time: nowTimestamp(),
              },
              ...prev,
            ].slice(0, MAX_FEED_ITEMS));

            refreshAllData();
          }, 500);
          runTimers.current.push(finishTimer);
        }
      }, stepDelay * i);
      runTimers.current.push(t);
    }
  }, [refreshAllData]);

  /* ── Poll real pipeline job status ── */
  const pollPipelineStatus = useCallback((jobId) => {
    // Map API step names to WorkflowStatus indices
    const stepMap = { detect: 1, characterize: 2, design: 3, validate: 4, report: 5 };
    const totalSteps = pipelineSteps.length;
    let lostContactCount = 0;

    pollIntervalRef.current = setInterval(async () => {
      const status = await fetchPipelineStatus(jobId);

      if (!status) {
        lostContactCount++;
        // Allow a few missed polls before giving up
        if (lostContactCount >= 3) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setLoading(false);
          setRunning(false);
          setActivities((prev) => [
            {
              sourceType: "alert",
              message: `Lost contact with pipeline — job ${jobId} (API unreachable)`,
              confidence: 100,
              timestamp: "just now",
              time: nowTimestamp(),
            },
            ...prev,
          ].slice(0, MAX_FEED_ITEMS));
        }
        return;
      }

      lostContactCount = 0;

      // Update step indicator from API response
      if (status.current_step && stepMap[status.current_step]) {
        setCurrentStep(stepMap[status.current_step]);
      } else if (typeof status.progress === "number") {
        setCurrentStep(Math.min(Math.round(status.progress * totalSteps), totalSteps));
      }

      if (status.status === "complete" || status.status === "completed") {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;

        setCurrentStep(totalSteps);
        await refreshAllData();
        setLoading(false);
        setRunning(false);

        setActivities((prev) => [
          {
            sourceType: "system",
            message: `Pipeline complete — job ${jobId}`,
            confidence: 100,
            timestamp: "just now",
            time: nowTimestamp(),
          },
          ...prev,
        ].slice(0, MAX_FEED_ITEMS));
      }

      if (status.status === "failed" || status.status === "cancelled") {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;

        setLoading(false);
        setRunning(false);

        setActivities((prev) => [
          {
            sourceType: "alert",
            message: `Pipeline ${status.status} — job ${jobId}${status.error ? ": " + status.error : ""}`,
            confidence: 100,
            timestamp: "just now",
            time: nowTimestamp(),
          },
          ...prev,
        ].slice(0, MAX_FEED_ITEMS));
      }
    }, 2000);
  }, [refreshAllData]);

  /* ── Pipeline trigger ── */
  const handleRun = useCallback(async (config = {}) => {
    if (running) return;

    runTimers.current.forEach(clearTimeout);
    runTimers.current = [];
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    const effectiveMode = config.mode || pipelineMode;
    if (config.mode) setPipelineMode(config.mode);

    setRunning(true);
    setLoading(true);
    setCurrentStep(0);
    setSelectedItem(null);

    // Mock mode — use local simulation
    if (effectiveMode === "mock") {
      runMockPipeline();
      return;
    }

    // Real mode — request protein bundle, then submit pipeline via API
    if (config.targetPdb) {
      try {
        const bundleResult = await requestProteinBundle(config.targetPdb, {
          run_sasa: config.tasks?.includes("sasa") ?? true,
          run_quality: true,
        });
        if (bundleResult) {
          setActivities((prev) => [
            {
              sourceType: "system",
              message: `Protein bundle ready for ${config.targetPdb}${bundleResult.sequences ? ` — ${bundleResult.sequences.length} sequences extracted` : ""}`,
              confidence: 100,
              timestamp: "just now",
              time: nowTimestamp(),
            },
            ...prev,
          ].slice(0, MAX_FEED_ITEMS));
        }
      } catch (err) {
        console.warn("Protein bundle request failed (non-blocking):", err.message);
      }
    }

    try {
      const result = await runPipeline({
        mode: effectiveMode,
        target_pdb: config.targetPdb || undefined,
        num_candidates: config.numCandidates || 1,
        tasks: config.tasks || undefined,
        run_epitope: config.runEpitope ?? true,
        run_generation: config.runGeneration ?? true,
        run_validation: config.runValidation ?? true,
        run_biosecurity: config.runBiosecurity ?? true,
      });

      if (!result || !result.job_id) {
        setLoading(false);
        setRunning(false);
        setActivities((prev) => [
          {
            sourceType: "alert",
            message: "Pipeline API returned no job ID — check backend connection",
            confidence: 100,
            timestamp: "just now",
            time: nowTimestamp(),
          },
          ...prev,
        ].slice(0, MAX_FEED_ITEMS));
        return;
      }

      setActivities((prev) => [
        {
          sourceType: "system",
          message: `Pipeline submitted — job ${result.job_id} (${effectiveMode}${config.targetPdb ? `, target: ${config.targetPdb}` : ""})`,
          confidence: 100,
          timestamp: "just now",
          time: nowTimestamp(),
        },
        ...prev,
      ].slice(0, MAX_FEED_ITEMS));

      pollPipelineStatus(result.job_id);
    } catch (err) {
      setLoading(false);
      setRunning(false);
      setActivities((prev) => [
        {
          sourceType: "alert",
          message: `Pipeline submission failed — ${err.message || "API unreachable"}`,
          confidence: 100,
          timestamp: "just now",
          time: nowTimestamp(),
        },
        ...prev,
      ].slice(0, MAX_FEED_ITEMS));
    }
  }, [running, pipelineMode, runMockPipeline, pollPipelineStatus]);

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
          {apiLoading && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a] animate-pulse" title="Fetching live data..." />
          )}

          {/* Demo / Live toggle */}
          <div
            className="flex items-center rounded-full border border-[#1c1c1c] overflow-hidden"
            style={{ opacity: running ? 0.4 : 1, pointerEvents: running ? "none" : "auto" }}
            title={running ? "Cannot switch while pipeline is running" : "Switch dashboard mode"}
          >
            {["demo", "live"].map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeSwitch(mode)}
                disabled={running}
                className="border-none cursor-pointer transition-all"
                style={{
                  padding: "2px 8px",
                  fontFamily: "monospace",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  background: dashboardMode === mode
                    ? mode === "live" ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.06)"
                    : "transparent",
                  color: dashboardMode === mode
                    ? mode === "live" ? "#30d158" : "#86868b"
                    : "#3a3a3c",
                }}
              >
                {mode}
              </button>
            ))}
          </div>
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
          <span
            title={`Scraper: ${scraperHealth}`}
            className="w-[5px] h-[5px] rounded-full"
            style={{
              background: scraperHealth === "connected" ? "#30d158"
                : scraperHealth === "offline" ? "#ff453a" : "#636366",
              boxShadow: scraperHealth === "connected"
                ? "0 0 6px rgba(48,209,88,0.25)"
                : scraperHealth === "offline"
                  ? "0 0 6px rgba(255,69,58,0.25)" : "none",
            }}
          />
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
          <PanelErrorBoundary name="Intelligence Map">
            <IntelligenceMapPage scraperReport={scraperReport} dashboardMode={dashboardMode} />
          </PanelErrorBoundary>
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
              status={sysStatus}
              running={running}
              onRun={handleRun}
              pipelineMode={pipelineMode}
              onTogglePipelineMode={() => setPipelineMode((m) => m === "mock" ? "real" : "mock")}
              onOpenJobPanel={() => setShowJobPanel(true)}
              onOpenPipelineConfig={() => setShowPipelineConfig(true)}
              refreshingIntel={refreshingIntel}
              onRefreshIntel={handleRefreshIntel}
              dashboardMode={dashboardMode}
              scraperHealth={scraperHealth}
              hasSuggestions={hasSuggestions}
              onOpenDiscoveryPanel={() => setShowDiscoveryPanel(true)}
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
              <MoleculeViewer pdbId={viewerPdb} externalMode={viewerMode} onModeChange={() => setViewerMode(null)} candidates={tableData} />

              {/* Protein selector + Discovery trigger */}
              <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
                {dashboardMode === "live" && (
                  <button
                    className="protein-discovery-trigger"
                    onClick={() => setShowDiscoveryPanel(true)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: hasSuggestions ? "1px solid rgba(48,209,88,0.3)" : "1px solid rgba(255,255,255,0.06)",
                      background: hasSuggestions ? "rgba(48,209,88,0.1)" : "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(12px)",
                      color: hasSuggestions ? "#30d158" : "#86868b",
                      fontFamily: "monospace",
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      transition: "all 0.2s",
                    }}
                    title="Discover proteins from threat analysis"
                  >
                    {hasSuggestions && (
                      <span className="discovery-dot-pulse" style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#30d158",
                        display: "inline-block",
                      }} />
                    )}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Discover
                  </button>
                )}
                <select
                  value={selectedPdb}
                  onChange={(e) => {
                    setSelectedPdb(e.target.value);
                    setViewerMode(null);
                  }}
                  className="bg-[rgba(0,0,0,0.6)] backdrop-blur-lg border border-[rgba(255,255,255,0.06)]
                    rounded-lg px-2.5 py-1.5 font-mono text-[10.5px] text-[#86868b] cursor-pointer outline-none"
                  style={{ WebkitAppearance: "none" }}
                >
                  {effectiveProteinList.map((p) => (
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
            className="data-table-container flex flex-col overflow-hidden bg-[#0a0a0a]"
            style={{ gridRow: 1, gridColumn: 5 }}
          >
            <DataTable
              items={tableData}
              selectedId={selectedItem}
              onSelect={setSelectedItem}
              loading={loading}
              dashboardMode={dashboardMode}
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
            <ChatInterface
              candidates={tableData}
              feedItems={activities}
              heatmapData={heatData}
              pipelineRunning={running}
              onRunPipeline={handleRun}
              onRefreshData={refreshAllData}
              onApplyScraperReport={applyScraperReport}
              proteinList={effectiveProteinList}
              dashboardMode={dashboardMode}
            />
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

      {/* ═══ Pipeline Config Modal ═══ */}
      {showPipelineConfig && (
        <PipelineConfigPanel
          proteinList={effectiveProteinList}
          selectedPdb={selectedPdb}
          running={running}
          pipelineMode={pipelineMode}
          currentStep={currentStep}
          totalSteps={pipelineSteps.length}
          onRun={handleRun}
          onClose={() => setShowPipelineConfig(false)}
        />
      )}

      {/* ═══ Protein Discovery Panel ═══ */}
      {showDiscoveryPanel && (
        <ProteinDiscoveryPanel
          suggestedProteins={suggestedProteins}
          selectedProteins={selectedProteins}
          onAdd={(proteins) => {
            addProteins(proteins);
            setShowDiscoveryPanel(false);
            // Launch onboarding after first protein selection
            if (OnboardingGuide.shouldShow()) {
              setTimeout(() => setShowOnboarding(true), 400);
            }
          }}
          onClose={() => setShowDiscoveryPanel(false)}
        />
      )}

      {/* ═══ Onboarding Guide (live mode first visit) ═══ */}
      {showOnboarding && dashboardMode === "live" && (
        <OnboardingGuide onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
