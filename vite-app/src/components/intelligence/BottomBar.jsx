/**
 * BottomBar.jsx — Classification banner + timestamp + attribution
 */

export default function BottomBar({ incidentCount, arcCount }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5"
      style={{
        height: 28,
        background: "rgba(255,69,58,0.06)",
        borderTop: "1px solid rgba(255,69,58,0.12)",
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          fontWeight: 700,
          color: "#ff453a",
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Classified // BioSentinel SIGINT // Handle via COMINT channels only
      </span>

      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          color: "#3a3a3c",
        }}
      >
        Last updated:{" "}
        {new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        UTC &middot; {incidentCount} active signals &middot; {arcCount} intel
        links
      </span>
    </div>
  );
}
