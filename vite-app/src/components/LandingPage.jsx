/**
 * LandingPage.jsx — Hero page with mock sign-in flow.
 *
 * Props:
 *   onEnter – callback to transition into the dashboard
 */
import { useState } from "react";

export default function LandingPage({ onEnter }) {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("biosentinel");
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = () => {
    setSigningIn(true);
    setTimeout(() => {
      setSigningIn(false);
      onEnter();
    }, 1200);
  };

  return (
    <div
      className="w-screen h-screen bg-[#030305] flex items-center justify-center relative overflow-hidden"
      style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* ── Background grid ── */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(48,209,88,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(48,209,88,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow behind logo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(48,209,88,0.06) 0%, transparent 70%)" }}
      />

      {/* Floating orbs */}
      <div className="absolute top-[25%] left-[22%] w-2 h-2 rounded-full bg-[#30d158] opacity-20 animate-float" />
      <div
        className="absolute top-[70%] right-[30%] w-1.5 h-1.5 rounded-full bg-[#30d158] opacity-15 animate-float"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-[30%] right-[20%] w-1 h-1 rounded-full bg-[#5e5ce6] opacity-20 animate-float"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="absolute bottom-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-[#5e5ce6] opacity-10 animate-float"
        style={{ animationDelay: "6s" }}
      />

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-fadeIn">
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl bg-[#30d158] flex items-center justify-center text-4xl font-bold text-black shadow-[0_0_60px_rgba(48,209,88,0.2)]">
          B
        </div>

        {/* Title + tagline */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-[#f5f5f7] tracking-tight">
            BioSentinel
          </h1>
          <p className="mt-3 text-lg text-[#86868b] font-light">
            Automated Biodefense Pipeline
          </p>
          <span className="inline-block mt-3 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[rgba(48,209,88,0.1)] text-[#30d158]">
            v2.4
          </span>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setShowLogin(true)}
            className="px-8 py-3 rounded-xl bg-[#30d158] text-black font-semibold text-sm
              hover:opacity-90 active:scale-[0.98] transition-all
              shadow-[0_0_20px_rgba(48,209,88,0.15)]"
          >
            Sign In
          </button>
          <button
            onClick={onEnter}
            className="px-8 py-3 rounded-xl bg-transparent text-[#86868b] font-semibold text-sm
              border border-[#1c1c1c] hover:border-[#30d158] hover:text-[#30d158] transition-all"
          >
            Live Demo
          </button>
        </div>

        {/* Feature badges */}
        <div className="flex gap-6 mt-6">
          {["5-Stage Pipeline", "Real-time Monitoring", "AI-Powered Analysis"].map(
            (f) => (
              <div
                key={f}
                className="flex items-center gap-2 text-[11px] text-[#48484a] font-mono"
              >
                <span className="w-1 h-1 rounded-full bg-[#30d158] opacity-50" />
                {f}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Sign-In Modal ── */}
      {showLogin && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)] backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0a0a0a] border border-[#1c1c1c] rounded-2xl p-8 w-[380px] shadow-2xl animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#30d158] flex items-center justify-center text-sm font-bold text-black">
                  B
                </div>
                <span className="text-sm font-medium text-[#f5f5f7]">
                  BioSentinel
                </span>
              </div>
              <button
                onClick={() => setShowLogin(false)}
                className="text-[#48484a] hover:text-[#86868b] transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            <h2 className="text-xl font-semibold text-[#f5f5f7] mb-1">
              Welcome back
            </h2>
            <p className="text-xs text-[#48484a] mb-6">
              Sign in to access the dashboard
            </p>

            {/* Form */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-mono text-[#48484a] uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#111] border border-[#1c1c1c] rounded-lg px-3.5 py-2.5
                    text-sm text-[#f5f5f7] outline-none
                    focus:border-[rgba(48,209,88,0.3)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#48484a] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  className="w-full bg-[#111] border border-[#1c1c1c] rounded-lg px-3.5 py-2.5
                    text-sm text-[#f5f5f7] outline-none
                    focus:border-[rgba(48,209,88,0.3)] transition-colors"
                />
              </div>

              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className={`mt-2 py-2.5 rounded-lg text-sm font-semibold transition-all
                  flex items-center justify-center gap-2
                  ${signingIn
                    ? "bg-[#111] text-[#30d158] border border-[#1c1c1c]"
                    : "bg-[#30d158] text-black hover:opacity-90 active:scale-[0.98]"}`}
              >
                {signingIn ? (
                  <>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                      className="animate-spin"
                    >
                      <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
                    </svg>
                    Authenticating…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              <button
                onClick={onEnter}
                className="text-xs text-[#48484a] hover:text-[#30d158] transition-colors mt-1"
              >
                Continue as guest →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
