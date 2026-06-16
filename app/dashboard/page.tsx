import { Bodoni_Moda, Inter } from "next/font/google";

import { getSystemSnapshot } from "@/app/lib/operator-system";

import OperationalFeed from "./components/OperationalFeed";

import {
  PremiumHealthGraph,
  PremiumMiniGraph,
  PremiumOrbit,
} from "./components/PremiumVisuals";

const luxurySerif = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sans = Inter({
  subsets: ["latin"],
});

export default async function DashboardPage() {
  const snapshot = await getSystemSnapshot();

  const {
    totalLeads,
    totalTasks,
    highRiskLeads,
    pendingTasks,
    activeTasks,
    operationalScore,
    memoryNodes,
  } = snapshot.metrics;

  const revenueAtRisk = highRiskLeads * 1200;
  const followUpDecay = Math.min(highRiskLeads * 3 + pendingTasks * 2, 24);

  const stats = [
    ["Lead Network", totalLeads, "Tracked opportunities"],
    ["High Risk Leads", highRiskLeads, "Requires action"],
    ["Active Tasks", activeTasks || totalTasks, "Across workflows"],
    ["Revenue At Risk", `$${revenueAtRisk}`, "Needs intervention"],
    ["Follow-Up Decay", `${followUpDecay}%`, "At risk of loss"],
  ];

  const pressurePoints = [
    highRiskLeads > 0
      ? `${highRiskLeads} high-risk lead${highRiskLeads === 1 ? "" : "s"} require intervention`
      : "No high-risk lead pressure detected",
    pendingTasks > 0
      ? `${pendingTasks} pending operational task${pendingTasks === 1 ? "" : "s"} awaiting execution`
      : "Execution queue stable",
    revenueAtRisk > 0
      ? `$${revenueAtRisk} estimated revenue exposure`
      : "Revenue exposure contained",
  ];

  return (
    <main className={`${sans.className} grid gap-3`}>
      <section className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-white/8 bg-[#050505] p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#ffd978]">
            Command Core
          </p>

          <h1
            className={`${luxurySerif.className} mt-7 max-w-[780px] text-[6.2rem] font-[500] leading-[0.82] tracking-[-0.065em] text-[#f8f3ea]`}
          >
            Universal Operational Intelligence.
          </h1>

          <p className="mt-8 max-w-[650px] text-[1.05rem] leading-[1.95] text-[#b8b1a4]">
            Real-time command center for your autonomous operational
            infrastructure. Every lead. Every task. Every memory node. Every
            execution path. Unified into one intelligence layer.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-[#ffd978] shadow-[0_0_22px_rgba(255,217,120,1)]" />

              <span className="text-[12px] uppercase tracking-[0.28em] text-[#ffe4a3]">
                System Online
              </span>
            </div>

            <span className="text-sm text-[#ffd978]">
              {operationalScore >= 80
                ? "All Systems Operational"
                : operationalScore >= 60
                  ? "Operational Pressure Detected"
                  : "Critical Intervention Required"}
            </span>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_240px]">
          <PremiumOrbit />

          <div className="rounded-[28px] border border-white/8 bg-[#050505] p-7">
            {[
              ["Operators Online", totalLeads, "Active right now"],
              ["Execution Loops", totalTasks, "Running"],
              ["System Health", `${operationalScore}%`, "Operational"],
              ["Memory Nodes", memoryNodes, "Intelligence synced"],
            ].map(([label, value, detail]) => (
              <div key={label} className="mb-10 last:mb-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#ffd978]">
                  {label}
                </p>

                <h3
                  className={`${luxurySerif.className} mt-2 text-[2.7rem] leading-none text-[#f8f3ea]`}
                >
                  {value}
                </h3>

                <p className="mt-2 text-sm text-[#9f988c]">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-5">
        {stats.map(([label, value, detail]) => (
          <div
            key={label}
            className="rounded-[22px] border border-white/8 bg-[#050505] p-6"
          >
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/32">
              {label}
            </p>

            <h3
              className={`${luxurySerif.className} mt-5 text-[3rem] leading-none text-[#f8f3ea]`}
            >
              {value}
            </h3>

            <p className="mt-3 text-sm text-[#9f988c]">{detail}</p>

            <PremiumMiniGraph />
          </div>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-white/8 bg-[#050505] p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ffd978]">
                Operational Health Score
              </p>

              <h2
                className={`${luxurySerif.className} mt-8 text-[6rem] leading-none text-[#f8f3ea]`}
              >
                {operationalScore}%
              </h2>

              <p className="mt-4 text-[1.25rem] text-[#b8b1a4]">
                {operationalScore >= 80
                  ? "Optimal Performance"
                  : operationalScore >= 60
                    ? "Operational Watch"
                    : "Critical Pressure"}
              </p>
            </div>

            <div className="rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/60">
              Live
            </div>
          </div>

          <PremiumHealthGraph />
        </div>

        <div className="rounded-[28px] border border-white/8 bg-[#050505] p-8">
          <div className="mb-8 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ffd978]">
              System Threats & Pressure Points
            </p>

            <button className="rounded-[12px] border border-[#ffd978]/25 bg-[#ffd978]/5 px-5 py-3 text-sm text-[#ffd978]">
              View All
            </button>
          </div>

          <div className="grid gap-6">
            {pressurePoints.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between border-b border-white/8 pb-5"
              >
                <div className="flex items-center gap-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ffd978]" />

                  <p className="text-[#b8b1a4]">{item}</p>
                </div>

                <span className="text-white/35">›</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <OperationalFeed />
    </main>
  );
}