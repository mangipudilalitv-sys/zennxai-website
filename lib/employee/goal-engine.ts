export type GoalType =
  | "QUALIFY_LEAD"
  | "BOOK_APPOINTMENT"
  | "ANSWER_QUESTION"
  | "FOLLOW_UP"
  | "UPDATE_CRM"
  | "CLOSE_SALE"
  | "CUSTOM";

export type GoalStatus =
  | "NEW"
  | "ACTIVE"
  | "WAITING"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED";

export interface GoalProgress {
  completed: number;
  total: number;
}

export interface EmployeeGoal {
  id: string;
  customerId: string;
  type: GoalType;
  title: string;
  status: GoalStatus;
  progress: GoalProgress;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export class GoalEngine {
  private readonly goals = new Map<string, EmployeeGoal>();

  public createGoal(
    customerId: string,
    type: GoalType,
    title: string,
    metadata: Record<string, unknown> = {},
  ): EmployeeGoal {
    const goal: EmployeeGoal = {
      id: crypto.randomUUID(),
      customerId,
      type,
      title,
      status: "NEW",
      progress: {
        completed: 0,
        total: 1,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
    };

    this.goals.set(goal.id, goal);

    return goal;
  }

  public activate(goalId: string): EmployeeGoal | undefined {
    const goal = this.goals.get(goalId);

    if (!goal) {
      return;
    }

    goal.status = "ACTIVE";
    goal.updatedAt = new Date().toISOString();

    return goal;
  }

  public wait(goalId: string): EmployeeGoal | undefined {
    const goal = this.goals.get(goalId);

    if (!goal) {
      return;
    }

    goal.status = "WAITING";
    goal.updatedAt = new Date().toISOString();

    return goal;
  }

  public block(goalId: string): EmployeeGoal | undefined {
    const goal = this.goals.get(goalId);

    if (!goal) {
      return;
    }

    goal.status = "BLOCKED";
    goal.updatedAt = new Date().toISOString();

    return goal;
  }

  public completeStep(
    goalId: string,
    steps = 1,
  ): EmployeeGoal | undefined {
    const goal = this.goals.get(goalId);

    if (!goal) {
      return;
    }

    goal.progress.completed = Math.min(
      goal.progress.completed + steps,
      goal.progress.total,
    );

    if (
      goal.progress.completed >= goal.progress.total
    ) {
      goal.status = "COMPLETED";
    }

    goal.updatedAt = new Date().toISOString();

    return goal;
  }

  public setTotalSteps(
    goalId: string,
    total: number,
  ): EmployeeGoal | undefined {
    const goal = this.goals.get(goalId);

    if (!goal) {
      return;
    }

    goal.progress.total = Math.max(1, total);

    goal.updatedAt = new Date().toISOString();

    return goal;
  }

  public getGoal(
    goalId: string,
  ): EmployeeGoal | undefined {
    return this.goals.get(goalId);
  }

  public getCustomerGoals(
    customerId: string,
  ): EmployeeGoal[] {
    return [...this.goals.values()].filter(
      (goal) => goal.customerId === customerId,
    );
  }

  public getActiveGoal(
    customerId: string,
  ): EmployeeGoal | undefined {
    return this.getCustomerGoals(customerId).find(
      (goal) =>
        goal.status === "NEW" ||
        goal.status === "ACTIVE" ||
        goal.status === "WAITING",
    );
  }
}