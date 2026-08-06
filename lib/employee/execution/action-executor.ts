export interface ActionExecutionContext {
  customerId?: string;
  source: string;
  content: string;
}

export interface ActionExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ActionExecutor {
  readonly action: string;

  execute(
    context: ActionExecutionContext,
  ): Promise<ActionExecutionResult>;
}