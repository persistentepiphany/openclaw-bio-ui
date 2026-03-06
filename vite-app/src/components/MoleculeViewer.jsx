/**
 * MoleculeViewer.jsx — Stable 3Dmol.js protein structure viewer
 *
 * Key design decisions for stability:
 *   1. The 3Dmol viewer is created ONCE and stored in a ref — never destroyed.
 *   2. The container div uses a ref and is never recreated by React.
 *   3. When pdbId changes, only the model is swapped (removeAllModels + addModel).
 *   4. A ResizeObserver + window resize listener handle panel resizing.
 *   5. A loading overlay is shown during PDB fetches.
 *
 * Props:
 *   pdbId        — PDB code string (e.g., "1CRN", "6VMZ")
 *   externalMode — optional mode override from parent (e.g., from job results)
 */

import { useEffect, useRef, useState, useMemo } from "react";
import "jquery";
import * as $3Dmol from "3dmol";
import AnalysisPanel from "./AnalysisPanel";
import PlddtOverlay from "./viewer/PlddtOverlay";
import PaePanel from "./viewer/PaePanel";
import TrajectoryPlayer from "./viewer/TrajectoryPlayer";
import SequencePanel from "./viewer/SequencePanel";
import {
  generateMockPlddt,
  generateMockPae,
  generateMockTrajectory,
  generateMockSequenceDesign,
} from "../data/mockDesignData";

/* ── PDB metadata for info chips ── */
const PDB_INFO = {
  "1CRN": { label: "Crambin", residues: 46, chains: 1, mw: "4.7 kDa", organism: "Crambe hispanica" },
  "4HHB": { label: "Hemoglobin", residues: 574, chains: 4, mw: "64.5 kDa", organism: "Homo sapiens" },
  "1LYZ": { label: "Lysozyme", residues: 129, chains: 1, mw: "14.3 kDa", organism: "Gallus gallus" },
  "1EMA": { label: "GFP", residues: 238, chains: 1, mw: "26.9 kDa", organism: "Aequorea victoria" },
  "4INS": { label: "Insulin", residues: 51, chains: 2, mw: "5.8 kDa", organism: "Sus scrofa" },
  "6VMZ": { label: "SARS-CoV-2 Mpro", residues: 306, chains: 2, mw: "33.8 kDa", organism: "SARS-CoV-2" },
};

/* ── Fetch PDB from RCSB (with local override) ── */
const pdbCache = new Map();

async function fetchPdb(pdbId) {
  if (pdbCache.has(pdbId)) return pdbCache.get(pdbId);

  for (const url of [
    `/pdbs/${pdbId}.pdb`,
    `https://files.rcsb.org/download/${pdbId}.pdb`,
  ]) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const text = await r.text();
        pdbCache.set(pdbId, text);
        return text;
      }
    } catch {
      /* try next source */
    }
  }
  return null;
}

/* ── All viewer modes ── */
const MODES = [
  { key: "structure", label: "Structure" },
  { key: "analysis", label: "Analysis" },
  { key: "plddt", label: "pLDDT" },
  { key: "pae", label: "PAE" },
  { key: "trajectory", label: "Trajectory" },
  { key: "sequence", label: "Sequence" },
];

// Modes that hide the 3Dmol container (full 2D panels)
const PANEL_MODES = new Set(["analysis", "pae"]);
// Modes that need the 3D viewer visible
const VIEWER_3D_MODES = new Set(["structure", "plddt", "trajectory", "sequence"]);

export default function MoleculeViewer({ pdbId = "1CRN", externalMode }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [atomCount, setAtomCount] = useState(0);
  const [mode, setMode] = useState("structure");
  const [currentPdbText, setCurrentPdbText] = useState(null);

  // Allow external mode override
  const activeMode = externalMode || mode;

  // Generate mock data based on current protein
  const residueCount = PDB_INFO[pdbId]?.residues || 100;

  const mockPlddt = useMemo(() => generateMockPlddt(residueCount), [residueCount]);
  const mockPae = useMemo(() => generateMockPae(residueCount), [residueCount]);
  const mockSequenceDesign = useMemo(() => generateMockSequenceDesign(residueCount), [residueCount]);
  const mockTrajectory = useMemo(
    () => (currentPdbText ? generateMockTrajectory(currentPdbText, 15) : null),
    [currentPdbText]
  );

  /* ── Create the 3Dmol viewer exactly ONCE ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Safety: if the viewer exists but its canvas was detached (e.g. HMR), recreate
    if (viewerRef.current && !el.querySelector("canvas")) {
      viewerRef.current = null;
    }

    if (!viewerRef.current) {
      viewerRef.current = $3Dmol.createViewer(el, {
        backgroundColor: "black",
        antialias: true,
        disableFog: true,
      });
    }

    const viewer = viewerRef.current;

    // Resize handler — guards against zero dimensions during panel drag
    const handleResize = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        viewer.resize();
        viewer.render();
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(el);
    window.addEventListener("resize", handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
      // Do NOT destroy the viewer — it persists in the ref
    };
  }, []);

  /* ── Load / swap model when pdbId changes ── */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // Stop animation and clear current model
      viewer.spin(false);
      viewer.removeAllSurfaces();
      viewer.removeAllModels();
      viewer.render();

      const data = await fetchPdb(pdbId);
      if (cancelled) return;

      if (!data) {
        setError(`Could not load ${pdbId}`);
        setLoading(false);
        return;
      }

      setCurrentPdbText(data);

      viewer.addModel(data, "pdb");

      // Cartoon ribbon with spectrum colouring
      viewer.setStyle({}, {
        cartoon: { color: "spectrum", opacity: 0.92 },
      });

      // Sulfur atoms as small spheres
      viewer.addStyle({ elem: "S" }, {
        sphere: { radius: 0.4, color: "yellow", opacity: 0.7 },
      });

      // Ligands / heteroatoms as ball-and-stick
      viewer.addStyle({ hetflag: true }, {
        stick: { radius: 0.15, colorscheme: "default" },
        sphere: { radius: 0.3, colorscheme: "default" },
      });

      // Transparent surface (non-critical — skip on error)
      try {
        viewer.addSurface($3Dmol.SurfaceType.VDW, {
          opacity: 0.06,
          color: "#30d158",
        });
      } catch {
        /* surface is optional */
      }

      if (cancelled) return;

      viewer.zoomTo();
      viewer.spin("y", 0.4);
      viewer.render();

      // Read atom count from the loaded model
      try {
        const atoms = viewer.getModel(0)?.selectedAtoms({});
        setAtomCount(atoms?.length || 0);
      } catch {
        setAtomCount(0);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [pdbId]);

  /* ── Cleanup on mode change: restore default styling ── */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || loading) return;

    if (activeMode === "structure") {
      // Restore default spectrum coloring
      viewer.removeAllModels();
      if (currentPdbText) {
        viewer.addModel(currentPdbText, "pdb");
        viewer.setStyle({}, { cartoon: { color: "spectrum", opacity: 0.92 } });
        viewer.addStyle({ elem: "S" }, { sphere: { radius: 0.4, color: "yellow", opacity: 0.7 } });
        viewer.addStyle({ hetflag: true }, {
          stick: { radius: 0.15, colorscheme: "default" },
          sphere: { radius: 0.3, colorscheme: "default" },
        });
        try {
          viewer.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.06, color: "#30d158" });
        } catch { /* optional */ }
        viewer.zoomTo();
        viewer.spin("y", 0.4);
        viewer.render();
      }
    }
  }, [activeMode, loading, currentPdbText]);

  const info = PDB_INFO[pdbId];

  // Determine 3D container visibility
  const show3D = VIEWER_3D_MODES.has(activeMode);

  // Mode accent colors
  const modeAccent = (key) => {
    switch (key) {
      case "plddt": return "#65cbf3";
      case "pae": return "#ff9f0a";
      case "trajectory": return "#5e5ce6";
      case "sequence": return "#af52de";
      default: return "#30d158";
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#030305" }}>
      {/* Mode toggle (top-left) */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 20,
          display: "flex",
          gap: 1,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
          borderRadius: 6,
          padding: 2,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              padding: "3px 10px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 500,
              background:
                activeMode === m.key ? `${modeAccent(m.key)}20` : "transparent",
              color: activeMode === m.key ? modeAccent(m.key) : "#48484a",
              transition: "all 0.15s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Analysis panel (full 2D) */}
      {activeMode === "analysis" && (
        <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0, zIndex: 5 }}>
          <AnalysisPanel pdbId={pdbId} />
        </div>
      )}

      {/* PAE panel (full 2D) */}
      {activeMode === "pae" && (
        <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0, zIndex: 5 }}>
          <PaePanel paeMatrix={mockPae} pdbId={pdbId} />
        </div>
      )}

      {/* Stable 3Dmol container — the ref keeps this DOM node across re-renders */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          cursor: "grab",
          visibility: show3D ? "visible" : "hidden",
        }}
      />

      {/* pLDDT overlay (on top of 3D) */}
      {activeMode === "plddt" && !loading && (
        <PlddtOverlay viewer={viewerRef.current} plddt={mockPlddt} />
      )}

      {/* Trajectory player (on top of 3D) */}
      {activeMode === "trajectory" && !loading && mockTrajectory && (
        <TrajectoryPlayer viewer={viewerRef.current} trajectory={mockTrajectory} />
      )}

      {/* Sequence panel (on top of 3D) */}
      {activeMode === "sequence" && !loading && (
        <SequencePanel viewer={viewerRef.current} design={mockSequenceDesign} />
      )}

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(3,3,5,0.85)",
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              className="animate-spin"
              style={{
                width: 28,
                height: 28,
                border: "2px solid rgba(255,255,255,0.1)",
                borderTopColor: "#30d158",
                borderRadius: "50%",
                margin: "0 auto 10px",
              }}
            />
            <div
              style={{
                fontFamily: "'DM Sans', monospace",
                fontSize: 10,
                color: "#48484a",
              }}
            >
              Loading {pdbId}...
            </div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: "#ff453a",
              textAlign: "center",
              padding: "0 20px",
            }}
          >
            {error}
            <br />
            <span style={{ color: "#48484a", fontSize: 9 }}>
              Check your network connection
            </span>
          </div>
        </div>
      )}

      {/* PDB info chips (bottom-left) — hidden when overlay panels are active */}
      {!loading && !error && info && activeMode === "structure" && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            display: "flex",
            gap: 5,
            flexWrap: "wrap",
            zIndex: 5,
          }}
        >
          {[
            { text: `PDB: ${pdbId}`, accent: true },
            { text: info.label },
            { text: `${atomCount || info.residues} ${atomCount ? "atoms" : "res"}` },
            { text: `${info.chains} chain${info.chains > 1 ? "s" : ""}` },
            { text: info.mw },
          ].map((c, i) => (
            <span
              key={i}
              style={{
                padding: "3px 9px",
                borderRadius: 5,
                background: "rgba(0,0,0,0.6)",
                fontFamily: "monospace",
                fontSize: 9,
                color: c.accent ? "#30d158" : "#48484a",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {c.text}
            </span>
          ))}
        </div>
      )}

      {/* Organism description (bottom-right) — structure mode only */}
      {!loading && !error && info && activeMode === "structure" && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            padding: "5px 10px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.6)",
            fontFamily: "monospace",
            fontSize: 8.5,
            color: "#48484a",
            border: "1px solid rgba(255,255,255,0.04)",
            maxWidth: 200,
            lineHeight: 1.4,
            zIndex: 5,
          }}
        >
          {info.organism}
        </div>
      )}
    </div>
  );
}
