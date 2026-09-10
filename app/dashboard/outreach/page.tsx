import { Cormorant_Garamond } from "next/font/google";
import { revalidatePath } from "next/cache";

import {
  OutreachRepository,
} from "@/lib/repositories/outreach-repository";

import {
  OutreachService,
} from "@/lib/services/outreach-service";

const luxurySerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const repository =
  new OutreachRepository();

const service =
  new OutreachService(repository);

function requireBusinessId() {
  const businessId = (
    process.env.DEFAULT_BUSINESS_ID || ""
  ).trim();

  if (!businessId) {
    throw new Error(
      "DEFAULT_BUSINESS_ID is not configured.",
    );
  }

  return businessId;
}

async function approveMessage(
  formData: FormData,
) {
  "use server";

  const messageId = String(
    formData.get("messageId") || "",
  ).trim();

  if (!messageId) {
    return;
  }

  const businessId =
    requireBusinessId();

  await service.approveDraft(
    businessId,
    messageId,
    "zennx-dashboard",
  );

  revalidatePath(
    "/dashboard/outreach",
  );
}

async function rejectMessage(
  formData: FormData,
) {
  "use server";

  const messageId = String(
    formData.get("messageId") || "",
  ).trim();

  if (!messageId) {
    return;
  }

  const businessId =
    requireBusinessId();

  await service.rejectDraft(
    businessId,
    messageId,
  );

  revalidatePath(
    "/dashboard/outreach",
  );
}

function formatCreatedAt(
  value: unknown,
) {
  if (!value) {
    return "Unknown";
  }

  const date =
    new Date(String(value));

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Unknown";
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function getContact(
  value: unknown,
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  if (Array.isArray(value)) {
    const first = value[0];

    return first &&
      typeof first === "object"
      ? first as Record<
          string,
          unknown
        >
      : null;
  }

  return value as Record<
    string,
    unknown
  >;
}

export default async function OutreachPage() {
  const businessId =
    requireBusinessId();

  const approvals =
    await repository
      .listPendingApprovals(
        businessId,
      );

  return (
    <main className="space-y-3">
      <section className="relative overflow-hidden rounded-[28px] border border-[#ffd978]/12 bg-[#050505] px-10 py-10">
        <div className="absolute inset-0 opacity-[0.14]">
          <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,217,120,0.18),transparent_55%)]" />
        </div>

        <div className="relative z-10 max-w-[950px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#ffd978]">
            Outreach Control Layer
          </p>

          <h1
            className={`${luxurySerif.className} mt-6 text-[6rem] leading-[0.82] tracking-[-0.06em] text-[#f8f3ea]`}
          >
            Human approval before outreach leaves ZennX.
          </h1>

          <p className="mt-8 max-w-[760px] text-[1.05rem] leading-[1.9] text-white/52">
            Review AI-prepared outreach before it progresses through
            the delivery system. Every pending message remains blocked
            until an explicit approval decision is made.
          </p>

          <div className="mt-10 flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-[#ffd978]" />

              <span className="text-[12px] uppercase tracking-[0.28em] text-[#ffe4a3]">
                Approval Gate Active
              </span>
            </div>

            <span className="text-sm text-[#ffd978]">
              {approvals.length} Pending
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-[#050505] p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/34">
            Pending Approval
          </p>

          <h2
            className={`${luxurySerif.className} mt-5 text-[3.1rem] leading-none text-[#f8f3ea]`}
          >
            {approvals.length}
          </h2>

          <p className="mt-3 text-sm text-white/48">
            Messages requiring review
          </p>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-[#050505] p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/34">
            Approval Policy
          </p>

          <h2
            className={`${luxurySerif.className} mt-5 text-[3.1rem] leading-none text-[#f8f3ea]`}
          >
            Active
          </h2>

          <p className="mt-3 text-sm text-white/48">
            Sending blocked before approval
          </p>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-[#050505] p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/34">
            Control Mode
          </p>

          <h2
            className={`${luxurySerif.className} mt-5 text-[3.1rem] leading-none text-[#f8f3ea]`}
          >
            Human
          </h2>

          <p className="mt-3 text-sm text-white/48">
            Explicit approve or reject
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/8 bg-[#050505] p-8">
        <div className="mb-8 flex items-end justify-between gap-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ffd978]">
              Approval Queue
            </p>

            <h2
              className={`${luxurySerif.className} mt-4 text-[4rem] leading-none tracking-[-0.05em] text-[#f8f3ea]`}
            >
              Pending outreach
            </h2>
          </div>

          <div className="rounded-[12px] border border-[#ffd978]/20 bg-[#ffd978]/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd978]">
            {approvals.length} Waiting
          </div>
        </div>

        {approvals.length === 0 ? (
          <div className="rounded-[24px] border border-white/8 bg-white/[0.02] px-8 py-16 text-center">
            <div className="mx-auto h-3 w-3 rounded-full bg-[#ffd978] shadow-[0_0_22px_rgba(255,217,120,0.8)]" />

            <h3
              className={`${luxurySerif.className} mt-6 text-[3rem] leading-none text-[#f8f3ea]`}
            >
              Approval queue clear.
            </h3>

            <p className="mx-auto mt-4 max-w-[520px] text-sm leading-[1.9] text-white/45">
              No outreach messages currently require human approval.
              New approval-first drafts will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {approvals.map((message) => {
              const contact =
                getContact(
                  message.outreach_contacts,
                );

              const displayName =
                String(
                  contact?.display_name ||
                    "Unknown Contact",
                );

              const organization =
                String(
                  contact?.organization_name ||
                    "No organization",
                );

              const platform =
                String(
                  contact?.platform ||
                    message.channel ||
                    "unknown",
                );

              const handle =
                contact?.handle
                  ? String(
                      contact.handle,
                    )
                  : null;

              return (
                <article
                  key={message.id}
                  className="rounded-[24px] border border-white/8 bg-white/[0.02] p-7"
                >
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#ffd978]">
                        Approval Required
                      </p>

                      <h3
                        className={`${luxurySerif.className} mt-3 text-[3rem] leading-none tracking-[-0.04em] text-[#f8f3ea]`}
                      >
                        {displayName}
                      </h3>

                      <p className="mt-3 text-sm text-white/45">
                        {organization}
                      </p>
                    </div>

                    <div className="rounded-[12px] border border-[#ffd978]/20 bg-[#ffd978]/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd978]">
                      {platform}
                    </div>
                  </div>

                  <div className="mt-7 grid gap-4 md:grid-cols-3">
                    <div className="rounded-[18px] border border-white/8 bg-black/20 p-5">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-white/32">
                        Contact
                      </p>

                      <p className="mt-3 text-base text-white/82">
                        {displayName}
                      </p>

                      {handle ? (
                        <p className="mt-1 text-sm text-white/42">
                          {handle}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-[18px] border border-white/8 bg-black/20 p-5">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-white/32">
                        Channel
                      </p>

                      <p className="mt-3 text-base capitalize text-white/82">
                        {String(
                          message.channel ||
                            platform,
                        )}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-white/8 bg-black/20 p-5">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-white/32">
                        Created
                      </p>

                      <p className="mt-3 text-base text-white/82">
                        {formatCreatedAt(
                          message.created_at,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[20px] border border-white/8 bg-black/20 p-6">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/32">
                      Proposed Message
                    </p>

                    <p className="mt-4 whitespace-pre-wrap text-[15px] leading-[1.9] text-white/68">
                      {String(
                        message.body || "",
                      )}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-6">
                    <span className="text-sm text-white/38">
                      Message remains blocked until approved.
                    </span>

                    <div className="flex flex-wrap gap-3">
                      <form action={rejectMessage}>
                        <input
                          type="hidden"
                          name="messageId"
                          value={message.id}
                        />

                        <button className="rounded-full border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white/55 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white">
                          Reject
                        </button>
                      </form>

                      <form action={approveMessage}>
                        <input
                          type="hidden"
                          name="messageId"
                          value={message.id}
                        />

                        <button className="rounded-full border border-[#ffd978]/30 bg-[#ffd978]/12 px-6 py-3 text-sm font-semibold text-[#ffd978] transition hover:bg-[#ffd978]/20">
                          Approve
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
