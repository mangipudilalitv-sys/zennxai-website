import { Cormorant_Garamond } from "next/font/google";
import { revalidatePath } from "next/cache";
import { supabase } from "@/app/lib/supabase";

const luxurySerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

async function completeTask(formData: FormData) {
  "use server";

  const taskId = Number(formData.get("taskId"));

  if (!taskId) return;

  await supabase
    .from("tasks")
    .update({ status: "completed" })
    .eq("id", taskId);

  revalidatePath("/dashboard/tasks");
}

function MiniGraph() {
  return (
    <svg viewBox="0 0 220 60" className="mt-5 h-[54px] w-full overflow-visible">
      <defs>
        <linearGradient id="goldFade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffd978" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffd978" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d="M0 48 C20 44, 34 36, 52 40 C72 45, 86 20, 106 29 C126 38, 138 48, 160 37 C182 25, 196 28, 220 12"
        fill="none"
        stroke="#ffd978"
        strokeWidth="2.3"
        strokeLinecap="round"
      />

      <path
        d="M0 48 C20 44, 34 36, 52 40 C72 45, 86 20, 106 29 C126 38, 138 48, 160 37 C182 25, 196 28, 220 12 L220 60 L0 60 Z"
        fill="url(#goldFade)"
      />
    </svg>
  );
}

export default async function TasksPage() {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  const totalTasks = tasks?.length || 0;
  const pendingTasks = tasks?.filter((t) => t.status === "pending").length || 0;
  const activeTasks =
    tasks?.filter((t) => t.status === "active" || t.status === "pending").length || 0;
  const completedTasks =
    tasks?.filter((t) => t.status === "completed").length || 0;

  const stats = [
    { label: "EXECUTION LOOPS", value: totalTasks, detail: "Operational workflows" },
    { label: "ACTIVE TASKS", value: activeTasks, detail: "Pending or running" },
    { label: "PENDING", value: pendingTasks, detail: "Awaiting execution" },
    { label: "COMPLETED", value: completedTasks, detail: "Resolved systems" },
  ];

  return (
    <main className="space-y-3">
      <section className="relative overflow-hidden rounded-[28px] border border-[#ffd978]/12 bg-[#050505] px-10 py-10">
        <div className="absolute inset-0 opacity-[0.14]">
          <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,217,120,0.18),transparent_55%)]" />
        </div>

        <div className="relative z-10 max-w-[950px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#ffd978]">
            Autonomous Execution Layer
          </p>

          <h1
            className={`${luxurySerif.className} mt-6 text-[6rem] leading-[0.82] tracking-[-0.06em] text-[#f8f3ea]`}
          >
            AI operators executing workflows in real time.
          </h1>

          <p className="mt-8 max-w-[720px] text-[1.05rem] leading-[1.9] text-white/52">
            Universal Operational Intelligence coordinating autonomous execution chains,
            escalation systems, workflow assignment, monitoring, and business process orchestration.
          </p>

          <div className="mt-10 flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-[#ffd978]" />
              <span className="text-[12px] uppercase tracking-[0.28em] text-[#ffe4a3]">
                System Online
              </span>
            </div>

            <span className="text-sm text-[#ffd978]">
              All Execution Systems Operational
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[22px] border border-white/8 bg-[#050505] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/34">
              {stat.label}
            </p>

            <h2 className={`${luxurySerif.className} mt-5 text-[3.1rem] leading-none text-[#f8f3ea]`}>
              {stat.value}
            </h2>

            <p className="mt-3 text-sm text-white/48">{stat.detail}</p>

            <MiniGraph />
          </div>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        {tasks?.map((task) => (
          <div key={task.id} className="rounded-[24px] border border-white/8 bg-[#050505] p-7">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#ffd978]">
                  Execution Object
                </p>

                <h2
                  className={`${luxurySerif.className} mt-4 text-[3rem] leading-[0.92] tracking-[-0.05em] text-[#f8f3ea]`}
                >
                  {task.task_title || "Operational Workflow"}
                </h2>
              </div>

              <div className="rounded-[12px] border border-[#ffd978]/20 bg-[#ffd978]/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd978]">
                {task.priority || "medium"}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/32">
                  Company
                </p>

                <p className="mt-3 text-lg font-medium text-white/84">
                  {task.company_name || "ZennX System"}
                </p>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/32">
                  Status
                </p>

                <p className="mt-3 text-lg capitalize text-white/84">
                  {task.status || "pending"}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-white/8 bg-white/[0.02] p-5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/32">
                Operational Description
              </p>

              <p className="mt-4 text-sm leading-[1.9] text-white/54">
                {task.task_description || "No operational description stored."}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5">
              <span className="text-sm text-white/42">
                Assigned to {task.assigned_agent || "ZennX AI"}
              </span>

              {task.status !== "completed" ? (
                <form action={completeTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button className="rounded-full border border-[#ffd978]/25 bg-[#ffd978]/10 px-5 py-2 text-sm font-semibold text-[#ffd978] hover:bg-[#ffd978]/20">
                    Mark Complete
                  </button>
                </form>
              ) : (
                <span className="text-sm text-[#ffd978]">Completed</span>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}