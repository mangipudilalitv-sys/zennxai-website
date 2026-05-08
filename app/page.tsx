export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight">ZennX AI</div>
          <a
            href="mailto:hello@zennxai.com"
            className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/80 hover:bg-white hover:text-black"
          >
            Contact
          </a>
        </nav>

        <div className="flex flex-1 flex-col items-start justify-center">
          <p className="mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            AI Operations Infrastructure
          </p>

          <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
            AI front desk systems for businesses that can’t afford to miss leads.
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-white/70 md:text-xl">
            ZennX AI helps local businesses respond instantly, qualify leads,
            automate follow-ups, and book appointments using AI-powered
            operational workflows.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:hello@zennxai.com"
              className="rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-white/80"
            >
              Book a Demo
            </a>

            <a
              href="#how-it-works"
              className="rounded-full border border-white/20 px-6 py-3 font-medium text-white/80 hover:bg-white/10"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold md:text-5xl">
            Replace repetitive admin work with AI operators.
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-semibold">Instant Lead Response</h3>
              <p className="mt-3 text-white/70">
                AI replies to new inquiries instantly so businesses stop losing
                customers to slow response times.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-semibold">Smart Qualification</h3>
              <p className="mt-3 text-white/70">
                Every lead is analyzed for urgency, service type, and sales
                priority before being routed to the owner.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-semibold">Automated Follow-Up</h3>
              <p className="mt-3 text-white/70">
                The system follows up with prospects automatically through
                email, SMS, and booking links.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
          <h2 className="text-3xl font-bold md:text-5xl">
            Built for contractors, clinics, auto shops, service businesses, and
            local operators.
          </h2>

          <p className="mt-5 max-w-3xl text-white/70">
            ZennX AI is designed for businesses that need faster customer
            response, fewer missed opportunities, and less manual admin work.
          </p>

          <p className="mt-8 text-sm text-white/50">
            By contacting ZennX AI, you agree to receive messages related to
            your inquiry. Message and data rates may apply. Reply STOP to
            unsubscribe.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 text-sm text-white/50 md:flex-row">
          <p>© 2026 ZennX AI. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-white">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-white">
              Terms
            </a>
            <a href="mailto:hello@zennxai.com" className="hover:text-white">
              hello@zennxai.com
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}