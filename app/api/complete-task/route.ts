import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
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
    outcome === "won" ||
    outcome === "converted" ||
    outcome === "failed" ||
    outcome === "lost" ||
    outcome === "stalled" ||
    outcome === "ghosted" ||
    outcome === "needs_review"
  ) {
    return outcome;
  }

  return "completed";
}

function scoreOutcome(outcome: string, manualScore: unknown) {
  const score = Number(manualScore);

  if (!Number.isNaN(score) && score > 0) {
    return Math.max(0, Math.min(10, score));
  }

  if (outcome === "won") return 10;
  if (outcome === "converted") return 10;
  if (outcome === "success") return 9;
  if (outcome === "recovered") return 9;
  if (outcome === "booked") return 8.5;
  if (outcome === "completed") return 7;
  if (outcome === "needs_review") return 4;
  if (outcome === "stalled") return 3;
  if (outcome === "ghosted") return 2;
  if (outcome === "failed") return 2;
  if (outcome === "lost") return 1;

  return 5;
}

function leadStatusFromOutcome(outcome: string) {
  if (
    outcome === "success" ||
    outcome === "completed" ||
    outcome === "recovered" ||
    outcome === "booked" ||
    outcome === "won" ||
    outcome === "converted"
  ) {
    return "progressing";
  }

  if (
    outcome === "needs_review" ||
    outcome === "stalled" ||
    outcome === "ghosted"
  ) {
    return "needs_review";
  }

  if (outcome === "failed" || outcome === "lost") {
    return "at_risk";
  }

  return "progressing";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const taskId = Number(body.taskId);
    const outcome = safeOutcome(body.outcome || "completed");
    const outcomeScore = scoreOutcome(outcome, body.outcomeScore);
    const notes =
      body.notes ||
      "Task completed and converted into operator learning memory.";
    const revenueImpact = Number(body.revenueImpact || 0);
    const nextRecommendedAction =
      body.nextRecommendedAction ||
      "Review the outcome and determine whether follow-up, handoff, or closure is required.";

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: "taskId is required",
        },
        { status: 400 }
      );
    }

    const { data: task, error: taskFetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (taskFetchError || !task) {
      return NextResponse.json(
        {
          success: false,
          error: "Task not found",
        },
        { status: 404 }
      );
    }

    const { data: lead } = task.lead_id
      ? await supabase
          .from("leads")
          .select("*")
          .eq("id", task.lead_id)
          .maybeSingle()
      : { data: null };

    const assignedOperator =
      task.assigned_agent ||
      lead?.assigned_operator ||
      "Unknown Operator";

    const companyName =
      task.company_name ||
      lead?.business_name ||
      lead?.company_name ||
      "Unknown Business";

    const priority = task.priority || lead?.urgency || "medium";

    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({
        status: "completed",
        result: outcome,
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    if (task.lead_id) {
      await supabase
        .from("leads")
        .update({
          status: leadStatusFromOutcome(outcome),
        })
        .eq("id", task.lead_id);
    }

    const { data: event } = await supabase
      .from("operational_events")
      .insert({
        event_type: "task_outcome_recorded",
        title: `Task outcome: ${outcome}`,
        description: notes,
        priority,
        source: "complete_task",
      })
      .select()
      .single();

    const { data: memory } = await supabase
      .from("operator_memory")
      .insert({
        memory_type: "task_outcome",
        memory_category: "learning",
        title: `Task outcome: ${outcome} for ${companyName}`,
        content: `
Task completed and converted into learning memory.

Task:
${task.task_title || task.task || "Operational Task"}

Outcome:
${outcome}

Outcome score:
${outcomeScore}

Notes:
${notes}

Revenue impact:
${revenueImpact}

Next recommended action:
${nextRecommendedAction}
        `,
        source: "complete_task",
        source_id: event?.id || null,
        company_name: companyName,
        lead_id: task.lead_id || null,
        task_id: task.id,
        assigned_operator: assignedOperator,
        priority,
        outcome,
        outcome_score: outcomeScore,
        tags: ["task", "outcome", "learning", outcome, priority],
        confidence: 1,
        embedding_status: "pending",
        metadata: {
          completed_at: new Date().toISOString(),
          previous_status: task.status,
          task_title: task.task_title || task.task || null,
          revenueImpact,
          nextRecommendedAction,
          lead,
          task,
        },
      })
      .select()
      .single();

    const operatorPerformance = await getOperatorPerformance();

    return NextResponse.json({
      success: true,
      outcome,
      outcomeScore,
      revenueImpact,
      task: updatedTask,
      leadUpdated: Boolean(task.lead_id),
      event,
      memory,
      operatorPerformance,
      bestOperator: operatorPerformance[0] || null,
    });
  } catch (error) {
    console.error("COMPLETE TASK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to complete task",
      },
      { status: 500 }
    );
  }
}