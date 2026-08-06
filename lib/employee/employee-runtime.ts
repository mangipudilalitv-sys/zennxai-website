import {
  EmployeeUnderstanding,
  type NormalizedEmployeeEvent,
} from "./employee-understanding";

import { EmployeeBrain } from "./employee-brain";
import { EmployeeActions } from "./employee-actions";

import { ConversationStateEngine } from "./conversation-state";
import { GoalEngine } from "./goal-engine";
import { WorkflowEngine } from "./workflow-engine";
import { LearningEngine } from "./learning-engine";
import { BusinessBrain } from "./business-brain";

export class EmployeeRuntime {
  private readonly understanding =
    new EmployeeUnderstanding();

  private readonly conversation =
    new ConversationStateEngine();

  private readonly goals =
    new GoalEngine();

  private readonly workflow =
    new WorkflowEngine();

  private readonly brain =
    new EmployeeBrain();

  private readonly actions =
    new EmployeeActions();

  private readonly learning =
    new LearningEngine();

  private readonly business =
    new BusinessBrain();

  public async process(
    event: NormalizedEmployeeEvent,
  ) {

    // STEP 1
    const normalized =
      this.understanding.normalize(event);

    // STEP 2
    const customerId =
      normalized.customerId ??
      "anonymous";

    // STEP 3
    const conversation =
      this.conversation.getOrCreate(
        customerId,
      );

    // STEP 4
    const goal =
      this.goals.getActiveGoal(
        customerId,
      );

    // STEP 5
    const decision =
      this.brain.decide({
        message: normalized.content,
        conversation,
        goal,
        qualificationComplete: false,
        confidence: 100,
      });

    // STEP 6
    const result =
      await this.actions.execute(
        decision.action as never,
        {
          customerId,
          content: normalized.content,
          source: normalized.source,
        },
      );

    // STEP 7
    this.learning.record({
      customerId,
      workflow: "customer",
      action: decision.action,
      success: result.success,
      confidence: decision.score,
      outcome: result.message,
    });

    // STEP 8
    this.business.update(
      result,
    );

    return {
      normalized,
      conversation,
      goal,
      decision,
      result,
    };
  }
}