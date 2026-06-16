"use client";

import { useState } from "react";

const starterQuestions = [
  "What should I focus on today?",
  "What is broken in the business right now?",
  "Which operator is performing best?",
  "What did ZennX learn recently?",
  "Which leads or tasks need attention?",
];

export default function AICommandCenterPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState<any>(null);

  async function askCommandCenter(input?: string) {
    const finalQuestion = String(input || question).trim();

    if (!finalQuestion) return;

    setQuestion(finalQuestion);
    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/command-center", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: finalQuestion,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setAnswer(data.error || "Command Center failed.");
        return;
      }

      setAnswer(data.answer);
      setPack(data.intelligencePack);
    } catch (error) {
      console.error("COMMAND CENTER UI ERROR:", error);
      setAnswer("Command Center request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden px-10 py-8 text-[#fffaf0]">
      <div className="ambient-light left-[8%] top-[0%] h-[460px] w-[460px] bg-[#f2d8a8]/18" />
      <div className="ambient-light bottom-[-12%] right-[8%] h-[520px] w-[520px] bg-white/10" />

      <div className="relative z-10">
        <section className="glass-panel luxury-border rounded-[42px] p-10">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#f2d8a8]/30 bg-[#f2d8a8]/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#f2d8a8]">
            <div className="status-dot" />
            AI Command Center
          </div>

          <h1 className="hero-title max-w-6xl text-7xl font-black">
            Ask ZennX what is happening inside the business.
          </h1>

          <p className="soft-text mt-6 max-w-3xl text-xl leading-relaxed">
            Command Center reads live leads, tasks, operator performance,
            memories, and operational events before answering.
          </p>

          <div className="mt-10 grid gap-4">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask ZennX anything..."
              className="min-h-[150px] w-full rounded-[28px] border border-white/15 bg-black/30 p-6 text-lg text-white outline-none placeholder:text-white/35"
            />

            <button
              onClick={() => askCommandCenter()}
              disabled={loading}
              className="champagne-surface w-fit rounded-2xl px-8 py-4 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? "Thinking..." : "Ask ZennX"}
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {starterQuestions.map((item) => (
              <button
                key={item}
                onClick={() => askCommandCenter(item)}
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/15"
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {answer && (
          <section className="mt-10 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-panel luxury-border rounded-[42px] p-10">
              <p className="gold-text text-sm uppercase tracking-[0.25em]">
                ZennX Response
              </p>

              <div className="soft-text mt-8 whitespace-pre-wrap text-lg leading-relaxed">
                {answer}
              </div>
            </div>

            <div className="glass-panel luxury-border rounded-[42px] p-10">
              <p className="gold-text text-sm uppercase tracking-[0.25em]">
                Live Intelligence Used
              </p>

              <div className="mt-8 grid gap-5">
                <Metric
                  label="Best Operator"
                  value={pack?.bestOperator?.operator || "None yet"}
                />
                <Metric
                  label="Operator Score"
                  value={pack?.bestOperator?.score || 0}
                />
                <Metric
                  label="Active Tasks"
                  value={pack?.activeTasks?.length || 0}
                />
                <Metric
                  label="Recent Memories"
                  value={pack?.recentMemories?.length || 0}
                />
                <Metric
                  label="Operational Score"
                  value={pack?.systemMetrics?.operationalScore ?? "N/A"}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[26px] border border-white/20 bg-black/25 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/40">
        {label}
      </p>

      <p className="mt-3 text-2xl font-black tracking-[-0.04em]">{value}</p>
    </div>
  );
}