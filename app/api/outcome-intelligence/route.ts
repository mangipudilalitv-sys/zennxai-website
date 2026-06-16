import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { getOperatorPerformance } from "@/app/lib/operator-system";

function normalize(value: unknown) {
  return String(value || "").toLowerCase();
}

function tokenize(value: unknown) {
  return normalize(value)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(" ")
    .filter((token) => token.length > 2);
}

function isTrueOutcomeMemory(memory: any) {
  return (
    memory.memory_type === "outcome_intelligence" ||
    memory.memory_category === "learning"
  );
}

function isSuccess(outcome: string) {
  return (
    outcome.includes("success") ||
    outcome.includes("completed") ||
    outcome.includes("recovered") ||
    outcome.includes("booked")
  );
}

function isFailure(outcome: string) {
  return (
    outcome.includes("failed") ||
    outcome.includes("lost") ||
    outcome.includes("stalled") ||
    outcome.includes("needs_review")
  );
}

function similarityScore(inputTokens: string[], memory: any) {
  const memoryText = [
    memory.title,
    memory.content,
    memory.company_name,
    memory.assigned_operator,
    memory.outcome,
    Array.isArray(memory.tags) ? memory.tags.join(" ") : "",
  ].join(" ");

  const memoryTokens = new Set(tokenize(memoryText));

  let score = 0;

  for (const token of inputTokens) {
    if (memoryTokens.has(token)) score += 1;
  }

  const outcome = normalize(memory.outcome);
  const priority = normalize(memory.priority);
  const outcomeScore = Number(memory.outcome_score || 0);

  if (isSuccess(outcome)) score += 3;
  if (isFailure(outcome)) score -= 2;
  if (priority === "high") score += 1;
  if (outcomeScore > 0) score += outcomeScore / 2;

  return score;
}

function summarizeBestOperator(memories: any[]) {
  const map: Record<string, any> = {};

  for (const memory of memories) {
    const operator =
      memory.assigned_operator ||
      memory.source ||
      "Unknown Operator";

    if (!map[operator]) {
      map[operator] = {
        operator,
        total: 0,
        success: 0,
        failure: 0,
        averageOutcomeScore: 0,
        score: 50,
      };
    }

    const outcome = normalize(memory.outcome);

    map[operator].total += 1;

    if (isSuccess(outcome)) map[operator].success += 1;
    if (isFailure(outcome)) map[operator].failure += 1;
  }

  return Object.values(map)
    .map((operator: any) => {
      const relevant = memories.filter((memory) => {
        const memoryOperator =
          memory.assigned_operator ||
          memory.source ||
          "Unknown Operator";

        return memoryOperator === operator.operator;
      });

      const scores = relevant
        .map((memory) => Number(memory.outcome_score || 0))
        .filter((score) => score > 0);

      const averageOutcomeScore =
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : 0;

      const successRate =
        operator.total > 0 ? operator.success / operator.total : 0;

      const score =
        50 +
        operator.success * 12 -
        operator.failure * 16 +
        averageOutcomeScore * 2 +
        successRate * 20;

      return {
        ...operator,
        averageOutcomeScore: Math.round(averageOutcomeScore * 10) / 10,
        successRate: Math.round(successRate * 100),
        score: Math.max(0, Math.min(100, Math.round(score))),
      };
    })
    .sort((a: any, b: any) => b.score - a.score);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const leadId = body.leadId ? Number(body.leadId) : null;
    const companyName = body.companyName || "";
    const serviceRequested = body.serviceRequested || "";
    const query = body.query || "";

    let lead: any = null;

    if (leadId) {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .maybeSingle();

      lead = data;
    }

    const searchText = [
      query,
      companyName,
      serviceRequested,
      lead?.business_name,
      lead?.company_name,
      lead?.service_requested,
      lead?.status,
      lead?.urgency,
      lead?.ai_summary,
    ].join(" ");

    const tokens = tokenize(searchText);

    const { data: memories, error } = await supabase
      .from("operator_memory")
      .select("*")
      .or("memory_type.eq.outcome_intelligence,memory_category.eq.learning")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          similarMemories: [],
        },
        { status: 500 }
      );
    }

    const trueOutcomeMemories = (memories || []).filter(isTrueOutcomeMemory);

    const scoredMemories = trueOutcomeMemories
      .map((memory) => ({
        ...memory,
        similarity_score: similarityScore(tokens, memory),
      }))
      .filter((memory) => memory.similarity_score > 0)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 8);

    const similarOperatorRanking = summarizeBestOperator(scoredMemories);
    const globalOperatorPerformance = await getOperatorPerformance();

    const bestSimilarOperator = similarOperatorRanking[0] || null;
    const bestGlobalOperator = globalOperatorPerformance[0] || null;

    const recommendedOperator =
      bestSimilarOperator?.operator ||
      bestGlobalOperator?.operator ||
      "Workflow Coordination Operator";

    const compactEvidence = {
      recommendedOperator,
      bestSimilarOperator,
      bestGlobalOperator,
      similarMemoryCount: scoredMemories.length,
      topSimilarMemories: scoredMemories.slice(0, 4).map((memory) => ({
        id: memory.id,
        title: memory.title,
        company_name: memory.company_name,
        assigned_operator: memory.assigned_operator,
        outcome: memory.outcome,
        outcome_score: memory.outcome_score,
        priority: memory.priority,
        similarity_score: memory.similarity_score,
        revenueImpact: memory.metadata?.revenueImpact || 0,
        nextRecommendedAction:
          memory.metadata?.nextRecommendedAction || null,
      })),
      similarOperatorRanking,
    };

    return NextResponse.json({
      success: true,
      query: searchText.trim(),
      lead,
      similarMemories: scoredMemories,
      similarMemoryCount: scoredMemories.length,
      similarOperatorRanking,
      bestSimilarOperator,
      bestGlobalOperator,
      recommendedOperator,
      globalOperatorPerformance,
      compactEvidence,
    });
  } catch (error) {
    console.error("OUTCOME INTELLIGENCE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve outcome intelligence",
        similarMemories: [],
      },
      { status: 500 }
    );
  }
}