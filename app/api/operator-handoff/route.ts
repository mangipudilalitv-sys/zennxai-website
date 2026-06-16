import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import {
  AVAILABLE_OPERATORS,
  getOperatorPerformance,
  getSystemSnapshot,
} from "@/app/lib/operator-system";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanJson(raw: string) {
  return raw.replace(/```json|```/g, "").trim();
}

function safePriority(value: unknown) {
  const priority = String(value || "").toLowerCase();

  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }

  return "medium";
}

function fallbackHandoff(task: any, bestOperator?: string) {
  return {
    next_operator:
      bestOperator && AVAILABLE_OPERATORS.includes(bestOperator)
        ? bestOperator
        : "Workflow Coordination Operator",
    handoff_reason:
      "Fallback handoff selected because AI returned malformed or unsafe output. Workflow Coordination Operator is safest for execution continuity.",
    next_task_title: `Continue execution: ${
      task.task_title || "Operational Workflow"
    }`,
    next_task_description:
      "Review the completed task, identify the next workflow bottleneck, and continue execution.",
    priority: task.priority || "medium",
    workflow_stage: "execution_continuity",
    performance_basis:
      "Fallback used available operator performance ranking where possible.",
    memory_basis:
      "No reliable memory basis returned. Safe workflow continuation applied.",
    confidence: 0.65,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const taskId = Number(body.taskId);

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: "taskId is required",
        },
        { status: 400 }
      );
    }

    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (!task) {
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

    const [snapshot, operatorPerformance] = await Promise.all([
      getSystemSnapshot(),
      getOperatorPerformance(),
    ]);

    const bestOperator = operatorPerformance[0]?.operator;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are ZennX AI's Performance-Aware Autonomous Operator Handoff Engine. Decide which operator should take over next using workflow state, lead context, operator performance, memory, revenue risk, escalation state, and execution continuity. Evidence beats generic reasoning. Return strict JSON only.",
        },
        {
          role: "user",
          content: `
CURRENT TASK:
${JSON.stringify(task)}

LEAD:
${JSON.stringify(lead)}

AVAILABLE OPERATORS:
${JSON.stringify(AVAILABLE_OPERATORS)}

OPERATOR PERFORMANCE SCORECARD:
${JSON.stringify(operatorPerformance)}

RECENT OPERATOR MEMORY:
${JSON.stringify(snapshot.recentMemories)}

RECENT OPERATIONAL EVENTS:
${JSON.stringify(snapshot.recentEvents)}

SYSTEM METRICS:
${JSON.stringify(snapshot.metrics)}

Handoff rules:
- Choose exactly one available next_operator.
- Do not invent operators.
- The current task is being completed before handoff.
- Select the next operator most likely to move the workflow forward.
- If the task or lead is high-risk, urgent, escalated, or revenue-sensitive, prioritize revenue preservation and escalation strength.
- If one operator has stronger historical outcomes, prefer that operator unless workflow context clearly requires another.
- Confidence must be between 0 and 1.

Return only valid JSON:
{
  "next_operator": "",
  "handoff_reason": "",
  "next_task_title": "",
  "next_task_description": "",
  "priority": "high | medium | low",
  "workflow_stage": "",
  "performance_basis": "",
  "memory_basis": "",
  "confidence": 0.0
}
          `,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";

    let result: any;

    try {
      result = JSON.parse(cleanJson(raw));
    } catch {
      result = fallbackHandoff(task, bestOperator);
    }

    if (!AVAILABLE_OPERATORS.includes(result.next_operator)) {
      result = fallbackHandoff(task, bestOperator);
    }

    const priority = safePriority(result.priority || task.priority);
    const confidence = Math.max(
      0,
      Math.min(1, Number(result.confidence || 0.75))
    );

    const { data: completedTask } = await supabase
      .from("tasks")
      .update({
        status: "completed",
      })
      .eq("id", taskId)
      .select()
      .single();

    const { data: completionEvent } = await supabase
      .from("operational_events")
      .insert({
        event_type: "task_completed_for_handoff",
        title: `Completed before handoff: ${
          task.task_title || "Operational Task"
        }`,
        description:
          result.handoff_reason ||
          "Task completed before autonomous operator handoff.",
        priority: task.priority || "medium",
        source: "operator_handoff",
      })
      .select()
      .single();

    const { data: completionMemory } = await supabase
      .from("operator_memory")
      .insert({
        memory_type: "task_handoff_completion",
        memory_category: "handoff",
        title: `Completed for handoff: ${
          task.task_title || "Operational Task"
        }`,
        content: `
Task was completed before autonomous handoff.

Handoff reason:
${result.handoff_reason || "No handoff reason provided."}

Performance basis:
${result.performance_basis || "No performance basis provided."}

Memory basis:
${result.memory_basis || "No memory basis provided."}
        `,
        source: "operator_handoff",
        source_id: completionEvent?.id || null,
        company_name: task.company_name || "Unknown Business",
        lead_id: task.lead_id || null,
        task_id: task.id,
        assigned_operator: task.assigned_agent || "Unknown Operator",
        priority: task.priority || "medium",
        outcome: "completed_for_handoff",
        outcome_score: confidence * 10,
        tags: ["task", "handoff", "completed", task.priority || "medium"],
        confidence,
        embedding_status: "pending",
        metadata: {
          completedTask,
          handoff: result,
          systemMetrics: snapshot.metrics,
        },
      })
      .select()
      .single();

    const { data: newTask } = await supabase
      .from("tasks")
      .insert({
        lead_id: task.lead_id || null,
        company_name: task.company_name || "Unknown Business",
        task_title:
          result.next_task_title ||
          `Continue execution with ${result.next_operator}`,
        task_description: `
HANDOFF REASON:
${result.handoff_reason || "No handoff reason provided."}

PERFORMANCE BASIS:
${result.performance_basis || "No performance basis provided."}

MEMORY BASIS:
${result.memory_basis || "No memory basis provided."}

NEXT WORKFLOW STAGE:
${result.workflow_stage || "execution_continuity"}

${result.next_task_description || "Continue operational workflow."}
        `,
        priority,
        assigned_agent: result.next_operator,
        due_time: "active",
        status: "in_progress",
      })
      .select()
      .single();

    const { data: handoffEvent } = await supabase
      .from("operational_events")
      .insert({
        event_type: "operator_handoff",
        title: `Handoff to ${result.next_operator}`,
        description:
          result.handoff_reason ||
          "Autonomous operator handoff created the next execution task.",
        priority,
        source: "operator_handoff",
      })
      .select()
      .single();

    const { data: handoffMemory } = await supabase
      .from("operator_memory")
      .insert({
        memory_type: "operator_handoff",
        memory_category: "handoff",
        title: `Handoff to ${result.next_operator}`,
        content: `
Autonomous handoff created next execution task.

Handoff reason:
${result.handoff_reason || "No handoff reason provided."}

Performance basis:
${result.performance_basis || "No performance basis provided."}

Memory basis:
${result.memory_basis || "No memory basis provided."}

Next workflow stage:
${result.workflow_stage || "execution_continuity"}
        `,
        source: "operator_handoff",
        source_id: handoffEvent?.id || null,
        company_name: task.company_name || "Unknown Business",
        lead_id: task.lead_id || null,
        task_id: newTask?.id || null,
        assigned_operator: result.next_operator,
        priority,
        outcome: "handoff_created",
        outcome_score: confidence * 10,
        tags: ["handoff", "operator", priority],
        confidence,
        embedding_status: "pending",
        metadata: {
          previous_task_id: task.id,
          new_task_id: newTask?.id || null,
          handoff: result,
          systemMetrics: snapshot.metrics,
          operatorPerformance,
        },
      })
      .select()
      .single();

    if (task.lead_id) {
      await supabase
        .from("leads")
        .update({
          assigned_operator: result.next_operator,
          workflow_stage:
            result.workflow_stage || "execution_continuity",
        })
        .eq("id", task.lead_id);
    }

    return NextResponse.json({
      success: true,
      handoff: result,
      completedTask,
      nextTask: newTask,
      events: {
        completionEvent,
        handoffEvent,
      },
      memories: {
        completionMemory,
        handoffMemory,
      },
      operatorPerformance,
    });
  } catch (error) {
    console.error("OPERATOR HANDOFF ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Operator handoff failed",
      },
      { status: 500 }
    );
  }
}