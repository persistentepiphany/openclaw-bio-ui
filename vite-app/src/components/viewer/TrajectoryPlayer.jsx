/**
 * TrajectoryPlayer.jsx — RFdiffusion diffusion trajectory playback
 *
 * Loads N PDB frames as separate 3Dmol models. Shows one at a time.
 * Timeline slider, play/pause, step counter.
 * Colors by per-residue displacement from base structure.
 *
 * Props:
 *   viewer     — 3Dmol viewer instance
 *   trajectory — { frames: string[], displacements: number[][] }
 */

import { useEffect, useRef, useState, useCallback } from "react";

export default function TrajectoryPlayer({ viewer, trajectory }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef(null);
  const modelCountRef = useRef(0);

  const numFrames = trajectory?.frames?.length || 0;

  // Load all frames as separate models
  useEffect(() => {
    if (!viewer || !trajectory || numFrames === 0) return;

    // Remove existing models and load trajectory frames
    viewer.removeAllModels();
    viewer.removeAllSurfaces();

    trajectory.frames.forEach((pdb, i) => {
      viewer.addModel(pdb, "pdb");
      // Hide all frames initially
      viewer.setStyle({ model: i }, {});
    });

    modelCountRef.current = numFrames;

    // Show first frame
    viewer.setStyle(
      { model: 0 },
      { cartoon: { color: "spectrum", opacity: 0.92 } }
    );
    viewer.zoomTo();
    viewer.spin(false);
    viewer.render();
    setCurrentFrame(0);
    setLoaded(true);

    return () => {
      // Cleanup: remove extra models, keep only first with spectrum coloring
      if (viewer && modelCountRef.current > 0) {
        viewer.removeAllModels();
        viewer.render();
      }
      setLoaded(false);
    };
  }, [viewer, trajectory, numFrames]);

  // Switch visible frame
  useEffect(() => {
    if (!viewer || !loaded || numFrames === 0) return;

    for (let i = 0; i < numFrames; i++) {
      if (i === currentFrame) {
        // Color by displacement if available
        const disps = trajectory.displacements[currentFrame];
        const maxDisp = disps?.length > 0 ? Math.max(...disps, 0.1) : 1;

        viewer.setStyle(
          { model: i },
          {
            cartoon: {
              colorfunc: (atom) => {
                if (!disps || disps.length === 0) return "white";
                const idx = atom.index;
                const d = disps[idx] || 0;
                const t = Math.min(d / maxDisp, 1);
                // Blue (low disp) → Red (high disp)
                const r = Math.round(50 + t * 205);
                const g = Math.round(100 + (1 - t) * 100);
                const b = Math.round(220 - t * 180);
                return `rgb(${r},${g},${b})`;
              },
              opacity: 0.92,
            },
          }
        );
      } else {
        viewer.setStyle({ model: i }, {}); // hidden
      }
    }
    viewer.render();
  }, [viewer, currentFrame, loaded, numFrames, trajectory]);

  // Play/pause interval
  useEffect(() => {
    if (playing && loaded) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame((f) => {
          const next = f + 1;
          if (next >= numFrames) {
            setPlaying(false);
            return f;
          }
          return next;
        });
      }, 150);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, loaded, numFrames]);

  const handleSlider = useCallback((e) => {
    setCurrentFrame(parseInt(e.target.value, 10));
  }, []);

  const togglePlay = () => setPlaying((p) => !p);

  const stepBack = () => setCurrentFrame((f) => Math.max(0, f - 1));
  const stepForward = () => setCurrentFrame((f) => Math.min(numFrames - 1, f + 1));

  if (!trajectory || numFrames === 0) return null;

  const progress = numFrames > 1 ? currentFrame / (numFrames - 1) : 0;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 44,
        left: 10,
        right: 10,
        zIndex: 15,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(12px)",
        borderRadius: 8,
        padding: "8px 12px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              color: "#5e5ce6",
              padding: "2px 6px",
              background: "rgba(94,92,230,0.15)",
              borderRadius: 3,
              fontWeight: 600,
            }}
          >
            RFdiffusion
          </span>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: "#86868b" }}>
            Diffusion Trajectory
          </span>
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a" }}>
          Frame {currentFrame + 1} / {numFrames}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Step back */}
        <button
          onClick={stepBack}
          disabled={currentFrame === 0}
          style={{
            background: "none",
            border: "none",
            color: currentFrame === 0 ? "#2a2a2a" : "#86868b",
            cursor: currentFrame === 0 ? "default" : "pointer",
            padding: 2,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ⏮
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          style={{
            background: playing ? "rgba(255,69,58,0.15)" : "rgba(94,92,230,0.15)",
            border: `1px solid ${playing ? "rgba(255,69,58,0.3)" : "rgba(94,92,230,0.3)"}`,
            color: playing ? "#ff453a" : "#5e5ce6",
            cursor: "pointer",
            padding: "3px 10px",
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: 600,
          }}
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>

        {/* Step forward */}
        <button
          onClick={stepForward}
          disabled={currentFrame === numFrames - 1}
          style={{
            background: "none",
            border: "none",
            color: currentFrame === numFrames - 1 ? "#2a2a2a" : "#86868b",
            cursor: currentFrame === numFrames - 1 ? "default" : "pointer",
            padding: 2,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ⏭
        </button>

        {/* Timeline slider */}
        <input
          type="range"
          min={0}
          max={numFrames - 1}
          value={currentFrame}
          onChange={handleSlider}
          style={{
            flex: 1,
            accentColor: "#5e5ce6",
            height: 4,
          }}
        />
      </div>

      {/* Progress label */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "monospace",
          fontSize: 7,
          color: "#48484a",
        }}
      >
        <span>Noisy (t=T)</span>
        <span
          className={playing ? "playback-pulse" : ""}
          style={{ color: "#5e5ce6" }}
        >
          {Math.round(progress * 100)}% denoised
        </span>
        <span>Clean (t=0)</span>
      </div>
    </div>
  );
}
