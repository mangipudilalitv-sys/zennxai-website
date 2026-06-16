"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteTaskButton({
  taskId,
}: {
  taskId: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function completeTask() {
    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch("/api/complete-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          outcome: "success",
          outcomeScore: 9,
          notes:
            "Task completed from ZennX dashboard. Outcome stored into operator memory.",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        console.error(data.error || "Task completion failed");
      }

      router.refresh();
    } catch (error) {
      console.error("Complete task failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={completeTask}
      disabled={loading}
      className="rounded-[12px] border border-[#ffd978]/25 bg-[#ffd978]/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#ffd978] transition hover:bg-[#ffd978]/10 disabled:opacity-50"
    >
      {loading ? "Saving" : "Complete"}
    </button>
  );
}