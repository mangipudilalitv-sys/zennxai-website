import { EmployeeAction } from "./employee-actions";
import type { WorkflowObjective } from "./workflow-engine";

export type PlanStepStatus =
  | "pending"
  | "completed"
  | "failed"
  | "blocked";

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  action: EmployeeAction;
  objective?: WorkflowObjective;
  dependsOn: string[];
  status: PlanStepStatus;
}

export interface ExecutionPlan {
  id: string;
  customerId: string;
  goal: string;
  status: "active" | "completed" | "failed";
  steps: PlanStep[];
  createdAt: string;
  updatedAt: string;
}

export class PlanningEngine {
  private readonly plans = new Map<string, ExecutionPlan>();

  public createPlan(
    customerId: string,
    workflow: {
      nextObjective: WorkflowObjective;
      stage: string;
    },
  ): ExecutionPlan {

    const plan: ExecutionPlan = {
      id: crypto.randomUUID(),
      customerId,
      goal: workflow.stage,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: this.buildSteps(workflow.nextObjective),
    };

    this.plans.set(customerId, plan);

    return plan;
  }

  public getPlan(customerId: string) {
    return this.plans.get(customerId);
  }

  public completeStep(
    customerId: string,
    stepId: string,
  ) {
    const plan = this.plans.get(customerId);

    if (!plan) return;

    const step = plan.steps.find(
      s => s.id === stepId,
    );

    if (!step) return;

    step.status = "completed";

    plan.updatedAt =
      new Date().toISOString();

    if (
      plan.steps.every(
        s => s.status === "completed",
      )
    ) {
      plan.status = "completed";
    }
  }

  private buildSteps(
    objective: WorkflowObjective,
  ): PlanStep[] {

    switch (objective) {

      case "BOOK_APPOINTMENT":

        return [

          {
            id: crypto.randomUUID(),
            title: "Create Appointment",
            description:
              "Book the customer's appointment.",
            action: "BOOK_APPOINTMENT",
            objective,
            dependsOn: [],
            status: "pending",
          },

          {
            id: crypto.randomUUID(),
            title: "Send Confirmation",
            description:
              "Send confirmation SMS.",
            action: "SEND_SMS",
            dependsOn: [],
            status: "pending",
          },

          {
            id: crypto.randomUUID(),
            title: "Schedule Follow Up",
            description:
              "Create follow-up reminder.",
            action: "FOLLOW_UP",
            dependsOn: [],
            status: "pending",
          },

        ];

      default:

        return [

          {
            id: crypto.randomUUID(),
            title: "Continue Conversation",
            description:
              "Gather more information.",
            action: "RESPOND",
            objective,
            dependsOn: [],
            status: "pending",
          },

        ];

    }

  }
}