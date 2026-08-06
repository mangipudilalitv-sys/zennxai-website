import {
  ActionExecutor,
  ActionExecutionContext,
  ActionExecutionResult,
} from "./action-executor";

export class ExecutionEngine {
  private readonly executors = new Map<
    string,
    ActionExecutor
  >();

  public register(
    executor: ActionExecutor,
  ) {
    this.executors.set(
      executor.action,
      executor,
    );
  }

  public async execute(
    action: string,
    context: ActionExecutionContext,
  ): Promise<ActionExecutionResult> {

    const executor =
      this.executors.get(action);

    if (!executor) {
      return {
        success: false,
        message: `No executor registered for ${action}`,
      };
    }

    return executor.execute(context);
  }

  public getCapabilities() {
    return [...this.executors.keys()];
  }
}