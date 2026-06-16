import Link from "next/link";
import AutonomousRunner from "./components/AutonomousRunner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nav = [
    ["⌖", "Command Core", "/dashboard"],
    ["♙", "Lead Network", "/dashboard/leads"],
    ["⇱", "AI Tasks", "/dashboard/tasks"],
    ["◇", "Company Memory", "/dashboard/memory"],
    ["⌁", "Health Monitor", "/dashboard/health"],
    ["⟳", "Autonomous Loop", "/dashboard/autonomous"],
    ["⌬", "AI Operator", "/dashboard/chat"],
  ];

  return (
    <div className="min-h-screen bg-[#020202] p-3 text-[#fff5df]">
      <AutonomousRunner />

      <div className="grid min-h-[calc(100vh-24px)] gap-3 xl:grid-cols-[300px_1fr]">
        <aside className="sticky top-3 h-[calc(100vh-24px)] overflow-y-auto rounded-[22px] border border-white/10 bg-[#050505] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[16px] border border-[#ffd98a]/50 bg-[#ffd98a]/10">
              <div className="h-4 w-4 rounded-full bg-[#ffd98a] shadow-[0_0_32px_rgba(255,217,138,1)]" />
            </div>

            <div>
              <h2 className="text-[2rem] font-black tracking-[-0.05em]">
                ZennX
              </h2>
              <p className="text-sm text-[#ffd98a]">
                Operational Intelligence
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[18px] border border-white/10 bg-[#090909] p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              System Status
            </p>

            <div className="mt-7 flex items-center gap-4">
              <div className="h-3 w-3 rounded-full bg-[#ffd98a]" />
              <p className="text-base font-bold leading-relaxed">
                Autonomous Workforce
                <br />
                Active
              </p>
            </div>

            <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[92%] rounded-full bg-[#ffd98a]" />
            </div>

            <div className="mt-4 flex justify-between text-[11px] text-white/40">
              <span>92% Operational</span>
              <span>Systems Online</span>
            </div>
          </div>

          <nav className="mt-7 grid gap-2">
            {nav.map(([icon, label, href]) => (
              <Link
                key={label}
                href={href}
                className="flex items-center justify-between rounded-[13px] border border-white/10 bg-white/[0.02] px-5 py-[15px] text-sm text-white/70 transition hover:border-[#ffd98a]/50 hover:bg-[#ffd98a]/10 hover:text-white"
              >
                <span className="flex items-center gap-4">
                  <span className="text-[#ffd98a]/85">{icon}</span>
                  {label}
                </span>

                <span className="h-2 w-2 rounded-full bg-white/35" />
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-[18px] border border-white/10 bg-[#070707] p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Current Layer
            </p>

            <h3 className="mt-6 text-[2.4rem] font-semibold leading-[0.94] tracking-[-0.04em]">
              Multi-Agent
              <br />
              Operations
            </h3>

            <p className="mt-5 text-sm leading-relaxed text-white/55">
              Universal Operational Intelligence Active
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}