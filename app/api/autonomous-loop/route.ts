import OpenAI from "openai";
import { NextResponse } from "next/server";
import { isAuthorizedInternalRequest } from "@/app/lib/internal-api-auth";
import { supabaseServer as supabase } from "@/app/lib/supabase-server";
import {
  AVAILABLE_OPERATORS,
  getOperatorPerformance,
  getSystemSnapshot,
} from "@/app/lib/operator-system";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_ACTIONS_PER_LOOP = 3;
const ACTIVE_TASK_STATUSES = ["pending", "queued", "in_progress"];

function cleanJson(raw: string) {
  return raw.replace(/```json|```/g, "").trim();
}

function normalize(value: unknown) {
  return String(value || "").toLowerCase();
}

function safePriority(value: unknown) {
  const priority = normalize(value);

  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }

  return "medium";
}

function safeOperator(value: unknown, fallback?: string) {
  const operator = String(value || "").trim();

  if (AVAILABLE_OPERATORS.includes(operator)) {
    return operator;
  }

  if (fallback && AVAILABLE_OPERATORS.includes(fallback)) {
    return fallback;
  }

  return "Workflow Coordination Operator";
}

function buildDuplicateKey(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .slice(0, 55)
    .trim();
}

async function activeSimilarTaskExists(input: {
  title: string;
  leadId?: number | null;
}) {
  const duplicateKey = buildDuplicateKey(input.title);

  if (!duplicateKey) return false;

  let query = supabase
    .from("tasks")
    .select("id, task_title, status, lead_id")
    .ilike("task_title", `%${duplicateKey}%`)
    .in("status", ACTIVE_TASK_STATUSES)
    .limit(1);

  if (input.leadId) {
    query = query.eq("lead_id", input.leadId);
  }

  const { data } = await query;

  return data && data.length > 0 ? data[0] : null;
}

async function getActiveWorkload() {
  const { data } = await supabase
    .from("tasks")
    .select("id,status")
    .in("status", ACTIVE_TASK_STATUSES);

  return data || [];
}

function fallbackLoop(reason: string) {
  return {
    system_status: reason,
    critical_risk_detected: false,
    workflow_stall_detected: false,
    autonomous_actions: [],
  };
}

export async function GET(req: Request) {
  if (!isAuthorizedInternalRequest(req)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  return runLoop();
}

export async function POST(req: Request) {
  if (!isAuthorizedInternalRequest(req)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  return runLoop();
}

async function runLoop() {
  try {
    const [snapshot, operatorPerformance, activeWorkload] = await Promise.all([
      getSystemSnapshot(),
      getOperatorPerformance(),
      getActiveWorkload(),
    ]);

    const { data: activeTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("status", ACTIVE_TASK_STATUSES)
      .order("id", { ascending: false })
      .limit(40);

    const { data: activeLeads } = await supabase
      .from("leads")
      .select("*")
      .order("id", { ascending: false })
      .limit(20);

    const systemAlreadyLoaded = activeWorkload.length >= 100;

    if (systemAlreadyLoaded) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        system: snapshot.metrics,
        loop: fallbackLoop(
          "Autonomous loop paused because active workload is already above safe execution threshold."
        ),
        created_tasks: [],
        created_events: [],
        created_memories: [],
        execution_chains: [],
        skipped_duplicates: [],
        skipped_reason: "active_workload_threshold",
        created_count: 0,
        event_count: 0,
        memory_count: 0,
        chain_count: 0,
        skipped_count: 0,
      });
    }

    const bestOperator = operatorPerformance.find((operator: any) =>
      AVAILABLE_OPERATORS.includes(operator.operator)
    )?.operator;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are ZennX AI's Autonomous Operations Manager. You do not spam tasks. You only create high-value actions when there is a clear operational gap not already covered by active work. Use memory, operator performance, risk, workload, and recent events. Return strict JSON only.",
        },
        {
          role: "user",
          content: `
SYSTEM METRICS:
${JSON.stringify(snapshot.metrics)}

AVAILABLE OPERATORS:
${JSON.stringify(AVAILABLE_OPERATORS)}

OPERATOR PERFORMANCE:
${JSON.stringify(operatorPerformance)}

RECENT MEMORIES:
${JSON.stringify(snapshot.recentMemories)}

RECENT OPERATIONAL EVENTS:
${JSON.stringify(snapshot.recentEvents)}

ACTIVE TASKS:
${JSON.stringify(activeTasks || [])}

ACTIVE LEADS:
${JSON.stringify(activeLeads || [])}

Rules:
- Create at most ${MAX_ACTIONS_PER_LOOP} autonomous actions.
- Return zero actions if active tasks already cover the risks.
- Do not create duplicate work.
- Prefer operators with stronger performance history.
- Every action must be specific, operational, and valuable.
- If a lead is referenced, include its lead_id.
- Do not invent operators outside the available list.

Return ONLY valid JSON:
{
  "system_status": "",
  "critical_risk_detected": true,
  "workflow_stall_detected": true,
  "autonomous_actions": [
    {
      "action_type": "",
      "target_operator": "",
      "task_title": "",
      "task_description": "",
      "priority": "high | medium | low",
      "lead_id": null,
      "reasoning": "",
      "expected_outcome": ""
    }
  ]
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
      result = fallbackLoop("AI returned malformed JSON.");
    }

    const rawActions = Array.isArray(result.autonomous_actions)
      ? result.autonomous_actions
      : [];

    const actions = rawActions.slice(0, MAX_ACTIONS_PER_LOOP);

    const createdTasks: any[] = [];
    const createdEvents: any[] = [];
    const createdMemories: any[] = [];
    const executionChains: any[] = [];
    const skippedDuplicates: any[] = [];

    for (const action of actions) {
      const title = String(action.task_title || "").trim();
      const description = String(action.task_description || "").trim();

      if (!title || !description) continue;

      const leadId = action.lead_id ? Number(action.lead_id) : null;
      const priority = safePriority(action.priority);
      const assignedOperator = safeOperator(action.target_operator, bestOperator);

      const duplicate = await activeSimilarTaskExists({
        title,
        leadId,
      });

      if (duplicate) {
        skippedDuplicates.push({
          title,
          leadId,
          existingTaskId: duplicate.id,
          existingTitle: duplicate.task_title,
          existingStatus: duplicate.status,
        });

        continue;
      }

      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          lead_id: leadId,
          company_name: "Autonomous System",
          task_title: title,
          task_description: `
AUTONOMOUS ACTION TYPE:
${action.action_type || "system_action"}

REASONING:
${action.reasoning || "No reasoning provided."}

EXPECTED OUTCOME:
${action.expected_outcome || "No expected outcome provided."}

${description}
          `,
          priority,
          assigned_agent: assignedOperator,
          due_time: "continuous",
          status: "pending",
        })
        .select()
        .single();

      if (taskError || !task) {
        console.error("TASK CREATION ERROR:", taskError);
        continue;
      }

      createdTasks.push(task);

      const { data: event } = await supabase
        .from("operational_events")
        .insert({
          event_type: action.action_type || "autonomous_action",
          title,
          description,
          priority,
          source: "autonomous_loop",
        })
        .select()
        .single();

      if (event) createdEvents.push(event);

      const { data: memory } = await supabase
        .from("operator_memory")
        .insert({
          memory_type: "autonomous_decision",
          memory_category: action.action_type || "operational",
          title,
          content: `
Autonomous loop created a new operational action.

Reasoning:
${action.reasoning || "No reasoning provided."}

Expected outcome:
${action.expected_outcome || "No expected outcome provided."}

Description:
${description}
          `,
          source: "autonomous_loop",
          source_id: event?.id || null,
          company_name: task.company_name || "Autonomous System",
          lead_id: leadId,
          task_id: task.id,
          assigned_operator: assignedOperator,
          priority,
          outcome: "task_created",
          outcome_score: 0,
          tags: ["autonomous", "decision", priority],
          confidence: 1,
          embedding_status: "pending",
          metadata: {
            action,
            operational_score: snapshot.metrics.operationalScore,
            high_risk_leads: snapshot.metrics.highRiskLeads,
            pending_tasks: snapshot.metrics.pendingTasks,
            operator_performance: operatorPerformance,
          },
        })
        .select()
        .single();

      if (memory) createdMemories.push(memory);

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

        const chainRes = await fetch(
          `${baseUrl}/api/create-execution-chain`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.ZENNX_INTERNAL_API_SECRET || ""}`,
            },
            body: JSON.stringify({
              taskId: task.id,
              title: task.task_title,
              description: task.task_description,
              priority: task.priority,
              assignedAgent: task.assigned_agent,
              companyName: task.company_name,
            }),
          }
        );

        const chainJson = await chainRes.json();

        executionChains.push({
          taskId: task.id,
          success: chainRes.ok,
          response: chainJson,
        });
      } catch (chainError) {
        console.error("EXECUTION CHAIN ERROR:", chainError);

        executionChains.push({
          taskId: task.id,
          success: false,
          error: "Execution chain request failed.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: snapshot.metrics,
      loop: result,
      operator_performance: operatorPerformance,
      created_tasks: createdTasks,
      created_events: createdEvents,
      created_memories: createdMemories,
      execution_chains: executionChains,
      skipped_duplicates: skippedDuplicates,
      created_count: createdTasks.length,
      event_count: createdEvents.length,
      memory_count: createdMemories.length,
      chain_count: executionChains.length,
      skipped_count: skippedDuplicates.length,
    });
  } catch (error) {
    console.error("AUTONOMOUS LOOP ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Autonomous loop failed",
      },
      { status: 500 }
    );
  }
}