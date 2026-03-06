/**
 * WorkflowStatus.jsx — Pipeline step indicator with animated transitions.
 *
 * Steps: Detect → Characterise → Design → Validate → Report
 *
 * Props:
 *   steps       – array of step label strings
 *   currentStep – index of the active step (0-based; equals steps.length when all are done)
 *   running     – boolean, triggers the pulse glow on the active step
 */
export default function WorkflowStatus({ steps, currentStep, running }) {
  const getStatus = (i) => {
    if (i < currentStep) return "completed";
    if (i === currentStep && currentStep < steps.length) return "active";
    return "pending";
  };

  return (
    <div className="flex items-center justify-center py-3 px-5 border-t border-[#141414] bg-[#0a0a0a]">
      {steps.map((step, i) => {
        const st = getStatus(i);
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              {/* Step circle */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center
                  font-mono text-[9px] font-medium transition-all duration-500
                  ${st === "completed"
                    ? "bg-[rgba(48,209,88,0.15)] text-[#30d158] border-[1.5px] border-[rgba(48,209,88,0.3)]"
                    : st === "active"
                    ? "bg-[#30d158] text-black border-[1.5px] border-[#30d158]"
                    : "bg-[#111] text-[#48484a] border-[1.5px] border-[#1c1c1c]"}`}
                style={st === "active" && running ? { animation: "pulse 1.5s ease-in-out infinite" } : {}}
              >
                {st === "completed" ? "✓" : i + 1}
              </div>

              {/* Step label */}
              <span
                className={`text-[9px] font-mono transition-colors duration-500
                  ${st === "active"
                    ? "text-[#30d158]"
                    : st === "completed"
                    ? "text-[rgba(48,209,88,0.5)]"
                    : "text-[#48484a]"}`}
              >
                {step}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={`w-7 h-px mx-1.5 mb-4 transition-colors duration-500
                  ${i < currentStep ? "bg-[rgba(48,209,88,0.3)]" : "bg-[#1c1c1c]"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
