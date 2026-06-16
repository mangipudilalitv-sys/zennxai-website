"use client";

import { useState } from "react";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState(
    "I’m connected to your leads, tasks, execution chains, operator routing, company memory, and business health signals. Ask me what the operation should do next."
  );
  const [operatorData, setOperatorData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function askOperator() {
    if (!message.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/operator-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await res.json();

      setResponse(data.response || "No operational response returned.");
      setOperatorData(data);
      setMessage("");
    } catch (error) {
      setResponse(
        "Operator connection failed. Check the /api/operator-chat route and server logs."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden px-10 py-9 text-[#fff6e3]">
      <div className="ambient-light luxury-float left-[-12%] top-[-20%] h-[760px] w-[760px] bg-[#ffd98a]/20" />
      <div className="ambient-light bottom-[-24%] right-[-10%] h-[720px] w-[720px] bg-white/8" />

      <div className="relative z-10">
        <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="obsidian-panel gold-rim gold-sweep soft-reveal relative overflow-hidden rounded-[34px] p-14">
            <div className="absolute right-[-14%] top-[-20%] h-[460px] w-[460px] rounded-full bg-[#ffd98a]/10 blur-[120px]" />

            <div className="relative z-10">
              <div className="mb-10 inline-flex items-center gap-3 border border-[#ffd98a]/30 bg-black/35 px-5 py-3 text-xs uppercase tracking-[0.35em] text-[#ffd98a]">
                <div className="status-dot" />
                ZennX Operator Cortex
              </div>

              <h1 className="max-w-[900px] text-[6.6rem] font-black leading-[0.86] tracking-[-0.08em]">
                Command the business intelligence layer.
              </h1>

              <p className="soft-text mt-10 max-w-[760px] text-[1.08rem] leading-[1.9]">
                Speak directly to Universal Operational Intelligence. It reads
                the company’s memory, understands active workflows, identifies
                bottlenecks, routes operators, and decides the next highest
                leverage move.
              </p>

              <div className="mt-14 grid gap-5 md:grid-cols-[1.08fr_0.96fr_0.96fr]">
                <div className="gold-engraved depth-hover min-h-[170px] p-7">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/34">
                    Memory
                  </p>

                  <h2 className="mt-6 text-4xl font-black">Synced</h2>

                  <div className="mt-6 h-[1px] bg-gradient-to-r from-[#ffd98a]/55 to-transparent" />

                  <p className="soft-text mt-5 text-sm leading-relaxed">
                    Persistent company context ready for retrieval.
                  </p>
                </div>

                <div className="obsidian-panel depth-hover min-h-[170px] p-7">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/34">
                    Operators
                  </p>

                  <h2 className="mt-6 text-4xl font-black">Online</h2>

                  <div className="mt-6 h-[1px] bg-gradient-to-r from-[#ffd98a]/55 to-transparent" />

                  <p className="soft-text mt-5 text-sm leading-relaxed">
                    Execution agents standing by for routing.
                  </p>
                </div>

                <div className="champagne-surface depth-hover gold-sweep min-h-[170px] p-7 text-black">
                  <p className="text-xs uppercase tracking-[0.3em] text-black/55">
                    Cognition
                  </p>

                  <h2 className="mt-6 text-4xl font-black">Live</h2>

                  <div className="mt-6 h-[1px] bg-gradient-to-r from-black/30 to-transparent" />

                  <p className="mt-5 text-sm leading-relaxed text-black/68">
                    Operational reasoning active across the system.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel gold-rim luxury-float slow-glow relative overflow-hidden rounded-[34px] p-11">
            <div className="absolute left-[-20%] top-[-20%] h-[300px] w-[300px] rounded-full bg-[#ffd98a]/10 blur-[100px]" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="gold-text text-xs uppercase tracking-[0.35em]">
                    Operator Core
                  </p>

                  <h2 className="mt-4 text-5xl font-black leading-[0.9] tracking-[-0.065em]">
                    Active Cortex
                  </h2>
                </div>

                <div className="gold-engraved px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#ffd98a]">
                  Awake
                </div>
              </div>

              <div className="relative mx-auto mt-16 flex h-[390px] w-[390px] items-center justify-center">
                <div className="absolute h-[390px] w-[390px] border border-[#ffd98a]/16" />
                <div className="absolute h-[315px] w-[315px] border border-white/10" />
                <div className="absolute h-[240px] w-[240px] border border-[#ffd98a]/22 bg-white/[0.035] backdrop-blur-3xl" />

                <div className="gold-orbit absolute h-[390px] w-[390px]">
                  <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 bg-[#ffd98a] shadow-[0_0_42px_rgba(255,217,138,1)]" />
                </div>

                <div
                  className="gold-orbit absolute h-[315px] w-[315px]"
                  style={{ animationDirection: "reverse" }}
                >
                  <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 bg-white shadow-[0_0_36px_rgba(255,255,255,0.9)]" />
                </div>

                <div
                  className="gold-orbit absolute h-[240px] w-[240px]"
                  style={{ animationDuration: "3.2s" }}
                >
                  <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 bg-[#ffd98a] shadow-[0_0_42px_rgba(255,217,138,1)]" />
                </div>

                <div className="absolute h-[185px] w-[185px] bg-[#ffd98a]/10 blur-[76px]" />

                <div className="gold-glow relative flex h-[100px] w-[100px] items-center justify-center bg-[#ffd98a]">
                  <div className="absolute h-[175px] w-[175px] bg-[#ffd98a]/20 blur-[55px]" />
                  <div className="relative h-[24px] w-[24px] bg-white" />
                </div>
              </div>

              <div className="mt-12 grid gap-4">
                {[
                  "Company Memory",
                  "Operator Routing",
                  "Revenue Risk",
                  "Execution Logic",
                  "Business Health",
                ].map((item) => (
                  <div
                    key={item}
                    className="gold-engraved depth-hover flex items-center justify-between px-6 py-5"
                  >
                    <span className="text-sm uppercase tracking-[0.14em] text-white/75">
                      {item}
                    </span>

                    <div className="status-dot" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="obsidian-panel gold-rim soft-reveal mt-14 overflow-hidden rounded-[34px] p-11">
          <div className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="gold-text text-sm uppercase tracking-[0.35em]">
                Intelligence Dialogue
              </p>

              <h2 className="mt-4 max-w-[820px] text-6xl font-black leading-[0.95] tracking-[-0.055em]">
                Ask the operation what it knows.
              </h2>
            </div>

            <div className="gold-engraved px-5 py-3 text-xs uppercase tracking-[0.24em] text-[#ffd98a]">
              Universal Operational Intelligence
            </div>
          </div>

          <div className="gold-engraved relative overflow-hidden p-8">
            <div className="absolute right-[-10%] top-[-25%] h-[260px] w-[260px] bg-[#ffd98a]/10 blur-[110px]" />

            <div className="relative z-10">
              <div className="mb-6 flex items-center gap-3">
                <div className="status-dot" />

                <p className="text-xs uppercase tracking-[0.25em] text-[#ffd98a]">
                  ZennX Cortex Response
                </p>
              </div>

              <p className="whitespace-pre-wrap text-lg leading-[1.85] text-white/78">
                {response}
              </p>
            </div>
          </div>

          {operatorData && (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="gold-engraved p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Intent
                </p>

                <h3 className="mt-4 break-words text-2xl font-black text-[#ffd98a]">
                  {operatorData.operator?.intent || "general"}
                </h3>
              </div>

              <div className="gold-engraved p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Priority
                </p>

                <h3 className="mt-4 text-2xl font-black uppercase text-[#ffd98a]">
                  {operatorData.operator?.priority || "low"}
                </h3>
              </div>

              <div className="gold-engraved p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Operational Score
                </p>

                <h3 className="mt-4 text-2xl font-black text-[#ffd98a]">
                  {operatorData.system?.operationalScore ?? "--"}%
                </h3>
              </div>
            </div>
          )}

          {operatorData?.autonomous && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="obsidian-panel p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Actions Created
                </p>

                <h3 className="mt-4 text-2xl font-black text-white">
                  {operatorData.autonomous.actionsCreated}
                </h3>
              </div>

              <div className="obsidian-panel p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  High Risk Leads
                </p>

                <h3 className="mt-4 text-2xl font-black text-white">
                  {operatorData.autonomous.highRiskLeads}
                </h3>
              </div>

              <div className="obsidian-panel p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Pending Tasks
                </p>

                <h3 className="mt-4 text-2xl font-black text-white">
                  {operatorData.autonomous.pendingTasks}
                </h3>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-4 xl:flex-row">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") askOperator();
              }}
              placeholder="Ask ZennX what the business should do next..."
              className="gold-engraved flex-1 px-6 py-5 text-white placeholder:text-white/35 outline-none transition focus:border-[#ffd98a]/60"
            />

            <button
              onClick={askOperator}
              disabled={loading}
              className="champagne-surface depth-hover gold-sweep px-9 py-5 text-sm font-black uppercase tracking-[0.2em] text-black disabled:opacity-50"
            >
              {loading ? "Thinking" : "Ask Cortex"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}