import {
  EmployeeUnderstanding,
  type NormalizedEmployeeEvent,
} from "./employee-understanding";

import {
  EmployeeBrain,
  type EmployeeDecision,
} from "./employee-brain";

import {
  EmployeeActions,
  type EmployeeActionResult,
} from "./employee-actions";

export interface EmployeeProcessResult {
  success: boolean;
  event: NormalizedEmployeeEvent;
  decision: EmployeeDecision;
  result?: EmployeeActionResult;
  processedAt: string;
}

export class Employee {
  private readonly understanding: EmployeeUnderstanding;
  private readonly brain: EmployeeBrain;
  private readonly actions: EmployeeActions;

  public constructor() {
    this.understanding = new EmployeeUnderstanding();
    this.brain = new EmployeeBrain();
    this.actions = new EmployeeActions();
  }

  public async process(
    event: NormalizedEmployeeEvent,
  ): Promise<EmployeeProcessResult> {
    const normalizedEvent =
      this.understanding.normalize(event);

    const decision =
      this.brain.decideNextAction(normalizedEvent);

    if (!decision.shouldExecute) {
      return {
        success: true,
        event: normalizedEvent,
        decision,
        processedAt: new Date().toISOString(),
      };
    }

    const result = await this.actions.execute(
      decision.action,
      {
        customerId: normalizedEvent.customerId,
        content: normalizedEvent.content,
        source: normalizedEvent.source,
      },
    );

    return {
      success: result.success,
      event: normalizedEvent,
      decision,
      result,
      processedAt: new Date().toISOString(),
    };
  }
}