import { Bodoni_Moda, Inter } from "next/font/google";
import { supabase } from "@/app/lib/supabase";

const luxurySerif = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sans = Inter({
  subsets: ["latin"],
});

export default async function HealthPage() {
  const { data: leads } = await supabase.from("leads").select("*");
  const { data: tasks } = await supabase.from("tasks").select("*");
  const { data: conversations } = await supabase
    .from("voice_conversations")
    .select("*");
  const { data: memory } = await supabase.from("operator_memory").select("*");

  const totalLeads = leads?.length || 0;
  const totalTasks = tasks?.length || 0;
  const totalCalls = conversations?.length || 0;
  const totalMemory = memory?.length || 0;

  const pendingTasks =
    tasks?.filter((task) => task.status === "pending").length || 0;

  const completedTasks =
    tasks?.filter((task) => task.status === "completed").length || 0;

  const highUrgencyLeads =
    leads?.filter(
      (lead) => lead.urgency === "high" || lead.status === "escalated"
    ).length || 0;

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  const pressurePenalty = Math.min(45, pendingTasks * 0.35);
  const urgencyPenalty = Math.min(25, highUrgencyLeads * 6);

  const healthScore = Math.max(
    1,
    Math.min(100, Math.round(92 - pressurePenalty - urgencyPenalty + completionRate * 0.15))
  );

  const state =
    healthScore >= 75 ? "Operational" : healthScore >= 45 ? "Pressure" : "Critical";

  return (
    <main className={`${sans.className} grid gap-3`}>
      <section className="grid gap-3 xl:grid-cols-[0.58fr_0.95fr]">
        <div className="rounded-[28px] border border-white/8 bg-[#050505] p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#ffd978]">
            Business Health Cortex
          </p>

          <h1
            className={`${luxurySerif.className} mt-7 max-w-[780px] text-[5.5rem] font-[500] leading-[0.84] tracking-[-0.06em] text-[#f8f3ea]`}
          >
            Monitor the operational nervous system.
          </h1>

          <p className="mt-8 max-w-[680px] text-[1.05rem] leading-[1.9] text-[#b8b1a4]">
            Real-time operational intelligence across calls, leads, tasks,
            memory, execution pressure, and business workflow health.
          </p>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {[
              ["Calls", totalCalls],
              ["Leads", totalLeads],
              ["Memory", totalMemory],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-h-[145px] overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.025] p-6"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
                  {label}
                </p>

                <h3
                  className={`${luxurySerif.className} mt-7 max-w-full truncate text-[2.3rem] font-[500] leading-none tracking-[-0.03em] text-[#f8f3ea]`}
                >
                  {value}
                </h3>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/8 bg-[#050505] p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#ffd978]">
                Health Score
              </p>

              <h2
                className={`${luxurySerif.className} mt-5 text-[5rem] font-[500] leading-none text-[#f8f3ea]`}
              >
                {healthScore}
              </h2>
            </div>

            <div className="max-w-[180px] rounded-[10px] border border-[#ffd978]/25 bg-[#ffd978]/8 px-5 py-3 text-center text-[11px] uppercase tracking-[0.22em] text-[#ffd978]">
              {state}
            </div>
          </div>

          <div className="relative mt-10 flex h-[320px] items-center justify-center">
            <div className="absolute h-[290px] w-[290px] border border-[#ffd978]/16" />
            <div className="absolute h-[220px] w-[220px] border border-white/10" />
            <div className="absolute h-[150px] w-[150px] border border-[#ffd978]/18" />
            <div className="absolute h-[120px] w-[120px] rounded-full bg-[#ffd978]/15 blur-[55px]" />

            <div className="relative flex h-[92px] w-[92px] items-center justify-center bg-[#ffd978] text-black shadow-[0_0_90px_rgba(255,217,120,1)]">
              <span
                className={`${luxurySerif.className} text-[2.4rem] font-[500] leading-none`}
              >
                {healthScore}
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              `Calls Captured: ${totalCalls}`,
              `Pending Tasks: ${pendingTasks}`,
              `Completed Tasks: ${completedTasks}`,
              `High Urgency Leads: ${highUrgencyLeads}`,
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-[14px] border border-white/8 bg-white/[0.02] px-5 py-4"
              >
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/62">
                  {item}
                </span>
                <div className="h-2.5 w-2.5 rounded-full bg-[#ffd978]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-4">
        {[
          ["Total Tasks", totalTasks],
          ["Pending", pendingTasks],
          ["Completed", completedTasks],
          ["Completion Rate", `${completionRate}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[24px] border border-white/8 bg-[#050505] p-7"
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
              {label}
            </p>

            <h3
              className={`${luxurySerif.className} mt-6 text-[3rem] font-[500] leading-none text-[#f8f3ea]`}
            >
              {value}
            </h3>
          </div>
        ))}
      </section>
    </main>
  );
}