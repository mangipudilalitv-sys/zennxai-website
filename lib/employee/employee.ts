import {
  EmployeeUnderstanding,
  NormalizedEmployeeEvent,
} from "./employee-understanding";

import {
  EmployeeBrain,
} from "./employee-brain";

import {
  EmployeeActions,
} from "./employee-actions";

export class Employee {

  private understanding = new EmployeeUnderstanding();

  private brain = new EmployeeBrain();

  private actions = new EmployeeActions();

  public async process(
    event: NormalizedEmployeeEvent
  ) {

    const normalized =
      this.understanding.normalize(event);

    const decision =
      this.brain.decideNextAction(normalized);

    if (!decision.shouldExecute) {
      return decision;
    }

    const result =
      await this.actions.execute(
        decision.action
      );

    return {
      decision,
      result,
    };

  }

}