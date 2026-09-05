import { ConversationState } from "./conversation-state";
import { EmployeeGoal } from "./goal-engine";
import type { ActionLearningEvidence } from "@/lib/services/learning-service";

export type EmployeeAction =
  | "NO_ACTION"
  | "RESPOND"
  | "REQUEST_ESTIMATE"
  | "BOOK_APPOINTMENT"
  | "CANCEL_APPOINTMENT"
  | "RESCHEDULE_APPOINTMENT"
  | "FOLLOW_UP"
  | "UPDATE_CRM"
  | "SEND_SMS"
  | "SEND_EMAIL"
  | "ESCALATE_OWNER";

export interface DecisionContext {
  message: string;

  conversation?: ConversationState;

  goal?: EmployeeGoal;

  qualificationComplete: boolean;

  confidence: number;

  previousTranscript?: string;

  previousSummary?: string;

  actionLearning?: Partial<
    Record<
      EmployeeAction,
      ActionLearningEvidence
    >
  >;
}

export interface DecisionResult {
  action: EmployeeAction;

  score: number;

  reasoning: string[];
}

export class EmployeeBrain {
  public decide(
    context: DecisionContext,
  ): DecisionResult {
    const decisions: DecisionResult[] = [
      this.scoreEstimate(context),
      this.scoreBooking(context),
      this.scoreFollowUp(context),
      this.scoreRespond(context),
    ].map((decision) =>
      this.applyLearning(
        decision,
        context,
      ),
    );

    decisions.sort(
      (a, b) => b.score - a.score,
    );

    return decisions[0];
  }

  private applyLearning(
    decision: DecisionResult,
    context: DecisionContext,
  ): DecisionResult {
    const evidence =
      context.actionLearning?.[
        decision.action
      ];

    if (
      !evidence ||
      evidence.scoreAdjustment === 0
    ) {
      return decision;
    }

    const adjustment =
      Math.max(
        -10,
        Math.min(
          10,
          evidence.scoreAdjustment,
        ),
      );

    const sign =
      adjustment > 0 ? "+" : "";

    return {
      ...decision,
      score:
        decision.score + adjustment,
      reasoning: [
        ...decision.reasoning,
        `Durable learning adjusted ${decision.action} by ${sign}${adjustment} from ${evidence.executions} classified outcomes.`,
      ],
    };
  }

  private hasPreviousHistory(
    context: DecisionContext,
  ): boolean {
    return Boolean(
      context.previousTranscript?.trim() ||
        context.previousSummary?.trim(),
    );
  }

  private scoreEstimate(
    context: DecisionContext,
  ): DecisionResult {
    let score = 0;

    const reasoning: string[] = [];

    const text =
      context.message.toLowerCase();

    if (
      text.includes("estimate") ||
      text.includes("quote")
    ) {
      score += 80;

      reasoning.push(
        "Customer requested pricing.",
      );
    }

    if (
      context.goal?.type ===
      "QUALIFY_LEAD"
    ) {
      score += 20;

      reasoning.push(
        "Continuing existing goal.",
      );
    }

    return {
      action: "REQUEST_ESTIMATE",
      score,
      reasoning,
    };
  }

  private scoreBooking(
    context: DecisionContext,
  ): DecisionResult {
    let score = 0;

    const reasoning: string[] = [];

    if (
      context.qualificationComplete
    ) {
      score += 90;

      reasoning.push(
        "Lead is fully qualified.",
      );
    }

    return {
      action: "BOOK_APPOINTMENT",
      score,
      reasoning,
    };
  }

  private scoreFollowUp(
    context: DecisionContext,
  ): DecisionResult {
    let score = 0;

    const reasoning: string[] = [];

    if (
      context.conversation?.stage ===
      "FOLLOW_UP"
    ) {
      score += 75;

      reasoning.push(
        "Conversation requires follow-up.",
      );
    }

    return {
      action: "FOLLOW_UP",
      score,
      reasoning,
    };
  }

  private scoreRespond(
    context: DecisionContext,
  ): DecisionResult {
    const reasoning = [
      "Default conversational response.",
    ];

    let score = 10;

    if (this.hasPreviousHistory(context)) {
      score += 5;

      reasoning.push(
        "Previous customer history is available.",
      );
    }

    return {
      action: "RESPOND",
      score,
      reasoning,
    };
  }
}
