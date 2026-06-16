"use client";

import { useEffect, useState } from "react";

type OperationalEvent = {
  id: number;
  event_type: string | null;
  title: string | null;
  description: string | null;
  priority: string | null;
  source: string | null;
  created_at: string | null;
};

export default function OperationalFeed() {
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    try {
      const res = await fetch("/api/operational-events", {
        cache: "no-store",
      });

      const data = await res.json();

      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to load operational events:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();

    const interval = setInterval(loadEvents, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="rounded-[28px] border border-white/8 bg-[#050505] p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ffd978]">
            Live Operational Feed
          </p>

          <h2 className="mt-4 text-[3.8rem] font-black leading-none tracking-[-0.06em] text-[#f8f3ea]">
            Autonomous intelligence events
          </h2>
        </div>

        <div className="rounded-[999px] border border-[#ffd978]/25 bg-[#ffd978]/5 px-5 py-3 text-xs uppercase tracking-[0.24em] text-[#ffd978]">
          {loading ? "Syncing" : "Live"}
        </div>
      </div>

      <div className="grid gap-4">
        {events.length > 0 ? (
          events.map((event) => (
            <div
              key={event.id}
              className="rounded-[20px] border border-white/8 bg-white/[0.025] p-6 transition hover:border-[#ffd978]/25 hover:bg-[#ffd978]/[0.035]"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/35">
                    {event.event_type || "system_event"} ·{" "}
                    {event.source || "zennx"}
                  </p>

                  <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#f8f3ea]">
                    {event.title || "Operational event"}
                  </h3>

                  <p className="mt-3 max-w-[900px] text-sm leading-7 text-[#b8b1a4]">
                    {event.description || "No description available."}
                  </p>

                  <p className="mt-4 text-xs uppercase tracking-[0.22em] text-white/30">
                    {event.created_at
                      ? new Date(event.created_at).toLocaleString()
                      : "recent"}
                  </p>
                </div>

                <span className="rounded-[999px] border border-[#ffd978]/20 bg-[#ffd978]/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#ffd978]">
                  {event.priority || "medium"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] border border-white/8 bg-white/[0.025] p-6 text-[#b8b1a4]">
            No operational events yet. The autonomous loop will populate this
            as it detects risks and creates interventions.
          </div>
        )}
      </div>
    </section>
  );
}