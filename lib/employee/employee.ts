import {
  EmployeeUnderstanding,
  type NormalizedEmployeeEvent,
} from "./employee-understanding";

import { EmployeeRuntime } from "./employee-runtime";

export interface EmployeeProcessResult {
  success: boolean;
  event: NormalizedEmployeeEvent;
  conversation?: unknown;
  goal?: unknown;
  decision?: unknown;
  result?: unknown;
  processedAt: string;
}

export class Employee {
  private readonly understanding =
    new EmployeeUnderstanding();

  private readonly runtime =
    new EmployeeRuntime();

  public async process(
    event: NormalizedEmployeeEvent,
  ): Promise<EmployeeProcessResult> {

    const normalized =
      this.understanding.normalize(event);

    const runtimeResult =
      await this.runtime.process(
        normalized,
      );

    return {
      success:
        runtimeResult.result?.success ??
        true,

      event: normalized,

      conversation:
        runtimeResult.conversation,

      goal:
        runtimeResult.goal,

      decision:
        runtimeResult.decision,

      result:
        runtimeResult.result,

      processedAt:
        new Date().toISOString(),
    };
  }
}