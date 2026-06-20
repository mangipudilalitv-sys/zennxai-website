import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabase } from "@/app/lib/supabase";

const leadStatuses = [
  "voice_captured",
  "contacted",
  "qualified",
  "proposal_sent",
  "closed_won",
  "closed_lost",
];

async function updateLeadStatus(formData: FormData) {
  "use server";

  const leadId = Number(formData.get("leadId"));
  const status = String(formData.get("status") || "");

  if (!leadId || !leadStatuses.includes(status)) return;

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
          : undefined,
    })
    .eq("id", leadId);

  revalidatePath("/dashboard/leads");
}

export default async function LeadsPage() {
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("id", { ascending: false });

  const totalLeads = leads?.length || 0;
  const activeLeads =
    leads?.filter(
      (lead) => lead.status !== "closed_won" && lead.status !== "closed_lost"
    ).length || 0;

  return (
    <div className="relative overflow-hidden px-10 py-8 text-[#fffaf0]">
      <div className="ambient-light left-[10%] top-[0%] h-[420px] w-[420px] bg-[#f2d8a8]/18" />
      <div className="ambient-light bottom-[-12%] right-[8%] h-[520px] w-[520px] bg-white/10" />

      <div className="relative z-10">
        <section className="glass-panel luxury-border rounded-[42px] p-10">
          <div className="flex flex-col gap-10 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#f2d8a8]/30 bg-[#f2d8a8]/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#f2d8a8]">
                <div className="status-dot" />
                Lead Intelligence Network
              </div>

              <h1 className="hero-title max-w-5xl text-7xl font-black">
                Operational opportunities monitored in real time.
              </h1>

              <p className="soft-text mt-8 max-w-3xl text-xl leading-relaxed">
                AI-analyzed leads, autonomous routing, escalation workflows,
                revenue opportunities, and operational coordination.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="white-glass rounded-3xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                  Total Leads
                </p>

                <h2 className="mt-4 text-5xl font-black">{totalLeads}</h2>
              </div>

              <div className="champagne-surface rounded-3xl p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">
                  Active Leads
                </p>

                <h2 className="mt-4 text-5xl font-black">{activeLeads}</h2>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="gold-text text-sm uppercase tracking-[0.25em]">
                Live Operational Feed
              </p>

              <h2 className="mt-3 text-6xl font-black tracking-[-0.06em]">
                Active intelligence dossiers
              </h2>
            </div>

            <div className="white-glass rounded-2xl px-5 py-3 text-sm text-white/70">
              {totalLeads} monitored entities
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {leads?.map((lead) => (
              <div
                key={lead.id}
                className="white-glass group relative overflow-hidden rounded-[36px] p-8 transition duration-300 hover:scale-[1.01]"
              >
                <div className="absolute right-[-10%] top-[-10%] h-[240px] w-[240px] rounded-full bg-[#d6b98c]/12 blur-[100px] opacity-0 transition duration-500 group-hover:opacity-100" />

                <div className="relative z-10">
                  <div className="mb-6 flex items-start justify-between gap-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                        Operational Entity
                      </p>

                      <h2 className="mt-3 text-4xl font-black tracking-[-0.05em]">
                        {lead.business_name || "Unknown Business"}
                      </h2>
                    </div>

                    <div className="rounded-full border border-[#f2d8a8]/25 bg-[#f2d8a8]/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#f2d8a8]">
                      {lead.status || "active"}
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="rounded-2xl bg-black/20 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                        Contact
                      </p>

                      <p className="mt-3 text-lg font-semibold text-white/88">
                        {lead.full_name || "Unknown Name"}
                      </p>

                      <p className="mt-2 text-sm text-white/55">
                        {lead.email || "No Email"}
                      </p>

                      <p className="mt-1 text-sm text-white/55">
                        {lead.phone || "No Phone"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black/20 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                        AI Metrics
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-white/55">Urgency</span>
                        <span className="font-semibold capitalize text-white/85">
                          {lead.urgency || "unknown"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-white/55">Lead Score</span>
                        <span className="font-semibold text-white/85">
                          {lead.lead_score || "N/A"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-white/55">Follow-up</span>
                        <span className="font-semibold text-white/85">
                          {lead.follow_up_stage || "initial"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                      Customer Request
                    </p>

                    <p className="mt-4 text-base leading-relaxed text-white/75">
                      {lead.service_requested ||
                        "No operational request stored."}
                    </p>
                  </div>

                  <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                      AI Summary
                    </p>

                    <p className="mt-4 line-clamp-4 text-base leading-relaxed text-white/68">
                      {lead.ai_summary || "No AI intelligence generated yet."}
                    </p>
                  </div>

                  <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                      Pipeline Control
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {leadStatuses.map((status) => (
                        <form key={status} action={updateLeadStatus}>
                          <input type="hidden" name="leadId" value={lead.id} />
                          <input type="hidden" name="status" value={status} />
                          <button
                            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.16em] transition ${
                              lead.status === status
                                ? "border-[#f2d8a8] bg-[#f2d8a8]/20 text-[#f2d8a8]"
                                : "border-white/10 bg-white/5 text-white/45 hover:border-[#f2d8a8]/35 hover:text-[#f2d8a8]"
                            }`}
                          >
                            {status.replaceAll("_", " ")}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="status-dot" />

                      <p className="text-sm text-white/55">
                        Live operational monitoring active
                      </p>
                    </div>

                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/55 hover:bg-white/15"
                    >
                      View Dossier
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}