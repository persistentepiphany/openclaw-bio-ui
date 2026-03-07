/**
 * ProteinDiscoveryPanel.jsx — Modal for selecting proteins from suggestions.
 *
 * Visual style matches PipelineConfigPanel (glass backdrop, ~400px panel).
 * Section 1: "Threat-Linked" — proteins from pathogen mapping
 * Section 2: "Server Catalog" — proteins from fetchProteinList() API
 *
 * Props:
 *   suggestedProteins  – array of { pdbId, label, pathogen, severity, source, desc }
 *   selectedProteins   – already-selected proteins (shown as disabled)
 *   onAdd              – (proteins[]) callback to add selected proteins
 *   onClose            – callback to close the panel
 */
import { useState } from "react";

const SEVERITY_COLORS = {
  critical: "#ff453a",
  high: "#ff9f0a",
  medium: "#ffd60a",
  low: "#30d158",
};

export default function ProteinDiscoveryPanel({ suggestedProteins, selectedProteins, onAdd, onClose }) {
  const [checked, setChecked] = useState(new Set());

  const selectedPdbIds = new Set((selectedProteins || []).map((p) => p.pdbId));

  const threatLinked = suggestedProteins.filter((p) => p.source !== "server");
  const serverCatalog = suggestedProteins.filter((p) => p.source === "server");

  const toggle = (pdbId) => {
    if (selectedPdbIds.has(pdbId)) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(pdbId)) next.delete(pdbId);
      else next.add(pdbId);
      return next;
    });
  };

  const selectAll = (proteins) => {
    setChecked((prev) => {
      const next = new Set(prev);
      proteins.forEach((p) => {
        if (!selectedPdbIds.has(p.pdbId)) next.add(p.pdbId);
      });
      return next;
    });
  };

  const handleAdd = () => {
    const toAdd = suggestedProteins.filter((p) => checked.has(p.pdbId));
    if (toAdd.length > 0) onAdd(toAdd);
    onClose();
  };

  const renderProteinRow = (protein) => {
    const alreadyAdded = selectedPdbIds.has(protein.pdbId);
    const isChecked = checked.has(protein.pdbId);

    return (
      <div
        key={protein.pdbId}
        onClick={() => toggle(protein.pdbId)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: 6,
          marginBottom: 2,
          background: alreadyAdded
            ? "rgba(255,255,255,0.02)"
            : isChecked
            ? "rgba(48,209,88,0.06)"
            : "transparent",
          border: `1px solid ${isChecked ? "rgba(48,209,88,0.2)" : "transparent"}`,
          cursor: alreadyAdded ? "default" : "pointer",
          opacity: alreadyAdded ? 0.5 : 1,
          transition: "all 0.15s",
        }}
      >
        {/* Checkbox */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            border: `1.5px solid ${alreadyAdded ? "#48484a" : isChecked ? "#30d158" : "#3a3a3c"}`,
            background: alreadyAdded
              ? "rgba(255,255,255,0.04)"
              : isChecked
              ? "rgba(48,209,88,0.2)"
              : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {(isChecked || alreadyAdded) && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={alreadyAdded ? "#48484a" : "#30d158"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "#f5f5f7" }}>
              {protein.pdbId}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "#86868b" }}>
              {protein.label}
            </span>
            {alreadyAdded && (
              <span style={{
                fontFamily: "monospace",
                fontSize: 7,
                fontWeight: 600,
                color: "#48484a",
                background: "rgba(255,255,255,0.06)",
                padding: "1px 5px",
                borderRadius: 3,
                textTransform: "uppercase",
              }}>
                Added
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            {protein.pathogen && (
              <span style={{
                fontFamily: "monospace",
                fontSize: 8,
                color: SEVERITY_COLORS[protein.severity] || "#86868b",
                textTransform: "uppercase",
              }}>
                {protein.pathogen}
              </span>
            )}
            {protein.severity && (
              <span style={{
                fontFamily: "monospace",
                fontSize: 7,
                fontWeight: 600,
                padding: "1px 4px",
                borderRadius: 3,
                background: `${SEVERITY_COLORS[protein.severity] || "#86868b"}15`,
                color: SEVERITY_COLORS[protein.severity] || "#86868b",
                textTransform: "uppercase",
              }}>
                {protein.severity}
              </span>
            )}
            {protein.organism && (
              <span style={{ fontFamily: "monospace", fontSize: 8, color: "#48484a" }}>
                {protein.organism}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const checkedCount = checked.size;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          maxHeight: "80vh",
          background: "rgba(15,15,15,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#f5f5f7" }}>
              Protein Discovery
            </span>
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "#48484a" }}>
              {suggestedProteins.length} found
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "rgba(255,255,255,0.06)",
              color: "#48484a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontFamily: "monospace",
            }}
          >
            x
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 16px", minHeight: 0 }}>
          {/* Threat-Linked Section */}
          {threatLinked.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}>
                <span style={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#ff9f0a",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Threat-Linked
                </span>
                <button
                  onClick={() => selectAll(threatLinked)}
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    color: "#48484a",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Select all
                </button>
              </div>
              {threatLinked.map(renderProteinRow)}
            </div>
          )}

          {/* Server Catalog Section */}
          {serverCatalog.length > 0 && (
            <div>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}>
                <span style={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#5e5ce6",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Server Catalog
                </span>
                <button
                  onClick={() => selectAll(serverCatalog)}
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    color: "#48484a",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Select all
                </button>
              </div>
              {serverCatalog.map(renderProteinRow)}
            </div>
          )}

          {suggestedProteins.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "30px 0",
              fontFamily: "monospace",
              fontSize: 10,
              color: "#48484a",
            }}>
              No protein suggestions yet. Run the scraper to discover threats.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              color: "#48484a",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Skip
          </button>
          <button
            onClick={handleAdd}
            disabled={checkedCount === 0}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
              background: checkedCount > 0 ? "#30d158" : "#1c1c1c",
              color: checkedCount > 0 ? "#000" : "#48484a",
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 600,
              cursor: checkedCount > 0 ? "pointer" : "default",
              transition: "all 0.15s",
            }}
          >
            Add {checkedCount > 0 ? `${checkedCount} protein${checkedCount > 1 ? "s" : ""}` : "proteins"}
          </button>
        </div>
      </div>
    </div>
  );
}
