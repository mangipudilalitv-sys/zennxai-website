"use client";

import { useState } from "react";

export default function AutonomousPage() {
  const [loading, setLoading] = useState(false);
  const [loop, setLoop] = useState<any>(null);

  async function runAutonomousLoop() {
    setLoading(true);

    const res = await fetch("/api/autonomous-loop", {
      method: "POST",
    });

    const data = await res.json();

    setLoop(data.loop);
    setLoading(false);
  }

  return (
   <div className="relative overflow-hidden px-10 py-8 text-[#fffaf0]">
      <div className="ambient-light left-[8%] top-[0%] h-[460px] w-[460px] bg-[#f2d8a8]/18" />
      <div className="ambient-light bottom-[-12%] right-[8%] h-[520px] w-[520px] bg-white/10" />

      <div className="relative z-10">
        <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel luxury-border rounded-[42px] p-10">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#f2d8a8]/30 bg-[#f2d8a8]/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#f2d8a8]">
              <div className="status-dot" />
              Autonomous Operations Loop
            </div>

            <h1 className="hero-title max-w-5xl text-7xl font-black">
              The system keeps working when nobody is watching.
            </h1>

            <p className="soft-text mt-8 max-w-3xl text-xl leading-relaxed">
              Persistent operational intelligence monitoring stalled workflows,
              operator coordination, escalation states, revenue risk, and
              autonomous intervention opportunities.
            </p>

            <button
              onClick={runAutonomousLoop}
              disabled={loading}
              className="champagne-surface mt-10 rounded-2xl px-8 py-4 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? "Running Autonomous Loop..." : "Run Autonomous Loop"}
            </button>
          </div>

          <div className="glass-panel luxury-border rounded-[42px] p-10">
            <p className="gold-text text-sm uppercase tracking-[0.25em]">
              Continuous Intelligence Core
            </p>

            <div className="relative mx-auto mt-12 flex h-[320px] w-[320px] items-center justify-center">
              <div className="absolute h-[320px] w-[320px] rounded-full border border-white/10" />
              <div className="absolute h-[250px] w-[250px] rounded-full border border-[#d6b98c]/25" />
              <div className="absolute h-[180px] w-[180px] rounded-full border border-white/15 bg-white/10 backdrop-blur-xl" />
              <div className="absolute h-[105px] w-[105px] rounded-full bg-[#f2d8a8]/25 blur-2xl" />
              <div className="gold-glow h-[58px] w-[58px] rounded-full bg-[#f2d8a8]" />
            </div>

            <div className="mt-10 grid gap-3">
              {[
                "Workflow Continuity",
                "Operator Handoff Detection",
                "Revenue Risk Watch",
                "Autonomous Intervention",
              ].map((item) => (
                <div
                  key={item}
                  className="white-glass flex items-center justify-between rounded-2xl px-5 py-4"
                >
                  <span className="text-sm text-white/75">{item}</span>
                  <div className="status-dot" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {loop && (
          <section className="mt-10 grid gap-8">
            <div className="champagne-surface rounded-[42px] p-10">
              <p className="text-sm uppercase tracking-[0.25em] text-white/55">
                System Status
              </p>

              <h2 className="mt-5 max-w-5xl text-5xl font-black leading-tight tracking-[-0.06em]">
                {loop.system_status}
              </h2>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-[28px] border border-white/20 bg-black/25 p-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                    Critical Risk
                  </p>

                  <p className="mt-4 text-4xl font-black">
                    {loop.critical_risk_detected ? "Detected" : "Clear"}
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/20 bg-black/25 p-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                    Workflow Stall
                  </p>

                  <p className="mt-4 text-4xl font-black">
                    {loop.workflow_stall_detected ? "Detected" : "Flow Active"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-8">
                <p className="gold-text text-sm uppercase tracking-[0.25em]">
                  Autonomous Actions
                </p>

                <h2 className="mt-3 text-6xl font-black tracking-[-0.06em]">
                  System-created interventions
                </h2>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                {loop.autonomous_actions &&
                loop.autonomous_actions.length > 0 ? (
                  loop.autonomous_actions.map((action: any, index: number) => (
                    <div
                      key={index}
                      className="white-glass group relative overflow-hidden rounded-[34px] p-8 transition hover:scale-[1.01]"
                    >
                      <div className="absolute right-[-12%] top-[-12%] h-[220px] w-[220px] rounded-full bg-[#d6b98c]/12 blur-[90px]" />

                      <div className="relative z-10">
                        <div className="mb-6 flex items-center justify-between gap-4">
                          <div className="rounded-full border border-[#d6b98c]/25 bg-[#d6b98c]/10 px-3 py-1 text-xs text-[#f2d8a8]">
                            {action.target_operator}
                          </div>

                          <div className="rounded-full bg-black/25 px-3 py-1 text-xs text-white/60">
                            {action.priority}
                          </div>
                        </div>

                        <h3 className="text-4xl font-black leading-tight tracking-[-0.05em]">
                          {action.task_title}
                        </h3>

                        <p className="soft-text mt-6 text-base leading-relaxed">
                          {action.task_description}
                        </p>

                        <div className="mt-8 h-[1px] bg-gradient-to-r from-[#d6b98c]/45 to-transparent" />

                        <p className="mt-5 text-xs uppercase tracking-[0.22em] text-white/30">
                          {action.action_type}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="white-glass rounded-[34px] p-8 text-white/55">
                    No autonomous actions generated yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}