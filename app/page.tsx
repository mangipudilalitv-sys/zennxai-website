import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";

const luxurySerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020202] text-[#fff5df]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,217,138,0.16),transparent_40%)]" />

      <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[#ffd98a]/10 blur-[140px]" />

      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-[#ffd98a]/5 blur-[160px]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col justify-center px-6 py-12">
        <div className="grid items-center gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-white/10 bg-[#050505]/90 p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] backdrop-blur-xl xl:p-14">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#ffd98a]/30 bg-[#ffd98a]/5 px-5 py-2">
              <div className="h-2 w-2 rounded-full bg-[#ffd98a]" />

              <span className="text-xs uppercase tracking-[0.35em] text-[#ffd98a]">
                ZennX Sovereign Command
              </span>
            </div>

            <h1
              className={`${luxurySerif.className} mt-10 text-[5.5rem] font-bold leading-[0.85] tracking-[-0.06em] xl:text-[7rem]`}
            >
              Universal
              <br />
              Operational
              <br />
              Intelligence
              <span className="text-[#ffd98a]">.</span>
            </h1>

            <p className="mt-10 max-w-[700px] text-lg leading-[1.9] text-white/60">
              Autonomous infrastructure for companies. Memory,
              execution chains, operator routing, health monitoring,
              AI workforce coordination, and real-time operational
              intelligence in one sovereign system.
            </p>

            <div className="mt-12 flex flex-wrap gap-5">
              <Link
                href="/dashboard"
                className="rounded-[16px] border border-[#ffd98a]/40 bg-[#ffd98a] px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:scale-[1.02]"
              >
                Enter Command Core
              </Link>

              <button className="rounded-[16px] border border-white/10 bg-white/[0.03] px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white/75 transition hover:border-[#ffd98a]/30 hover:text-[#ffd98a]">
                Run System Scan
              </button>
            </div>

            <div className="mt-16 grid gap-4 xl:grid-cols-3">
              {[
                ["Lead Network", "14"],
                ["High Risk", "1"],
                ["Active Tasks", "6"],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className={`rounded-[20px] border p-6 ${
                    index === 2
                      ? "border-[#ffd98a]/30 bg-[#ffd98a]/10"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                    {label}
                  </p>

                  <h3
                    className={`${luxurySerif.className} mt-6 text-[3.2rem] font-bold leading-none`}
                  >
                    {value}
                  </h3>

                  <div className="mt-6 h-px w-full bg-white/10" />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[#050505]/90 p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#ffd98a]">
                  Core Engine
                </p>

                <h2
                  className={`${luxurySerif.className} mt-4 text-[4rem] font-bold leading-none`}
                >
                  Sovereign AI
                </h2>
              </div>

              <div className="rounded-[12px] border border-[#ffd98a]/30 bg-[#ffd98a]/10 px-5 py-3 text-xs uppercase tracking-[0.25em] text-[#ffd98a]">
                Active
              </div>
            </div>

            <div className="relative mt-12 flex h-[420px] items-center justify-center overflow-hidden rounded-[28px] border border-white/5 bg-[#070707]">
              <div className="absolute h-[340px] w-[340px] rounded-full border border-[#ffd98a]/15" />

              <div className="absolute h-[260px] w-[260px] rounded-full border border-[#ffd98a]/12" />

              <div className="absolute h-[180px] w-[180px] rounded-full border border-white/10" />

              <div className="absolute h-[100px] w-[100px] rounded-full bg-[#ffd98a]/20 blur-[40px]" />

              <div className="relative flex h-[90px] w-[90px] items-center justify-center rounded-full bg-[#ffd98a] shadow-[0_0_70px_rgba(255,217,138,0.9)]">
                <div className="h-4 w-4 rounded-full bg-white" />
              </div>

              <div className="absolute left-[18%] top-[28%] h-4 w-4 rounded-full bg-white shadow-[0_0_25px_rgba(255,255,255,0.9)]" />

              <div className="absolute right-[20%] top-[22%] h-5 w-5 rounded-full bg-[#ffd98a] shadow-[0_0_30px_rgba(255,217,138,1)]" />

              <div className="absolute bottom-[24%] left-[30%] h-4 w-4 rounded-full bg-[#ffd98a]/80 shadow-[0_0_30px_rgba(255,217,138,0.9)]" />
            </div>

            <div className="mt-10 grid gap-4">
              {[
                "Revenue Intelligence",
                "Operator Handoffs",
                "Execution Chains",
                "Business Health",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-[16px] border border-white/10 bg-white/[0.02] px-6 py-5"
                >
                  <span className="text-sm uppercase tracking-[0.22em] text-white/70">
                    {item}
                  </span>

                  <div className="h-3 w-3 rounded-full bg-[#ffd98a]" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}