/**
 * MolstarViewer.jsx — CSP-compliant protein structure viewer using Mol*
 *
 * Mol* (Molstar) is the viewer used by PDB/RCSB itself.
 * Unlike 3Dmol.js, it does NOT use eval() and works under strict CSP.
 *
 * Features:
 *   - Rainbow/spectrum coloring by residue index (N→blue to C→red)
 *   - Ligands as ball-and-stick with CPK element coloring
 *   - Water as ball-and-stick with element coloring
 *   - Auto-rotate spin animation when idle
 *   - Dark background matching dashboard theme
 *
 * Props:
 *   pdbId   — PDB code string
 *   pdbText — raw PDB text (from cache)
 */

import { useEffect, useRef, useState } from "react";

// v2 API base — used for PDB URL construction for Molstar (needs a URL, not text)
const API_BASE = (import.meta.env.VITE_BIO_API_URL || "https://divine-cat-v2-v2.up.railway.app").replace(/\/+$/, "");

function getPdbUrl(pdbId) {
  // Use v2 pdb endpoint; fall back to RCSB if API base is absent
  if (API_BASE) return `${API_BASE}/api/v2/pdb/${encodeURIComponent(pdbId)}.pdb`;
  return `https://files.rcsb.org/download/${pdbId}.pdb`;
}

export default function MolstarViewer({ pdbId, pdbText }) {
  const containerRef = useRef(null);
  const pluginRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initRef = useRef(false);

  /* ── Initialize Molstar once ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        // Dynamic imports — Molstar is large, only load when needed
        const [{ createPluginUI }, { DefaultPluginUISpec }, { createRoot }] =
          await Promise.all([
            import("molstar/lib/mol-plugin-ui"),
            import("molstar/lib/mol-plugin-ui/spec"),
            import("react-dom/client"),
          ]);

        // Load Molstar's dark skin CSS
        await import("molstar/lib/mol-plugin-ui/skin/dark.scss");

        if (cancelled) return;

        const spec = DefaultPluginUISpec();

        const plugin = await createPluginUI({
          target: container,
          render: (component, target) => {
            const root = createRoot(target);
            root.render(component);
            return root;
          },
          spec: {
            ...spec,
            layout: {
              initial: {
                isExpanded: false,
                showControls: false,
                regionState: {
                  left: "collapsed",
                  right: "collapsed",
                  top: "hidden",
                  bottom: "hidden",
                },
              },
            },
            components: {
              ...spec.components,
              hideTaskOverlay: true,
            },
          },
        });

        if (cancelled) {
          plugin.dispose();
          return;
        }

        // Set dark background + enable spin animation
        if (plugin.canvas3d) {
          const renderer = plugin.canvas3d.props.renderer;
          plugin.canvas3d.setProps({
            renderer: {
              ...renderer,
              backgroundColor: 0x030305,
            },
            trackball: {
              ...plugin.canvas3d.props.trackball,
              animate: {
                name: "spin",
                // speed = rotations/sec, axis in camera space (Y-up)
                params: { speed: 0.0278, axis: [0, -1, 0] },
              },
            },
          });
        }

        pluginRef.current = plugin;
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("Molstar init failed:", err);
          setError("Failed to initialize Molstar viewer");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (pluginRef.current) {
        pluginRef.current.dispose();
        pluginRef.current = null;
      }
      initRef.current = false;
    };
  }, []);

  /* ── Load PDB when plugin ready or pdbId changes ── */
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin || loading) return;

    let cancelled = false;

    (async () => {
      try {
        plugin.clear();

        let data;
        if (pdbText) {
          data = await plugin.builders.data.rawData(
            { data: pdbText, label: pdbId },
            { state: { isGhost: true } }
          );
        } else {
          data = await plugin.builders.data.download(
            {
              url: getPdbUrl(pdbId),
              isBinary: false,
              label: pdbId,
            },
            { state: { isGhost: true } }
          );
        }

        if (cancelled) return;

        const trajectory = await plugin.builders.structure.parseTrajectory(
          data,
          "pdb"
        );

        // Apply polymer-and-ligand preset with rainbow (sequence-id) coloring
        await plugin.builders.structure.hierarchy.applyPreset(
          trajectory,
          "default",
          {
            showUnitcell: false,
            representationPreset: "polymer-and-ligand",
            representationPresetParams: {
              theme: {
                globalName: "sequence-id",
                carbonColor: "element-symbol",
              },
            },
          }
        );
      } catch (err) {
        if (!cancelled) {
          console.error("Molstar PDB load failed:", err);
          setError(`Could not load ${pdbId}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdbId, pdbText, loading]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#030305",
      }}
    >
      {/* Molstar container */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      />

      {/* Loading overlay */}
      {loading && !error && (
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
                borderTopColor: "#5e5ce6",
                borderRadius: "50%",
                margin: "0 auto 10px",
              }}
            />
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: "#48484a",
              }}
            >
              Loading Mol* viewer...
            </div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
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
          </div>
        </div>
      )}
    </div>
  );
}
