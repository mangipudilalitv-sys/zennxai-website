"use client";

import { useEffect, useMemo, useState } from "react";

type OperatorMemory = {
  id?: number;
  title?: string;
  outcome?: string;
  priority?: string;
  outcome_score?: number;
  created_at?: string;
};

type OperatorPerformance = {
  operator: string;
  score: number;
  totalMemories: number;
  successSignals: number;
  failureSignals: number;
  neutralSignals: number;
  highPrioritySignals: number;
  averageOutcomeScore: number;
  successRate?: number;
  recentMemories?: OperatorMemory[];
};

export default function OperatorIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState<{
    operators: OperatorPerformance[];
    bestOperator: OperatorPerformance | null;
    operatorCount: number;
  }>({
    operators: [],
    bestOperator: null,
    operatorCount: 0,
  });

  const [events, setEvents] = useState<any[]>([]);

  async function loadData() {
    setLoading(true);

    try {
      const [performanceRes, eventsRes] = await Promise.all([
        fetch("/api/operator-performance", { cache: "no-store" }),
        fetch("/api/operational-events", { cache: "no-store" }),
      ]);

      const performanceJson = await performanceRes.json();
      const eventsJson = await eventsRes.json();

      setPerformance({
        operators: performanceJson.operators || [],
        bestOperator: performanceJson.bestOperator || null,
        operatorCount: performanceJson.operatorCount || 0,
      });

      setEvents(eventsJson.events || eventsJson.operationalEvents || []);
    } catch (error) {
      console.error("OPERATOR INTELLIGENCE LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const recentLearning = useMemo(() => {
    return performance.operators
      .flatMap((operator) =>
        (operator.recentMemories || []).map((memory) => ({
          ...memory,
          operator: operator.operator,
        }))
      )
      .sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();

        return bTime - aTime;
      })
      .slice(0, 8);
  }, [performance.operators]);

  const highPriorityEvents = events
    .filter((event) => event.priority === "high")
    .slice(0, 5);

  const best = performance.bestOperator;

  return (
    <div className="relative overflow-hidden px-10 py-8 text-[#fffaf0]">
      <div className="ambient-light left-[8%] top-[0%] h-[460px] w-[460px] bg-[#f2d8a8]/18" />
      <div className="ambient-light bottom-[-12%] right-[8%] h-[520px] w-[520px] bg-white/10" />

      <div className="relative z-10">
        <section className="mb-10">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#f2d8a8]/30 bg-[#f2d8a8]/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#f2d8a8]">
            <div className="status-dot" />
            Operator Intelligence
          </div>

          <h1 className="hero-title max-w-6xl text-7xl font-black">
            The control tower for ZennX operator learning.
          </h1>

          <p className="soft-text mt-6 max-w-3xl text-xl leading-relaxed">
            Track which operators are winning, what the system is learning,
            and where operational pressure is building.
          </p>

          <button
            onClick={loadData}
            disabled={loading}
            className="champagne-surface mt-8 rounded-2xl px-7 py-4 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? "Refreshing Intelligence..." : "Refresh Intelligence"}
          </button>
        </section>

        <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-panel luxury-border rounded-[42px] p-10">
            <p className="gold-text text-sm uppercase tracking-[0.25em]">
              Best Operator
            </p>

            {best ? (
              <>
                <h2 className="mt-5 text-5xl font-black leading-tight tracking-[-0.06em]">
                  {best.operator}
                </h2>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <Metric label="Score" value={best.score} />
                  <Metric label="Success Rate" value={`${best.successRate || 0}%`} />
                  <Metric label="Learning Memories" value={best.totalMemories} />
                  <Metric
                    label="Avg Outcome"
                    value={best.averageOutcomeScore || 0}
                  />
                </div>
              </>
            ) : (
              <div className="mt-8 rounded-[28px] border border-white/10 bg-black/20 p-6 text-white/55">
                No operator performance data yet.
              </div>
            )}
          </div>

          <div className="glass-panel luxury-border rounded-[42px] p-10">
            <p className="gold-text text-sm uppercase tracking-[0.25em]">
              System Snapshot
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <Metric label="Operators Ranked" value={performance.operatorCount} />
              <Metric label="Learning Memories" value={recentLearning.length} />
              <Metric label="High Priority Events" value={highPriorityEvents.length} />
              <Metric label="Signal Quality" value={best ? "Live" : "Building"} />
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-panel luxury-border rounded-[42px] p-10">
            <div className="mb-8 flex items-center justify-between gap-5">
              <div>
                <p className="gold-text text-sm uppercase tracking-[0.25em]">
                  Operator Rankings
                </p>

                <h2 className="mt-3 text-5xl font-black tracking-[-0.06em]">
                  Outcome-based leaderboard
                </h2>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/10">
              <table className="w-full text-left">
                <thead className="bg-white/10 text-xs uppercase tracking-[0.2em] text-white/45">
                  <tr>
                    <th className="px-5 py-4">Operator</th>
                    <th className="px-5 py-4">Score</th>
                    <th className="px-5 py-4">Success</th>
                    <th className="px-5 py-4">Memory</th>
                  </tr>
                </thead>

                <tbody>
                  {performance.operators.length > 0 ? (
                    performance.operators.map((operator) => (
                      <tr
                        key={operator.operator}
                        className="border-t border-white/10 bg-black/15"
                      >
                        <td className="px-5 py-5 font-bold text-white">
                          {operator.operator}
                        </td>
                        <td className="px-5 py-5 text-[#f2d8a8]">
                          {operator.score}
                        </td>
                        <td className="px-5 py-5 text-white/70">
                          {operator.successRate || 0}%
                        </td>
                        <td className="px-5 py-5 text-white/70">
                          {operator.totalMemories}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-white/50"
                      >
                        No ranked operators yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel luxury-border rounded-[42px] p-10">
            <p className="gold-text text-sm uppercase tracking-[0.25em]">
              Recent Learning
            </p>

            <div className="mt-8 grid gap-4">
              {recentLearning.length > 0 ? (
                recentLearning.map((memory) => (
                  <div
                    key={`${memory.operator}-${memory.id}`}
                    className="white-glass rounded-[26px] p-5"
                  >
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <span className="rounded-full border border-[#d6b98c]/25 bg-[#d6b98c]/10 px-3 py-1 text-xs text-[#f2d8a8]">
                        {memory.operator}
                      </span>

                      <span className="text-xs uppercase tracking-[0.2em] text-white/35">
                        Score {memory.outcome_score || 0}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-white">
                      {memory.title || "Untitled Memory"}
                    </h3>

                    <p className="mt-2 text-sm text-white/55">
                      Outcome: {memory.outcome || "unknown"} • Priority:{" "}
                      {memory.priority || "medium"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="white-glass rounded-[26px] p-6 text-white/55">
                  No learning memories yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 glass-panel luxury-border rounded-[42px] p-10">
          <p className="gold-text text-sm uppercase tracking-[0.25em]">
            High Priority Events
          </p>

          <div className="mt-8 grid gap-4 xl:grid-cols-2">
            {highPriorityEvents.length > 0 ? (
              highPriorityEvents.map((event) => (
                <div key={event.id} className="white-glass rounded-[26px] p-6">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <span className="rounded-full bg-black/25 px-3 py-1 text-xs text-white/60">
                      {event.event_type || "event"}
                    </span>

                    <span className="text-xs uppercase tracking-[0.2em] text-[#f2d8a8]">
                      {event.priority}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black tracking-[-0.04em]">
                    {event.title || "Operational Event"}
                  </h3>

                  <p className="soft-text mt-3 text-sm leading-relaxed">
                    {event.description || "No description available."}
                  </p>
                </div>
              ))
            ) : (
              <div className="white-glass rounded-[26px] p-6 text-white/55">
                No high priority events right now.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[28px] border border-white/20 bg-black/25 p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-white/40">
        {label}
      </p>

      <p className="mt-4 text-4xl font-black tracking-[-0.05em]">{value}</p>
    </div>
  );
}