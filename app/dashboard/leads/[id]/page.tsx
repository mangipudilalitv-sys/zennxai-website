import { supabase } from "@/app/lib/supabase";
import { revalidatePath } from "next/cache";

const leadStatuses = [
  "voice_captured",
  "contacted",
  "qualified",
  "proposal_sent",
  "closed_won",
  "closed_lost",
];

function formatStatus(value: string | null | undefined) {
  return String(value || "new").replaceAll("_", " ");
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leadId = Number(id);

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError || !lead) {
    return (
      <div className="relative overflow-hidden px-10 py-8 text-[#fffaf0]">
        <div className="glass-panel luxury-border rounded-[42px] p-10">
          <p className="text-sm text-[#f2d8a8]">Lead not found</p>
          <h1 className="mt-3 text-6xl font-black tracking-[-0.06em]">
            No Lead Found
          </h1>
          <p className="soft-text mt-4">No lead exists with ID: {id}</p>
        </div>
      </div>
    );
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("lead_id", leadId)
    .order("id", { ascending: false });

  const { data: memory } = await supabase
    .from("operator_memory")
    .select("*")
    .eq("lead_id", leadId)
    .order("id", { ascending: false });

  const { data: conversations } = await supabase
    .from("voice_conversations")
    .select("*")
    .eq("lead_id", leadId)
    .order("id", { ascending: false });

  async function updateLeadStatus(formData: FormData) {
    "use server";

    const status = String(formData.get("status") || "");
    if (!leadStatuses.includes(status)) return;

    await supabase
      .from("leads")
      .update({
        status,
        follow_up_stage: status,
        last_contacted:
          status === "contacted" ||
          status === "qualified" ||
          status === "proposal_sent"
            ? new Date().toISOString()
            : lead.last_contacted,
      })
      .eq("id", leadId);

    revalidatePath(`/dashboard/leads/${id}`);
    revalidatePath("/dashboard/leads");
  }

  async function completeTask(formData: FormData) {
    "use server";

    const taskId = Number(formData.get("taskId"));
    if (!taskId) return;

    await supabase
      .from("tasks")
      .update({ status: "completed" })
      .eq("id", taskId);

    revalidatePath(`/dashboard/leads/${id}`);
    revalidatePath("/dashboard/tasks");
  }

  return (
    <div className="relative overflow-hidden px-10 py-8 text-[#fffaf0]">
      <div className="ambient-light left-[8%] top-[0%] h-[440px] w-[440px] bg-[#f2d8a8]/18" />
      <div className="ambient-light bottom-[-12%] right-[8%] h-[520px] w-[520px] bg-white/10" />

      <div className="relative z-10">
        <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel luxury-border rounded-[42px] p-10">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#f2d8a8]/30 bg-[#f2d8a8]/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#f2d8a8]">
              <div className="status-dot" />
              Lead Intelligence Dossier
            </div>

            <h1 className="hero-title max-w-5xl text-7xl font-black">
              {lead.business_name || "Unknown Business"}
            </h1>

            <p className="soft-text mt-8 max-w-3xl text-xl leading-relaxed">
              {lead.full_name || "Unknown Name"} • {lead.email || "No email"} •{" "}
              {lead.phone || "No phone"}
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <div className="white-glass min-h-[150px] rounded-3xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                  Status
                </p>
                <h2 className="mt-5 text-2xl font-black capitalize leading-tight">
                  {formatStatus(lead.status)}
                </h2>
              </div>

              <div className="white-glass min-h-[150px] rounded-3xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                  Urgency
                </p>
                <h2 className="mt-5 text-2xl font-black capitalize leading-tight">
                  {lead.urgency || "unknown"}
                </h2>
              </div>

              <div className="champagne-surface min-h-[150px] rounded-3xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">
                  Linked Systems
                </p>
                <h2 className="mt-5 text-2xl font-black leading-tight">
                  {(tasks?.length || 0) + (memory?.length || 0)} records
                </h2>
              </div>
            </div>
          </div>

          <div className="glass-panel luxury-border rounded-[42px] p-10">
            <p className="gold-text text-sm uppercase tracking-[0.25em]">
              Operational State
            </p>

            <div className="mt-8 grid gap-4">
              <div className="white-glass rounded-3xl p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                  Appointment
                </p>
                <p className="mt-3 text-2xl font-black">
                  {lead.appointment_status || "pending"}
                </p>
              </div>

              <div className="white-glass rounded-3xl p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                  Follow-Up Stage
                </p>
                <p className="mt-3 text-2xl font-black capitalize">
                  {formatStatus(lead.follow_up_stage || "initial")}
                </p>
              </div>

              <div className="white-glass rounded-3xl p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                  Last Contacted
                </p>
                <p className="mt-3 text-2xl font-black">
                  {lead.last_contacted
                    ? new Date(lead.last_contacted).toLocaleDateString()
                    : "not yet"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel luxury-border rounded-[42px] p-10">
            <p className="gold-text text-sm uppercase tracking-[0.25em]">
              Customer Request
            </p>

            <p className="mt-6 text-2xl leading-relaxed text-white/82">
              {lead.service_requested || "No request stored."}
            </p>
          </div>

          <div className="champagne-surface rounded-[42px] p-10">
            <p className="text-sm uppercase tracking-[0.25em] text-white/55">
              AI Operational Analysis
            </p>

            <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-white/75">
              {lead.ai_summary || "No AI analysis yet."}
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="gold-text text-sm uppercase tracking-[0.25em]">
                Pipeline Control
              </p>
              <h2 className="mt-3 text-6xl font-black tracking-[-0.06em]">
                Lead lifecycle
              </h2>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-6">
            {leadStatuses.map((status) => (
              <form key={status} action={updateLeadStatus}>
                <input type="hidden" name="status" value={status} />
                <button
                  className={`w-full rounded-3xl px-5 py-5 text-xs font-black uppercase tracking-[0.16em] transition hover:scale-[1.02] ${
                    lead.status === status
                      ? "champagne-surface text-white"
                      : "white-glass text-white/70"
                  }`}
                >
                  {formatStatus(status)}
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-8">
              <p className="gold-text text-sm uppercase tracking-[0.25em]">
                AI Execution Layer
              </p>

              <h2 className="mt-3 text-6xl font-black tracking-[-0.06em]">
                Operator tasks
              </h2>
            </div>

            <div className="grid gap-6">
              {tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="white-glass relative overflow-hidden rounded-[34px] p-8"
                  >
                    <div className="absolute right-[-10%] top-[-10%] h-[220px] w-[220px] rounded-full bg-[#d6b98c]/12 blur-[90px]" />

                    <div className="relative z-10">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                            {task.assigned_agent || "ZennX AI"}
                          </p>

                          <h3 className="mt-3 text-4xl font-black tracking-[-0.05em]">
                            {task.task_title || task.task || "Untitled Task"}
                          </h3>
                        </div>

                        <span className="rounded-full bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                          {task.priority || "normal"}
                        </span>
                      </div>

                      <p className="soft-text whitespace-pre-wrap text-base leading-relaxed">
                        {task.task_description || "No description."}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        <span className="rounded-full bg-black/25 px-3 py-1 text-xs text-white/55">
                          Due: {task.due_time || "ASAP"}
                        </span>
                        <span className="rounded-full bg-black/25 px-3 py-1 text-xs text-white/55">
                          {task.status || "pending"}
                        </span>
                      </div>

                      {task.status !== "completed" ? (
                        <form action={completeTask}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button className="champagne-surface mt-7 rounded-2xl px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02]">
                            Mark Complete
                          </button>
                        </form>
                      ) : (
                        <p className="mt-7 rounded-2xl bg-black/25 px-5 py-3 text-sm font-black text-[#f2d8a8]">
                          Completed
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="white-glass rounded-[34px] p-8 text-white/55">
                  No tasks linked to this lead yet.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-8">
              <p className="gold-text text-sm uppercase tracking-[0.25em]">
                Voice Intelligence Memory
              </p>

              <h2 className="mt-3 text-6xl font-black tracking-[-0.06em]">
                Intelligence archive
              </h2>
            </div>

            <div className="grid gap-6">
              {memory && memory.length > 0 ? (
                memory.map((item) => (
                  <div
                    key={item.id}
                    className="glass-panel luxury-border rounded-[34px] p-7"
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                      {formatStatus(item.memory_type)} #{item.id}
                    </p>

                    <h3 className="mt-3 text-2xl font-black text-white/90">
                      {item.title || "Untitled Memory"}
                    </h3>

                    <p className="soft-text mt-5 whitespace-pre-wrap text-sm leading-relaxed">
                      {item.content || item.workflow_notes || "No memory content."}
                    </p>
                  </div>
                ))
              ) : (
                <div className="white-glass rounded-[34px] p-8 text-white/55">
                  No voice memory linked to this lead yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-8">
            <p className="gold-text text-sm uppercase tracking-[0.25em]">
              Voice Conversation Records
            </p>

            <h2 className="mt-3 text-6xl font-black tracking-[-0.06em]">
              Call transcript history
            </h2>
          </div>

          <div className="grid gap-6">
            {conversations && conversations.length > 0 ? (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="glass-panel luxury-border rounded-[34px] p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                        Call #{conversation.id}
                      </p>

                      <h3 className="mt-3 text-3xl font-black">
                        {conversation.caller_name || "Unknown Caller"} from{" "}
                        {conversation.company_name || "Unknown Company"}
                      </h3>
                    </div>

                    <span className="rounded-full border border-[#f2d8a8]/25 bg-[#f2d8a8]/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#f2d8a8]">
                      {conversation.urgency || "medium"}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-black/20 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                        Intent
                      </p>
                      <p className="mt-3 text-white/75">
                        {conversation.intent || "No intent stored."}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black/20 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                        Call SID
                      </p>
                      <p className="mt-3 text-white/75">
                        {conversation.call_sid || "No call sid."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Transcript
                    </p>
                    <p className="mt-4 whitespace-pre-wrap text-white/70">
                      {conversation.transcript || "No transcript stored."}
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Summary
                    </p>
                    <p className="mt-4 whitespace-pre-wrap text-white/70">
                      {conversation.summary || "No summary stored."}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="white-glass rounded-[34px] p-8 text-white/55">
                No voice conversations linked to this lead yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}