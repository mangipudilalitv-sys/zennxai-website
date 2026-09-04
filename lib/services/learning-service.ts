import {
  LearningRepository,
  type LearningEventRow,
} from "@/lib/repositories/learning-repository";

export interface ActionLearningEvidence {
  action: string;
  executions: number;
  successes: number;
  failures: number;
  successRate: number;
  scoreAdjustment: number;
}

const SUCCESS_OUTCOMES = new Set([
  "success",
  "completed",
  "booked",
  "recovered",
]);

const FAILURE_OUTCOMES = new Set([
  "failed",
  "lost",
  "stalled",
  "needs_review",
]);

function classifyOutcome(
  outcome: string,
): "success" | "failure" | null {
  const normalized =
    outcome.trim().toLowerCase();

  if (SUCCESS_OUTCOMES.has(normalized)) {
    return "success";
  }

  if (FAILURE_OUTCOMES.has(normalized)) {
    return "failure";
  }

  return null;
}

function adjustmentForRate(
  executions: number,
  successRate: number,
) {
  if (executions < 3) return 0;

  if (successRate >= 0.75) return 10;
  if (successRate >= 0.6) return 5;
  if (successRate <= 0.25) return -10;
  if (successRate <= 0.4) return -5;

  return 0;
}

export class LearningService {
  private readonly learning =
    new LearningRepository();

  async record(input: {
    businessId: string;
    customerId?: string | null;
    action: string;
    outcome: string;
    confidence: number;
  }) {
    if (!input.businessId) {
      throw new Error(
        "businessId is required to record learning.",
      );
    }

    return this.learning.create({
      business_id: input.businessId,
      customer_id:
        input.customerId ?? null,
      action: input.action,
      outcome: input.outcome,
      confidence: input.confidence,
    });
  }

  async getActionEvidence(
    businessId: string,
    action: string,
  ): Promise<ActionLearningEvidence> {
    if (!businessId) {
      throw new Error(
        "businessId is required for learning evidence.",
      );
    }

    const events =
      await this.learning.findRecentByBusinessAndAction(
        businessId,
        action,
      );

    return this.buildEvidence(
      action,
      events,
    );
  }

  async getEvidenceForActions(
    businessId: string,
    actions: string[],
  ): Promise<Record<string, ActionLearningEvidence>> {
    if (!businessId) {
      throw new Error(
        "businessId is required for learning evidence.",
      );
    }

    const uniqueActions =
      [...new Set(actions)];

    const evidence =
      await Promise.all(
        uniqueActions.map((action) =>
          this.getActionEvidence(
            businessId,
            action,
          ),
        ),
      );

    return Object.fromEntries(
      evidence.map((item) => [
        item.action,
        item,
      ]),
    );
  }

  private buildEvidence(
    action: string,
    events: LearningEventRow[],
  ): ActionLearningEvidence {
    let successes = 0;
    let failures = 0;

    for (const event of events) {
      const classification =
        classifyOutcome(event.outcome);

      if (classification === "success") {
        successes += 1;
      }

      if (classification === "failure") {
        failures += 1;
      }
    }

    const executions =
      successes + failures;

    const successRate =
      executions === 0
        ? 0
        : successes / executions;

    return {
      action,
      executions,
      successes,
      failures,
      successRate,
      scoreAdjustment:
        adjustmentForRate(
          executions,
          successRate,
        ),
    };
  }
}
