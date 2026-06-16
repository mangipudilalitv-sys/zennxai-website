import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import {
  AVAILABLE_OPERATORS,
  getOperatorPerformance,
  getSystemSnapshot,
} from "@/app/lib/operator-system";

const SIMILAR_OUTCOME_WEIGHT = 0.7;
const GLOBAL_PERFORMANCE_WEIGHT = 0.3;

function safePriority(score: number) {
  if (score >= 85) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function normalizeScore(value: unknown) {
  const score = Number(value || 0);

  if (Number.isNaN(score)) return 0;

  return Math.max(0, Math.min(100, score));
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3002";
}

async function getOutcomeIntelligence(leadId: number, lead: any) {
  try {
    const res = await fetch(`${getBaseUrl()}/api/outcome-intelligence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leadId,
        companyName: lead.business_name || lead.company_name || "",
        serviceRequested: lead.service_requested || "",
        query: [
          lead.business_name,
          lead.company_name,
          lead.service_requested,
          lead.status,
          lead.urgency,
          lead.ai_summary,
        ].join(" "),
      }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!data.success) return null;

    return data;
  } catch (error) {
    console.error("OUTCOME INTELLIGENCE FETCH ERROR:", error);
    return null;
  }
}

function calculateDeterministicRouting(input: {
  outcomeIntelligence: any;
  operatorPerformance: any[];
}) {
  const scores: Record<string, any> = {};

  for (const operator of AVAILABLE_OPERATORS) {
    scores[operator] = {
      operator,
      similarOutcomeScore: 0,
      globalPerformanceScore: 0,
      finalScore: 0,
      basis: [],
    };
  }

  const similarRanking =
    input.outcomeIntelligence?.compactEvidence?.similarOperatorRanking ||
    input.outcomeIntelligence?.similarOperatorRanking ||
    [];

  for (const operator of similarRanking) {
    if (!AVAILABLE_OPERATORS.includes(operator.operator)) continue;

    const score = normalizeScore(operator.score);

    scores[operator.operator].similarOutcomeScore = score;
    scores[operator.operator].basis.push(`Similar outcome score: ${score}`);
  }

  for (const operator of input.operatorPerformance || []) {
    if (!AVAILABLE_OPERATORS.includes(operator.operator)) continue;

    const score = normalizeScore(operator.score);

    scores[operator.operator].globalPerformanceScore = score;
    scores[operator.operator].basis.push(`Global performance score: ${score}`);
  }

  for (const operator of Object.values(scores) as any[]) {
    operator.finalScore = Math.round(
      operator.similarOutcomeScore * SIMILAR_OUTCOME_WEIGHT +
        operator.globalPerformanceScore * GLOBAL_PERFORMANCE_WEIGHT
    );
  }

  const rankedOperators = (Object.values(scores) as any[]).sort(
    (a, b) => b.finalScore - a.finalScore
  );

  const selectedOperator =
    rankedOperators[0]?.finalScore > 0
      ? rankedOperators[0].operator
      : "Workflow Coordination Operator";

  return {
    selectedOperator,
    rankedOperators,
    selectedScore: rankedOperators[0]?.finalScore || 0,
    scoringWeights: {
      similarOutcomeWeight: SIMILAR_OUTCOME_WEIGHT,
      globalPerformanceWeight: GLOBAL_PERFORMANCE_WEIGHT,
    },
  };
}

function buildRoutePlan(input: {
  selectedOperator: string;
  routingDecision: any;
  outcomeEvidence: any;
  operatorPerformance: any[];
  snapshot: any;
}) {
  const selectedRank = input.routingDecision.rankedOperators.find(
    (operator: any) => operator.operator === input.selectedOperator
  );

  const similarCount = input.outcomeEvidence?.similarMemoryCount || 0;
  const topMemory = input.outcomeEvidence?.topSimilarMemories?.[0];

  const priority = safePriority(input.routingDecision.selectedScore);
  const confidence = Math.max(
    0.55,
    Math.min(0.95, input.routingDecision.selectedScore / 100)
  );

  return {
    operator: input.selectedOperator,
    reason: `Selected ${input.selectedOperator} using deterministic ZennX routing. The system weighted similar outcome evidence at ${
      SIMILAR_OUTCOME_WEIGHT * 100
    }% and global operator performance at ${
      GLOBAL_PERFORMANCE_WEIGHT * 100
    }%.`,
    priority,
    next_execution_chain:
      "Review lead context, execute the highest-priority follow-up or workflow action, record the result through complete-task or record-outcome, and allow operator performance to update from the outcome.",
    performance_basis:
      selectedRank?.globalPerformanceScore > 0
        ? `${input.selectedOperator} global performance score: ${selectedRank.globalPerformanceScore}.`
        : "No strong global performance score available for the selected operator.",
    memory_basis:
      similarCount > 0
        ? `${similarCount} similar learning memories were considered.`
        : "No similar learning memories were available; fallback relied on global performance and workflow continuity.",
    outcome_basis: topMemory
      ? `Top similar outcome: ${topMemory.title} with outcome ${topMemory.outcome} and score ${topMemory.outcome_score}.`
      : "No matching outcome memory strongly influenced this route.",
    confidence,
    deterministic: true,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leadId = Number(body.leadId);

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          error: "leadId is required",
        },
        { status: 400 }
      );
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error: "Lead not found",
        },
        { status: 404 }
      );
    }

    const [snapshot, operatorPerformance, outcomeIntelligence] =
      await Promise.all([
        getSystemSnapshot(),
        getOperatorPerformance(),
        getOutcomeIntelligence(leadId, lead),
      ]);

    const routingDecision = calculateDeterministicRouting({
      outcomeIntelligence,
      operatorPerformance,
    });

    const selectedOperator = routingDecision.selectedOperator;

    const compactOutcomeEvidence =
      outcomeIntelligence?.compactEvidence || {
        recommendedOperator: selectedOperator,
        similarMemoryCount: 0,
        topSimilarMemories: [],
        similarOperatorRanking: [],
      };

    const route = buildRoutePlan({
      selectedOperator,
      routingDecision,
      outcomeEvidence: compactOutcomeEvidence,
      operatorPerformance,
      snapshot,
    });

    await supabase
      .from("leads")
      .update({
        assigned_operator: selectedOperator,
        status: "operator_routed",
      })
      .eq("id", leadId);

    const { data: task } = await supabase
      .from("tasks")
      .insert({
        lead_id: leadId,
        company_name:
          lead.business_name || lead.company_name || "Unknown Business",
        task_title: `Deterministic Route: ${selectedOperator}`,
        task_description: `
ROUTING REASON:
${route.reason}

OUTCOME BASIS:
${route.outcome_basis}

PERFORMANCE BASIS:
${route.performance_basis}

MEMORY BASIS:
${route.memory_basis}

NEXT EXECUTION CHAIN:
${route.next_execution_chain}
        `,
        priority: route.priority,
        assigned_agent: selectedOperator,
        due_time: "active",
        status: "in_progress",
      })
      .select()
      .single();

    const { data: event } = await supabase
      .from("operational_events")
      .insert({
        event_type: "deterministic_operator_routed",
        title: `Lead routed to ${selectedOperator}`,
        description: route.reason,
        priority: route.priority,
        source: "route_operator",
      })
      .select()
      .single();

    const { data: memory } = await supabase
      .from("operator_memory")
      .insert({
        memory_type: "deterministic_routing",
        memory_category: "routing",
        title: `Deterministic route to ${selectedOperator}`,
        content: `
Lead was routed using deterministic ZennX intelligence.

Selected operator:
${selectedOperator}

Reason:
${route.reason}

Outcome basis:
${route.outcome_basis}

Performance basis:
${route.performance_basis}

Memory basis:
${route.memory_basis}

Next execution chain:
${route.next_execution_chain}
        `,
        source: "route_operator",
        source_id: event?.id || null,
        company_name:
          lead.business_name || lead.company_name || "Unknown Business",
        lead_id: leadId,
        task_id: task?.id || null,
        assigned_operator: selectedOperator,
        priority: route.priority,
        outcome: "operator_routed",
        outcome_score: route.confidence * 10,
        tags: ["routing", "deterministic", "outcome-aware", route.priority],
        confidence: route.confidence,
        embedding_status: "pending",
        metadata: {
          route,
          routingDecision,
          compactOutcomeEvidence,
          systemMetrics: snapshot.metrics,
          operatorPerformance,
        },
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      route,
      task,
      event,
      memory,
      routingDecision,
      compactOutcomeEvidence,
      selectedOperator,
    });
  } catch (error) {
    console.error("ROUTE OPERATOR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Operator routing failed",
      },
      { status: 500 }
    );
  }
}