import { Bodoni_Moda, Inter } from "next/font/google";
import { supabase } from "@/app/lib/supabase";

const luxurySerif = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sans = Inter({
  subsets: ["latin"],
});

export default async function MemoryPage() {
  const { data: memory } = await supabase
    .from("operator_memory")
    .select("*")
    .order("created_at", { ascending: false });

  const totalMemory = memory?.length || 0;

  return (
    <main className={`${sans.className} grid gap-3`}>
      <section className="rounded-[28px] border border-white/8 bg-[#050505] p-10">
        <div className="flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#ffd978]">
              Persistent Intelligence Memory
            </p>

            <h1
              className={`${luxurySerif.className} mt-7 max-w-[900px] text-[5.2rem] font-[500] leading-[0.84] tracking-[-0.06em] text-[#f8f3ea]`}
            >
              Long-term operational memory infrastructure.
            </h1>

            <p className="mt-8 max-w-[760px] text-[1.05rem] leading-[1.9] text-[#b8b1a4]">
              Voice conversations, lead intelligence, workflow context, and
              persistent operator memory retained for future automation.
            </p>
          </div>

          <div className="grid min-w-[330px] grid-cols-2 gap-3">
            <div className="min-h-[130px] rounded-[22px] border border-white/8 bg-white/[0.04] p-6">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
                Stored Memories
              </p>

              <h3
                className={`${luxurySerif.className} mt-6 text-[2.8rem] font-[500] leading-none text-[#f8f3ea]`}
              >
                {totalMemory}
              </h3>
            </div>

            <div className="min-h-[130px] rounded-[22px] border border-[#ffd978]/25 bg-[#ffd978]/80 p-6 text-black">
              <p className="text-[11px] uppercase tracking-[0.3em] text-black/45">
                Memory State
              </p>

              <h3 className="mt-7 truncate text-[2.15rem] font-black leading-none tracking-[-0.04em]">
                ACTIVE
              </h3>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#ffd978]">
            Intelligence Archive
          </p>

          <h2
            className={`${luxurySerif.className} mt-4 text-[4.2rem] font-[500] leading-none tracking-[-0.05em] text-[#f8f3ea]`}
          >
            Operator memory stream
          </h2>
        </div>

        <div className="rounded-[14px] border border-white/8 bg-white/[0.04] px-5 py-3 text-sm text-white/55">
          {totalMemory} stored memories
        </div>
      </section>

      <section className="grid gap-3">
        {memory?.map((item) => (
          <div
            key={item.id}
            className="rounded-[28px] border border-white/8 bg-[#050505] p-8"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
                  Operational Entity
                </p>

                <h3
                  className={`${luxurySerif.className} mt-4 text-[3.5rem] font-[500] leading-none tracking-[-0.05em] text-[#f8f3ea]`}
                >
                  {item.company_name || item.title || "Stored Memory"}
                </h3>
              </div>

              <div className="rounded-[999px] border border-[#ffd978]/25 bg-[#ffd978]/8 px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-[#ffd978]">
                {item.memory_type || "memory"} #{item.id}
              </div>
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-2">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.02] p-6">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
                  Memory Title
                </p>

                <p className="mt-4 text-base leading-[1.8] text-[#b8b1a4]">
                  {item.title || "Untitled memory"}
                </p>
              </div>

              <div className="rounded-[20px] border border-white/8 bg-white/[0.02] p-6">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
                  Operator Routing
                </p>

                <p className="mt-4 text-base leading-[1.8] text-[#b8b1a4]">
                  {item.assigned_operator || "Workflow Coordination Operator"} ·{" "}
                  {item.priority || "medium"} priority
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.02] p-6">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
                Workflow Intelligence Notes
              </p>

              <p className="mt-4 whitespace-pre-wrap text-base leading-[1.8] text-[#b8b1a4]">
                {item.content ||
                  "Persistent operational intelligence retained for future routing, automation, and business context."}
              </p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}