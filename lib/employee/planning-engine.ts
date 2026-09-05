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
  private readonly plans =
    new Map<string, ExecutionPlan>();

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
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString(),
      steps:
        this.buildSteps(
          workflow.nextObjective,
        ),
    };

    this.plans.set(
      customerId,
      plan,
    );

    return plan;
  }

  public getPlan(
    customerId: string,
  ) {
    return this.plans.get(
      customerId,
    );
  }

  public dependenciesCompleted(
    customerId: string,
    stepId: string,
  ): boolean {
    const plan =
      this.plans.get(customerId);

    const step =
      plan?.steps.find(
        item => item.id === stepId,
      );

    if (!plan || !step) {
      return false;
    }

    return step.dependsOn.every(
      dependencyId =>
        plan.steps.find(
          item =>
            item.id ===
            dependencyId,
        )?.status === "completed",
    );
  }

  public completeStep(
    customerId: string,
    stepId: string,
  ) {
    const plan =
      this.plans.get(customerId);

    const step =
      plan?.steps.find(
        item => item.id === stepId,
      );

    if (!plan || !step) return;

    step.status = "completed";
    plan.updatedAt =
      new Date().toISOString();

    if (
      plan.steps.every(
        item =>
          item.status ===
          "completed",
      )
    ) {
      plan.status = "completed";
    }
  }

  public failStep(
    customerId: string,
    stepId: string,
  ) {
    const plan =
      this.plans.get(customerId);

    const step =
      plan?.steps.find(
        item => item.id === stepId,
      );

    if (!plan || !step) return;

    step.status = "failed";
    plan.status = "failed";
    plan.updatedAt =
      new Date().toISOString();
  }

  public blockStep(
    customerId: string,
    stepId: string,
  ) {
    const plan =
      this.plans.get(customerId);

    const step =
      plan?.steps.find(
        item => item.id === stepId,
      );

    if (!plan || !step) return;

    step.status = "blocked";
    plan.status = "failed";
    plan.updatedAt =
      new Date().toISOString();
  }

  private buildSteps(
    objective: WorkflowObjective,
  ): PlanStep[] {
    switch (objective) {
      case "BOOK_APPOINTMENT": {
        const bookingStepId =
          crypto.randomUUID();

        return [
          {
            id: bookingStepId,
            title:
              "Create Appointment",
            description:
              "Book the customer's appointment.",
            action:
              "BOOK_APPOINTMENT",
            objective,
            dependsOn: [],
            status: "pending",
          },
          {
            id:
              crypto.randomUUID(),
            title:
              "Send Confirmation",
            description:
              "Send confirmation SMS.",
            action: "SEND_SMS",
            dependsOn: [
              bookingStepId,
            ],
            status: "pending",
          },
          {
            id:
              crypto.randomUUID(),
            title:
              "Schedule Follow Up",
            description:
              "Create follow-up reminder.",
            action: "FOLLOW_UP",
            dependsOn: [
              bookingStepId,
            ],
            status: "pending",
          },
        ];
      }

      case "CANCEL_APPOINTMENT":
        return [
          {
            id:
              crypto.randomUUID(),
            title:
              "Cancel Appointment",
            description:
              "Cancel the customer's next scheduled appointment.",
            action:
              "CANCEL_APPOINTMENT",
            objective,
            dependsOn: [],
            status: "pending",
          },
        ];

      case "RESCHEDULE_APPOINTMENT":
        return [
          {
            id:
              crypto.randomUUID(),
            title:
              "Reschedule Appointment",
            description:
              "Move the customer's next scheduled appointment.",
            action:
              "RESCHEDULE_APPOINTMENT",
            objective,
            dependsOn: [],
            status: "pending",
          },
        ];

      default:
        return [
          {
            id:
              crypto.randomUUID(),
            title:
              "Continue Conversation",
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
