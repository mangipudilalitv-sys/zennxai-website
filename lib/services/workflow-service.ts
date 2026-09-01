import { WorkflowRepository } from "@/lib/repositories/workflow-repository";

export class WorkflowService {
  private readonly workflows =
    new WorkflowRepository();

  async getOrCreate(input: {
    customerId: string;
  }) {
    const existing =
      await this.workflows.findByCustomerId(
        input.customerId,
      );

    if (existing) {
      return existing;
    }

    return this.workflows.create({
      customer_id: input.customerId,
      stage: "NEW",
      goal: "BOOK_QUALIFIED_ESTIMATE",
      current_step: "COLLECT_NAME",
      completed_steps: [],
    });
  }

  async update(
    workflowId: string,
    updates: Record<string, unknown>,
  ) {
    return this.workflows.update(
      workflowId,
      updates,
    );
  }
}