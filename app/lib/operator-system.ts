import { supabase } from "@/app/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type OperatorIntent =
  | "analyze_lead"
  | "route_operator"
  | "create_task"
  | "health_check"
  | "memory_lookup"
  | "autonomous_loop"
  | "general";

type Priority = "low" | "medium" | "high";

type OperatorDecision = {
  intent: OperatorIntent;
  priority: Priority;
  summary: string;
  recommendedAction: string;
  nextRoute?: string;
  memoryContext?: string;
};

export const AVAILABLE_OPERATORS = [
  "Revenue Intelligence Operator",
  "Workflow Coordination Operator",
  "Autonomous Follow-Up Infrastructure",
  "Escalation Intelligence Layer",
  "Operational Memory Engine",
  "Decision Routing System",
];

const TRUE_OUTCOME_MEMORY_TYPES = [
  "outcome_intelligence",
  "task_outcome",
  "task_completion",
  "deal_outcome",
  "lead_outcome",
];

const TRUE_OUTCOME_MEMORY_CATEGORIES = [
  "learning",
  "outcome",
  "completion",
  "revenue",
];

const NON_OUTCOME_MEMORY_TYPES = [
  "system_boot",
  "operator_routing",
  "outcome_aware_routing",
  "deterministic_routing",
  "autonomous_decision",
  "task_creation",
  "operator_handoff",
  "task_handoff_completion",
];

function normalizeStatus(value: unknown) {
  return String(value || "").toLowerCase();
}

function isSuccess(outcome: string) {
  return (
    outcome.includes("success") ||
    outcome.includes("completed") ||
    outcome.includes("recovered") ||
    outcome.includes("booked") ||
    outcome.includes("won") ||
    outcome.includes("converted") ||
    outcome.includes("progressing")
  );
}

function isFailure(outcome: string) {
  return (
    outcome.includes("failed") ||
    outcome.includes("lost") ||
    outcome.includes("stalled") ||
    outcome.includes("ghosted") ||
    outcome.includes("error") ||
    outcome.includes("needs_review")
  );
}

function isTrueOutcomeMemory(memory: any) {
  const memoryType = normalizeStatus(memory.memory_type);
  const memoryCategory = normalizeStatus(memory.memory_category);
  const outcome = normalizeStatus(memory.outcome);

  if (NON_OUTCOME_MEMORY_TYPES.includes(memoryType)) {
    return false;
  }

  if (
    outcome === "operator_routed" ||
    outcome === "task_created" ||
    outcome === "handoff_created" ||
    outcome === "completed_for_handoff"
  ) {
    return false;
  }

  return (
    TRUE_OUTCOME_MEMORY_TYPES.includes(memoryType) ||
    TRUE_OUTCOME_MEMORY_CATEGORIES.includes(memoryCategory)
  );
}

function resolveOperator(memory: any) {
  const operator =
    memory.assigned_operator ||
    memory.source ||
    "Unknown Operator";

  return String(operator).trim() || "Unknown Operator";
}

export async function getOperatorPerformance(
  memoriesInput?: any[],
  db: SupabaseClient = supabase,
) {
  let memories = memoriesInput || [];

  if (!memoriesInput) {
    const { data } = await db
      .from("operator_memory")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    memories = data || [];
  }

  const trueOutcomeMemories = memories.filter(isTrueOutcomeMemory);
  const operatorMap: Record<string, any> = {};

  for (const memory of trueOutcomeMemories) {
    const operator = resolveOperator(memory);

    if (!operatorMap[operator]) {
      operatorMap[operator] = {
        operator,
        score: 50,
        totalMemories: 0,
        successSignals: 0,
        failureSignals: 0,
        neutralSignals: 0,
        highPrioritySignals: 0,
        averageOutcomeScore: 0,
        recentMemories: [],
      };
    }

    const bucket = operatorMap[operator];
    const outcome = normalizeStatus(memory.outcome);

    bucket.totalMemories += 1;

    if (isSuccess(outcome)) {
      bucket.successSignals += 1;
    } else if (isFailure(outcome)) {
      bucket.failureSignals += 1;
    } else {
      bucket.neutralSignals += 1;
    }

    if (normalizeStatus(memory.priority) === "high") {
      bucket.highPrioritySignals += 1;
    }

    if (bucket.recentMemories.length < 5) {
      bucket.recentMemories.push({
        id: memory.id,
        title: memory.title,
        outcome: memory.outcome,
        priority: memory.priority,
        outcome_score: memory.outcome_score,
        created_at: memory.created_at,
      });
    }
  }

  return Object.values(operatorMap)
    .map((operator: any) => {
      const relevantMemories = trueOutcomeMemories.filter((memory) => {
        return resolveOperator(memory) === operator.operator;
      });

      const scored = relevantMemories
        .map((memory) => Number(memory.outcome_score || 0))
        .filter((score) => score > 0);

      const averageOutcomeScore =
        scored.length > 0
          ? scored.reduce((sum, score) => sum + score, 0) / scored.length
          : 0;

      const successRate =
        operator.totalMemories > 0
          ? operator.successSignals / operator.totalMemories
          : 0;

      const score =
        50 +
        operator.successSignals * 12 -
        operator.failureSignals * 16 +
        averageOutcomeScore * 2 +
        successRate * 12 +
        operator.highPrioritySignals * 2;

      return {
        ...operator,
        averageOutcomeScore: Math.round(averageOutcomeScore * 10) / 10,
        successRate: Math.round(successRate * 100),
        score: Math.max(0, Math.min(100, Math.round(score))),
      };
    })
    .sort((a: any, b: any) => b.score - a.score);
}

function buildMemoryContext(memories: any[]) {
  if (!memories.length) {
    return "No operator memory has been recorded yet.";
  }

  return memories
    .slice(0, 8)
    .map((memory) => {
      return `- ${memory.title || "Untitled memory"} | type: ${
        memory.memory_type || "unknown"
      } | outcome: ${memory.outcome || "unknown"} | operator: ${
        memory.assigned_operator || memory.source || "unknown"
      }`;
    })
    .join("\n");
}

export async function getSystemSnapshot(
  db: SupabaseClient = supabase,
) {
  const [
    { data: leads },
    { data: tasks },
    { data: companyMemory },
    { data: operatorMemory },
    { data: operationalEvents },
  ] = await Promise.all([
    db.from("leads").select("*"),
    db.from("tasks").select("*"),
    db.from("company_memory").select("*"),
    db
      .from("operator_memory")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("operational_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const safeLeads = leads || [];
  const safeTasks = tasks || [];
  const safeCompanyMemory = companyMemory || [];
  const safeOperatorMemory = operatorMemory || [];
  const safeOperationalEvents = operationalEvents || [];

  const totalLeads = safeLeads.length;
  const totalTasks = safeTasks.length;
  const companyMemoryNodes = safeCompanyMemory.length;
  const operatorMemoryNodes = safeOperatorMemory.length;
  const operationalEventCount = safeOperationalEvents.length;

  const highRiskLeads = safeLeads.filter((lead) => {
    const status = normalizeStatus(lead.status);
    const urgency = normalizeStatus(lead.urgency);

    return (
      status.includes("escalated") ||
      status.includes("high") ||
      status.includes("risk") ||
      urgency.includes("high") ||
      urgency.includes("urgent")
    );
  }).length;

  const pendingTasks = safeTasks.filter(
    (task) => normalizeStatus(task.status) === "pending"
  ).length;

  const queuedTasks = safeTasks.filter(
    (task) => normalizeStatus(task.status) === "queued"
  ).length;

  const inProgressTasks = safeTasks.filter((task) => {
    const status = normalizeStatus(task.status);

    return (
      status === "active" ||
      status === "in_progress" ||
      status === "in progress"
    );
  }).length;

  const completedTasks = safeTasks.filter(
    (task) => normalizeStatus(task.status) === "completed"
  ).length;

  const failedTasks = safeTasks.filter((task) => {
    const status = normalizeStatus(task.status);

    return status.includes("failed") || status.includes("lost");
  }).length;

  const recentRiskEvents = safeOperationalEvents.filter((event) => {
    const priority = normalizeStatus(event.priority);
    const type = normalizeStatus(event.event_type);

    return (
      priority === "high" ||
      type.includes("risk") ||
      type.includes("escalation")
    );
  }).length;

  const trueOutcomeMemories = safeOperatorMemory.filter(isTrueOutcomeMemory);

  const successfulMemories = trueOutcomeMemories.filter((memory) =>
    isSuccess(normalizeStatus(memory.outcome))
  ).length;

  const failedMemories = trueOutcomeMemories.filter((memory) =>
    isFailure(normalizeStatus(memory.outcome))
  ).length;

  const operatorPerformance = await getOperatorPerformance(safeOperatorMemory, db);

  const pressure =
    highRiskLeads * 8 +
    pendingTasks * 2 +
    queuedTasks * 1.5 +
    failedTasks * 8 +
    recentRiskEvents * 3 -
    completedTasks * 0.5 -
    successfulMemories * 0.75;

  const operationalScore = Math.max(
    0,
    Math.min(100, Math.round(96 - pressure))
  );

  const memoryContext = buildMemoryContext(safeOperatorMemory);

  return {
    leads: safeLeads,
    tasks: safeTasks,
    companyMemory: safeCompanyMemory,
    operatorMemory: safeOperatorMemory,
    operationalEvents: safeOperationalEvents,
    memory: safeCompanyMemory,
    recentMemories: safeOperatorMemory.slice(0, 10),
    recentEvents: safeOperationalEvents.slice(0, 10),
    operatorPerformance,
    memoryContext,
    metrics: {
      totalLeads,
      totalTasks,
      companyMemoryNodes,
      operatorMemoryNodes,
      memoryNodes: companyMemoryNodes + operatorMemoryNodes,
      operationalEventCount,
      highRiskLeads,
      pendingTasks,
      queuedTasks,
      activeTasks: inProgressTasks,
      inProgressTasks,
      completedTasks,
      failedTasks,
      successfulMemories,
      failedMemories,
      recentRiskEvents,
      operationalScore,
    },
  };
}

export function classifyOperatorIntent(message: string): OperatorIntent {
  const text = message.toLowerCase();

  if (
    text.includes("lead") ||
    text.includes("client") ||
    text.includes("prospect")
  ) {
    return "analyze_lead";
  }

  if (
    text.includes("route") ||
    text.includes("assign") ||
    text.includes("operator")
  ) {
    return "route_operator";
  }

  if (
    text.includes("task") ||
    text.includes("workflow") ||
    text.includes("execution")
  ) {
    return "create_task";
  }

  if (
    text.includes("health") ||
    text.includes("risk") ||
    text.includes("pressure")
  ) {
    return "health_check";
  }

  if (
    text.includes("memory") ||
    text.includes("remember") ||
    text.includes("context") ||
    text.includes("learn")
  ) {
    return "memory_lookup";
  }

  if (
    text.includes("autonomous") ||
    text.includes("loop") ||
    text.includes("run system")
  ) {
    return "autonomous_loop";
  }

  return "general";
}

export async function makeOperatorDecision(
  message: string,
  db: SupabaseClient = supabase,
): Promise<OperatorDecision> {
  const snapshot = await getSystemSnapshot(db);
  const intent = classifyOperatorIntent(message);

  const {
    highRiskLeads,
    pendingTasks,
    queuedTasks,
    operationalScore,
    failedMemories,
    recentRiskEvents,
  } = snapshot.metrics;

  let priority: Priority = "low";

  if (
    highRiskLeads > 0 ||
    operationalScore < 70 ||
    failedMemories > 0 ||
    recentRiskEvents > 0
  ) {
    priority = "high";
  } else if (
    pendingTasks > 0 ||
    queuedTasks > 0 ||
    operationalScore < 90
  ) {
    priority = "medium";
  }

  const decisionMap: Record<
    OperatorIntent,
    Omit<OperatorDecision, "intent" | "priority" | "memoryContext">
  > = {
    analyze_lead: {
      summary: "Lead intelligence requested.",
      recommendedAction:
        "Analyze lead urgency, status, service request, historical memory patterns, and determine the next highest-leverage action.",
      nextRoute: "/dashboard/leads",
    },
    route_operator: {
      summary: "Operator routing requested.",
      recommendedAction:
        "Assign the correct AI operator using workflow type, lead pressure, operator memory, and past outcome signals.",
      nextRoute: "/dashboard/autonomous",
    },
    create_task: {
      summary: "Execution workflow requested.",
      recommendedAction:
        "Create or update an execution chain and track it through task, event, and memory layers.",
      nextRoute: "/dashboard/tasks",
    },
    health_check: {
      summary: "Business health check requested.",
      recommendedAction:
        "Scan high-risk leads, pending tasks, failed memories, recent risk events, and operational score.",
      nextRoute: "/dashboard/health",
    },
    memory_lookup: {
      summary: "Memory intelligence requested.",
      recommendedAction:
        "Use operator memory and company memory to surface patterns, past decisions, outcomes, and reusable operational knowledge.",
      nextRoute: "/dashboard/memory",
    },
    autonomous_loop: {
      summary: "Autonomous loop requested.",
      recommendedAction:
        "Run the autonomous system loop with memory-aware risk detection and duplicate prevention.",
      nextRoute: "/dashboard/autonomous",
    },
    general: {
      summary: "General operator command received.",
      recommendedAction:
        "Use live system snapshot, operator memory, company memory, leads, tasks, and events to recommend the next operational move.",
      nextRoute: "/dashboard",
    },
  };

  return {
    intent,
    priority,
    memoryContext: snapshot.memoryContext,
    ...decisionMap[intent],
  };
}

export async function createExecutionTask(input: {
  title: string;
  description?: string;
  companyName?: string;
  priority?: Priority;
  assignedAgent?: string;
  leadId?: number | null;
  source?: string;
}, db: SupabaseClient = supabase) {
  const { data, error } = await db
    .from("tasks")
    .insert({
      lead_id: input.leadId || null,
      task_title: input.title,
      task_description:
        input.description || "Generated by ZennX Operator Brain.",
      company_name: input.companyName || "ZennX System",
      priority: input.priority || "medium",
      assigned_agent: input.assignedAgent || "ZennX AI",
      due_time: "active",
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await db.from("operational_events").insert({
    event_type: "task_created",
    title: input.title,
    description:
      input.description || "Execution task created by ZennX Operator Brain.",
    priority: input.priority || "medium",
    source: input.source || "operator_system",
  });

  await db.from("operator_memory").insert({
    memory_type: "task_creation",
    memory_category: "execution",
    title: input.title,
    content:
      input.description || "Execution task created by ZennX Operator Brain.",
    source: input.source || "operator_system",
    task_id: data.id,
    company_name: input.companyName || "ZennX System",
    lead_id: input.leadId || null,
    assigned_operator: input.assignedAgent || "ZennX AI",
    priority: input.priority || "medium",
    outcome: "task_created",
    outcome_score: 0,
    tags: ["task", "execution", input.priority || "medium"],
    confidence: 1,
    embedding_status: "pending",
    metadata: {
      created_by: "operator_system",
    },
  });

  return data;
}

export async function runAutonomousScan(
  db: SupabaseClient = supabase,
) {
  const snapshot = await getSystemSnapshot(db);
  const { leads, metrics, memoryContext } = snapshot;

  const actions = [];

  for (const lead of leads) {
    const status = normalizeStatus(lead.status);
    const urgency = normalizeStatus(lead.urgency);

    const isHighRisk =
      status.includes("escalated") ||
      status.includes("high") ||
      status.includes("risk") ||
      urgency.includes("high") ||
      urgency.includes("urgent");

    if (isHighRisk) {
      const { data: existingTasks } = await db
        .from("tasks")
        .select("id")
        .eq("lead_id", lead.id)
        .in("status", ["pending", "queued", "in_progress"])
        .limit(1);

      if (existingTasks && existingTasks.length > 0) {
        continue;
      }

      const task = await createExecutionTask({
        title: `Escalate ${
          lead.company_name || lead.business_name || "high-risk lead"
        }`,
        description: `Autonomous scan detected high-risk lead pressure.

Memory context:
${memoryContext}

Immediate follow-up recommended.`,
        companyName:
          lead.company_name || lead.business_name || "Unknown Business",
        leadId: lead.id,
        priority: "high",
        assignedAgent: "Escalation Intelligence Layer",
        source: "autonomous_scan",
      }, db);

      actions.push(task);
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    operationalScore: metrics.operationalScore,
    highRiskLeads: metrics.highRiskLeads,
    pendingTasks: metrics.pendingTasks,
    queuedTasks: metrics.queuedTasks,
    failedMemories: metrics.failedMemories,
    recentRiskEvents: metrics.recentRiskEvents,
    actionsCreated: actions.length,
    memoryContext,
    actions,
  };
}