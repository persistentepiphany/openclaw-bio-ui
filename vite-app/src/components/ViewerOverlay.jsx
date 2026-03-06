/**
 * ViewerOverlay.jsx — Small info card shown over the 3D viewer when a
 * candidate is selected from the DataTable.
 *
 * Displays: candidate ID, name, binding score, and target protein.
 *
 * Props:
 *   candidate – { id, name, score, target } or null/undefined
 */
export default function ViewerOverlay({ candidate }) {
  if (!candidate) return null;

  return (
    <div
      className="absolute bottom-3 left-3 z-20 animate-fadeIn
        bg-[rgba(0,0,0,0.7)] backdrop-blur-xl
        border border-[rgba(48,209,88,0.15)] rounded-xl px-4 py-2.5"
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />
        <span className="font-mono text-[11px] font-medium text-[#30d158]">
          {candidate.id}
        </span>
        <span className="text-[10px] text-[#86868b]">{candidate.name}</span>
      </div>
      <div className="mt-1 text-[10px] text-[#48484a] font-mono">
        Binding affinity:{" "}
        <span className="text-[#f5f5f7] font-medium">
          {candidate.score.toFixed(2)}
        </span>
        <span className="mx-1.5 text-[#2a2a2a]">|</span>
        Target: <span className="text-[#5e5ce6]">{candidate.target}</span>
      </div>
    </div>
  );
}
