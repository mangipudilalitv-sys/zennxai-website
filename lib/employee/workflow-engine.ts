import type {
  ExtractedLeadInformation,
} from "./information-extractor";

export type EmployeeGoal =
  | "BOOK_QUALIFIED_ESTIMATE"
  | "FOLLOW_UP_LEAD"
  | "ESCALATE_URGENT_LEAD"
  | "CLOSE_SALE";

export type WorkflowStage =
  | "NEW"
  | "QUALIFYING"
  | "QUALIFIED"
  | "READY_TO_BOOK"
  | "BOOKED"
  | "FOLLOW_UP"
  | "CLOSED";

export type WorkflowObjective =
  | "COLLECT_NAME"
  | "COLLECT_PHONE"
  | "COLLECT_SERVICE_TYPE"
  | "COLLECT_LOCATION"
  | "COLLECT_URGENCY"
  | "COLLECT_PREFERRED_TIME"
  | "BOOK_APPOINTMENT"
  | "FOLLOW_UP"
  | "CLOSE_SALE"
  | "NO_ACTION";

export interface WorkflowState {
  customerId: string;
  goal: EmployeeGoal;
  stage: WorkflowStage;
  nextObjective: WorkflowObjective;
  qualification: ExtractedLeadInformation;
  completedObjectives: WorkflowObjective[];
  updatedAt: string;
}

const requiredQualificationOrder: Array<{
  field: keyof ExtractedLeadInformation;
  objective: WorkflowObjective;
}> = [
  { field: "name", objective: "COLLECT_NAME" },
  { field: "phone", objective: "COLLECT_PHONE" },
  { field: "serviceType", objective: "COLLECT_SERVICE_TYPE" },
  { field: "location", objective: "COLLECT_LOCATION" },
  { field: "urgency", objective: "COLLECT_URGENCY" },
  { field: "preferredTime", objective: "COLLECT_PREFERRED_TIME" },
];

export class WorkflowEngine {
  private readonly states = new Map<string, WorkflowState>();

  public update(
    customerId: string,
    qualification: ExtractedLeadInformation,
  ): WorkflowState {
    const existing = this.states.get(customerId);

    const completedObjectives: WorkflowObjective[] =
      requiredQualificationOrder
        .filter(({ field }) => Boolean(qualification[field]))
        .map(({ objective }) => objective);

    const nextMissing =
      requiredQualificationOrder.find(
        ({ field }) => !qualification[field],
      );

    const stage: WorkflowStage =
      nextMissing
        ? "QUALIFYING"
        : existing?.stage === "BOOKED"
          ? "BOOKED"
          : "READY_TO_BOOK";

    const nextObjective: WorkflowObjective =
      nextMissing?.objective ??
      (stage === "READY_TO_BOOK"
        ? "BOOK_APPOINTMENT"
        : "NO_ACTION");

    const state: WorkflowState = {
      customerId,
      goal:
        existing?.goal ??
        "BOOK_QUALIFIED_ESTIMATE",
      stage,
      nextObjective,
      qualification,
      completedObjectives,
      updatedAt: new Date().toISOString(),
    };

    this.states.set(customerId, state);

    return state;
  }

  public markBooked(
    customerId: string,
  ): WorkflowState | undefined {
    const existing = this.states.get(customerId);

    if (!existing) {
      return undefined;
    }

    const completedObjectives = Array.from(
      new Set<WorkflowObjective>([
        ...existing.completedObjectives,
        "BOOK_APPOINTMENT",
      ]),
    );

    const state: WorkflowState = {
      ...existing,
      stage: "BOOKED",
      nextObjective: "FOLLOW_UP",
      completedObjectives,
      updatedAt: new Date().toISOString(),
    };

    this.states.set(customerId, state);

    return state;
  }

  public markClosed(
    customerId: string,
  ): WorkflowState | undefined {
    const existing = this.states.get(customerId);

    if (!existing) {
      return undefined;
    }

    const completedObjectives = Array.from(
      new Set<WorkflowObjective>([
        ...existing.completedObjectives,
        "CLOSE_SALE",
      ]),
    );

    const state: WorkflowState = {
      ...existing,
      goal: "CLOSE_SALE",
      stage: "CLOSED",
      nextObjective: "NO_ACTION",
      completedObjectives,
      updatedAt: new Date().toISOString(),
    };

    this.states.set(customerId, state);

    return state;
  }

  public get(
    customerId: string,
  ): WorkflowState | undefined {
    return this.states.get(customerId);
  }
}