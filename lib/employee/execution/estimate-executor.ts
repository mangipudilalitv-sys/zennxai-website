import {
  ActionExecutor,
  ActionExecutionContext,
  ActionExecutionResult,
} from "./action-executor";

export class EstimateExecutor
  implements ActionExecutor {

  readonly action =
    "REQUEST_ESTIMATE";

  async execute(
    context: ActionExecutionContext,
  ): Promise<ActionExecutionResult> {

    console.log(
      "Creating estimate...",
      context,
    );

    return {
      success: true,
      message: "Estimate workflow started.",
    };
  }
}