import { NextResponse } from "next/server";
import { isAuthorizedInternalRequest } from "@/app/lib/internal-api-auth";
import { supabaseServer as supabase } from "@/app/lib/supabase-server";
import { getOperatorPerformance } from "@/app/lib/operator-system";

function normalize(value: unknown) {
  return String(value || "").toLowerCase();
}

function safeOutcome(value: unknown) {
  const outcome = normalize(value);

  if (
    outcome === "success" ||
    outcome === "completed" ||
    outcome === "recovered" ||
    outcome === "booked" ||
    outcome === "failed" ||
    outcome === "lost" ||
    outcome === "stalled" ||
    outcome === "needs_review"
  ) {
    return outcome;
  }

  return "completed";
}

function scoreOutcome(outcome: string, manualScore?: number) {
  if (typeof manualScore === "number" && !Number.isNaN(manualScore)) {
    return Math.max(0, Math.min(10, manualScore));
  }

  if (outcome === "success") return 9;
  if (outcome === "recovered") return 9;
  if (outcome === "booked") return 8.5;
  if (outcome === "completed") return 7;
  if (outcome === "needs_review") return 4;
  if (outcome === "stalled") return 3;
  if (outcome === "failed") return 2;
  if (outcome === "lost") return 1;

  return 5;
}

function leadStatusFromOutcome(outcome: string) {
  if (
    outcome === "success" ||
    outcome === "completed" ||
    outcome === "recovered" ||
    outcome === "booked"
  ) {
    return "progressing";
  }

  if (outcome === "needs_review" || outcome === "stalled") {
    return "needs_review";
  }

  if (outcome === "failed" || outcome === "lost") {
    return "at_risk";
  }

  return "progressing";
}

export async function POST(req: Request) {
  try {
    if (!isAuthorizedInternalRequest(req)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }
    const body = await req.json();

    const taskId = Number(body.taskId);
    const leadId = body.leadId ? Number(body.leadId) : null;
    const rawOutcome = safeOutcome(body.outcome);
    const outcomeScore = scoreOutcome(rawOutcome, Number(body.outcomeScore));
    const notes =
      body.notes ||
      "Outcome recorded by ZennX Outcome Intelligence Layer.";
    const revenueImpact = Number(body.revenueImpact || 0);
    const nextRecommendedAction =
      body.nextRecommendedAction ||
      "Review outcome and determine next operational move.";

    if (!taskId && !leadId) {
      return NextResponse.json(
        {
          success: false,
          error: "taskId or leadId is required",
        },
        { status: 400 }
      );
    }

    let task: any = null;
    let lead: any = null;

    if (taskId) {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();

      task = data;
    }

    const resolvedLeadId = leadId || task?.lead_id || null;

    if (resolvedLeadId) {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("id", resolvedLeadId)
        .maybeSingle();

      lead = data;
    }

    if (taskId && !task) {
      return NextResponse.json(
        {
          success: false,
          error: "Task not found",
        },
        { status: 404 }
      );
    }

    if (task) {
      await supabase
        .from("tasks")
        .update({
          status:
            rawOutcome === "failed" ||
            rawOutcome === "lost" ||
            rawOutcome === "stalled"
              ? "needs_review"
              : "completed",
          result: rawOutcome,
        })
        .eq("id", task.id);
    }

    if (lead) {
      await supabase
        .from("leads")
        .update({
          status: leadStatusFromOutcome(rawOutcome),
        })
        .eq("id", lead.id);
    }

    const companyName =
      task?.company_name ||
      lead?.business_name ||
      lead?.company_name ||
      "Unknown Business";

    const assignedOperator =
      task?.assigned_agent ||
      lead?.assigned_operator ||
      "Unknown Operator";

    const priority = task?.priority || lead?.urgency || "medium";

    const { data: event } = await supabase
      .from("operational_events")
      .insert({
        event_type: "outcome_recorded",
        title: `Outcome recorded: ${rawOutcome}`,
        description: notes,
        priority,
        source: "record_outcome",
      })
      .select()
      .single();

    const { data: memory } = await supabase
      .from("operator_memory")
      .insert({
        memory_type: "outcome_intelligence",
        memory_category: "learning",
        title: `Outcome: ${rawOutcome} for ${companyName}`,
        content: `
Outcome recorded by ZennX.

Outcome:
${rawOutcome}

Notes:
${notes}

Revenue impact:
${revenueImpact}

Next recommended action:
${nextRecommendedAction}
        `,
        source: "record_outcome",
        source_id: event?.id || null,
        company_name: companyName,
        lead_id: resolvedLeadId,
        task_id: task?.id || null,
        assigned_operator: assignedOperator,
        priority,
        outcome: rawOutcome,
        outcome_score: outcomeScore,
        tags: ["outcome", "learning", rawOutcome, priority],
        confidence: 1,
        embedding_status: "pending",
        metadata: {
          revenueImpact,
          nextRecommendedAction,
          task,
          lead,
          recorded_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    const operatorPerformance = await getOperatorPerformance();

    return NextResponse.json({
      success: true,
      outcome: rawOutcome,
      outcomeScore,
      revenueImpact,
      taskUpdated: Boolean(task),
      leadUpdated: Boolean(lead),
      event,
      memory,
      operatorPerformance,
      bestOperator: operatorPerformance[0] || null,
    });
  } catch (error) {
    console.error("RECORD OUTCOME ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to record outcome",
      },
      { status: 500 }
    );
  }
}