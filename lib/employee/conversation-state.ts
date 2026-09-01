export type ConversationStage =
  | "NEW"
  | "UNDERSTANDING"
  | "QUALIFYING"
  | "SCHEDULING"
  | "FOLLOW_UP"
  | "COMPLETED"
  | "CLOSED";

export type WaitingOn =
  | "CUSTOMER"
  | "EMPLOYEE"
  | "BUSINESS"
  | "NONE";

export interface ConversationState {
  customerId: string;

  stage: ConversationStage;

  currentGoal?: string;

  lastCustomerIntent?: string;

  lastEmployeeAction?: string;

  waitingOn: WaitingOn;

  nextRecommendedAction?: string;

  confidence: number;

  updatedAt: string;
}

export class ConversationStateEngine {
  private readonly conversations =
    new Map<string, ConversationState>();

  public get(
    customerId: string,
  ): ConversationState | undefined {
    return this.conversations.get(
      customerId,
    );
  }

  public create(
    customerId: string,
  ): ConversationState {
    const state: ConversationState = {
      customerId,
      stage: "NEW",
      waitingOn: "NONE",
      confidence: 100,
      updatedAt:
        new Date().toISOString(),
    };

    this.conversations.set(
      customerId,
      state,
    );

    return state;
  }

  public getOrCreate(
    customerId: string,
  ): ConversationState {
    return (
      this.get(customerId) ??
      this.create(customerId)
    );
  }

  public update(
    customerId: string,
    updates: Partial<ConversationState>,
  ): ConversationState {
    const state =
      this.getOrCreate(customerId);

    Object.assign(
      state,
      updates,
    );

    state.updatedAt =
      new Date().toISOString();

    return state;
  }

  public syncWithWorkflow(
    customerId: string,
    workflow: {
      stage: string;
      nextObjective: string;
    },
  ): ConversationState {
    let stage: ConversationStage =
      "UNDERSTANDING";

    let waitingOn: WaitingOn =
      "NONE";

    switch (workflow.stage) {
      case "NEW":
        stage = "NEW";
        waitingOn = "NONE";
        break;

      case "QUALIFYING":
      case "QUALIFIED":
        stage = "QUALIFYING";
        waitingOn = "CUSTOMER";
        break;

      case "READY_TO_BOOK":
        stage = "SCHEDULING";
        waitingOn = "EMPLOYEE";
        break;

      case "BOOKED":
      case "FOLLOW_UP":
        stage = "FOLLOW_UP";
        waitingOn = "BUSINESS";
        break;

      case "CLOSED":
        stage = "CLOSED";
        waitingOn = "NONE";
        break;

      default:
        stage = "UNDERSTANDING";
        waitingOn = "NONE";
        break;
    }

    return this.update(
      customerId,
      {
        stage,
        waitingOn,
        nextRecommendedAction:
          workflow.nextObjective,
      },
    );
  }

  public advanceStage(
    customerId: string,
    stage: ConversationStage,
  ): ConversationState {
    return this.update(
      customerId,
      {
        stage,
      },
    );
  }

  public setGoal(
    customerId: string,
    goal: string,
  ): ConversationState {
    return this.update(
      customerId,
      {
        currentGoal: goal,
      },
    );
  }

  public setIntent(
    customerId: string,
    intent: string,
  ): ConversationState {
    return this.update(
      customerId,
      {
        lastCustomerIntent:
          intent,
      },
    );
  }

  public setEmployeeAction(
    customerId: string,
    action: string,
  ): ConversationState {
    return this.update(
      customerId,
      {
        lastEmployeeAction:
          action,
      },
    );
  }

  public waitForCustomer(
    customerId: string,
    nextAction: string,
  ): ConversationState {
    return this.update(
      customerId,
      {
        waitingOn: "CUSTOMER",
        nextRecommendedAction:
          nextAction,
      },
    );
  }

  public waitForBusiness(
    customerId: string,
    nextAction: string,
  ): ConversationState {
    return this.update(
      customerId,
      {
        waitingOn: "BUSINESS",
        nextRecommendedAction:
          nextAction,
      },
    );
  }

  public complete(
    customerId: string,
  ): ConversationState {
    return this.update(
      customerId,
      {
        stage: "COMPLETED",
        waitingOn: "NONE",
        nextRecommendedAction:
          undefined,
      },
    );
  }
}