/**
 * ToolSelector.jsx — 3 tool cards for RFdiffusion, ProteinMPNN, Boltz-2
 *
 * Props:
 *   tools      — array from toolCatalog
 *   onSelect   — (toolId) => void
 *   selectedId — currently selected tool id
 */

export default function ToolSelector({ tools, onSelect, selectedId }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 0" }}>
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
        Select a Design Tool
      </div>

      {tools.map((tool) => {
        const isSelected = selectedId === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onSelect(tool.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 10,
              background: isSelected
                ? `${tool.accentColor}15`
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${isSelected ? `${tool.accentColor}40` : "rgba(255,255,255,0.06)"}`,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
              width: "100%",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `${tool.accentColor}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {tool.icon}
            </div>

            {/* Text */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isSelected ? tool.accentColor : "#e5e5ea",
                  marginBottom: 3,
                }}
              >
                {tool.name}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  color: "#636366",
                  lineHeight: 1.4,
                }}
              >
                {tool.description}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: "#48484a",
                  marginTop: 4,
                }}
              >
                Est. time: {tool.estimatedTime}
              </div>
            </div>

            {/* Selected indicator */}
            {isSelected && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: tool.accentColor,
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
