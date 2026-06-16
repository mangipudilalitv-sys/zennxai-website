"use client";

export default function LeadActions({ leadId }: { leadId: number }) {
  const updateStatus = async (status: string) => {
    await fetch("/api/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lead_id: leadId,
        status,
      }),
    });

    window.location.reload();
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        onClick={() => updateStatus("contacted")}
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/80"
      >
        Mark Contacted
      </button>

      <button
        onClick={() => updateStatus("scheduled")}
        className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
      >
        Schedule Demo
      </button>

      <button
        onClick={() => updateStatus("follow_up_sent")}
        className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
      >
        Send Follow-Up
      </button>
    </div>
  );
}