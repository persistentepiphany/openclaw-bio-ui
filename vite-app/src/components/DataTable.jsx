/**
 * DataTable.jsx — Candidate list with scores.
 *
 * Shows a shimmer skeleton while loading, then a sortable table of candidates.
 * Clicking a row highlights it (green left border) and fires `onSelect`.
 *
 * Props:
 *   items      – array of { id, name, score, target, status }
 *   selectedId – currently selected candidate id (or null)
 *   onSelect   – (id: string) => void
 *   loading    – boolean, show skeleton instead of data
 */
export default function DataTable({ items, selectedId, onSelect, loading, dashboardMode }) {
  const scoreColor = (v) =>
    v >= 0.85 ? "#30d158" : v >= 0.65 ? "#86868b" : "#ff9f0a";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-3 pb-1 text-[9px] font-mono font-medium text-[#48484a] uppercase tracking-wider">
        Candidates
      </div>

      {/* ── Empty state for live mode ── */}
      {!loading && items.length === 0 && dashboardMode === "live" ? (
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6M9 12h6M9 15h3"/>
          </svg>
          <span className="font-mono text-[10px] text-[#48484a] text-center">
            Run the pipeline to generate candidates
          </span>
          <span className="font-mono text-[8px] text-[#2a2a2a] text-center">
            Select a target protein and configure tasks first
          </span>
        </div>
      ) :
      /* ── Loading skeleton ── */
      loading ? (
        <div className="px-3 pt-1">
          {[65, 55, 70, 48, 60, 52].map((w, i) => (
            <div key={i} className="flex items-center gap-2 px-1 py-2.5">
              <div className="skeleton h-3 w-5 rounded" />
              <div className="skeleton h-3 rounded" style={{ width: `${w}%` }} />
              <div className="skeleton h-3 w-8 rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : (
        /* ── Data table ── */
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["#", "Candidate", "Score", ""].map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-1.5 font-mono text-[9px] font-medium text-[#48484a] uppercase tracking-wide
                    border-b border-[#141414] sticky top-0 bg-[#0a0a0a] z-10
                    ${i === 2 ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {items.map((d, i) => {
              const sel = d.id === selectedId;
              return (
                <tr
                  key={d.id}
                  onClick={() => onSelect(d.id)}
                  className={`cursor-pointer transition-all duration-200 animate-fadeIn
                    ${sel
                      ? "bg-[rgba(48,209,88,0.06)] border-l-4 border-l-[#30d158]"
                      : "hover:bg-[#161616] border-l-4 border-l-transparent"}`}
                >
                  <td className="px-4 py-1.5 font-mono text-[10px] text-[#48484a]">
                    {i + 1}
                  </td>

                  <td className="px-4 py-1.5">
                    <div className={`font-mono text-[11px] font-medium ${sel ? "text-[#30d158]" : "text-[#f5f5f7]"}`}>
                      {d.id}
                    </div>
                    <div className="font-mono text-[9px] text-[#48484a] mt-px">
                      {d.name}
                      {d.target && (
                        <span className="ml-1.5 text-[#5e5ce6] opacity-60">
                          →{d.target}
                        </span>
                      )}
                    </div>
                  </td>

                  <td
                    className="px-4 py-1.5 font-mono text-[11px] font-medium text-right"
                    style={{ color: scoreColor(d.score) }}
                  >
                    {d.score.toFixed(2)}
                  </td>

                  <td
                    className="px-4 py-1.5 text-[11px] text-center"
                    style={{ color: d.status === "pass" ? "#30d158" : "#ff9f0a", opacity: 0.7 }}
                  >
                    {d.status === "pass" ? "✓" : "⚠"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
