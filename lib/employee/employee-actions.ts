import {
  InformationExtractor,
  type ExtractedLeadInformation,
} from "./information-extractor";

import { LeadMemory } from "./lead-memory";

export type EmployeeAction =
  | "NO_ACTION"
  | "RESPOND"
  | "REQUEST_ESTIMATE"
  | "BOOK_APPOINTMENT"
  | "UPDATE_CRM"
  | "SEND_SMS"
  | "SEND_EMAIL"
  | "CREATE_TASK"
  | "FOLLOW_UP"
  | "ESCALATE_OWNER";

export interface EmployeeActionInput {
  customerId?: string;
  content: string;
  source: string;
}

export type LeadQualificationField =
  | "name"
  | "phone"
  | "serviceType"
  | "location"
  | "urgency"
  | "preferredTime";

export interface EmployeeLeadRecord {
  id: string;
  customerId?: string;
  source: string;
  requestType: "estimate";
  status: "qualifying" | "qualified";
  summary: string;
  qualification: ExtractedLeadInformation;
  missingFields: LeadQualificationField[];
  nextQuestion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeActionResult {
  success: boolean;
  action: EmployeeAction;
  message: string;
  data?: EmployeeLeadRecord;
}

const requiredQualificationFields: LeadQualificationField[] = [
  "name",
  "phone",
  "serviceType",
  "location",
  "urgency",
  "preferredTime",
];

const qualificationQuestions: Record<LeadQualificationField, string> = {
  name: "What's your name?",
  phone: "What's the best phone number to reach you?",
  serviceType: "What type of service do you need?",
  location: "What city or area is the property located in?",
  urgency: "How urgent is the issue?",
  preferredTime: "What day or time works best for you?",
};

export class EmployeeActions {
  private readonly extractor = new InformationExtractor();
  private readonly leadMemory = new LeadMemory();

  private readonly leadIds = new Map<string, string>();
  private readonly leadCreatedAt = new Map<string, string>();
  private readonly leadSummaries = new Map<string, string[]>();

  public async execute(
    action: EmployeeAction,
    input: EmployeeActionInput,
  ): Promise<EmployeeActionResult> {
    switch (action) {
      case "REQUEST_ESTIMATE":
        return this.processEstimateLead(input);

      case "RESPOND":
        if (this.hasExistingLead(input)) {
          return this.processEstimateLead(input);
        }

        return this.createWorkflowResult(
          action,
          "Response workflow started.",
        );

      case "BOOK_APPOINTMENT":
        return this.createWorkflowResult(
          action,
          "Appointment workflow started.",
        );

      case "UPDATE_CRM":
        return this.createWorkflowResult(
          action,
          "CRM update workflow started.",
        );

      case "SEND_SMS":
        return this.createWorkflowResult(
          action,
          "SMS workflow started.",
        );

      case "SEND_EMAIL":
        return this.createWorkflowResult(
          action,
          "Email workflow started.",
        );

      case "CREATE_TASK":
        return this.createWorkflowResult(
          action,
          "Task creation workflow started.",
        );

      case "FOLLOW_UP":
        return this.createWorkflowResult(
          action,
          "Follow-up workflow started.",
        );

      case "ESCALATE_OWNER":
        return this.createWorkflowResult(
          action,
          "Owner escalation workflow started.",
        );

      default:
        return {
          success: true,
          action: "NO_ACTION",
          message: "No action required.",
        };
    }
  }

  private processEstimateLead(
    input: EmployeeActionInput,
  ): EmployeeActionResult {
    const memoryKey = this.getMemoryKey(input);
    const incomingInformation = this.extractor.extract(input.content);

    const memoryRecord = this.leadMemory.merge(
      memoryKey,
      input.source,
      incomingInformation,
    );

    const qualification = memoryRecord.qualification;

    const missingFields = requiredQualificationFields.filter(
      (field) => !qualification[field],
    );

    const nextMissingField = missingFields[0];
    const now = new Date().toISOString();

    const leadId =
      this.leadIds.get(memoryKey) ?? crypto.randomUUID();

    const createdAt =
      this.leadCreatedAt.get(memoryKey) ?? now;

    this.leadIds.set(memoryKey, leadId);
    this.leadCreatedAt.set(memoryKey, createdAt);

    const summaries =
      this.leadSummaries.get(memoryKey) ?? [];

    if (input.content.trim()) {
      summaries.push(input.content.trim());
    }

    this.leadSummaries.set(memoryKey, summaries);

    const lead: EmployeeLeadRecord = {
      id: leadId,
      customerId: input.customerId,
      source: input.source,
      requestType: "estimate",
      status:
        missingFields.length === 0
          ? "qualified"
          : "qualifying",
      summary: summaries.join(" "),
      qualification,
      missingFields,
      nextQuestion: nextMissingField
        ? qualificationQuestions[nextMissingField]
        : undefined,
      createdAt,
      updatedAt: now,
    };

    console.log("Updated estimate lead:", lead);

    return {
      success: true,
      action: "REQUEST_ESTIMATE",
      message:
        lead.status === "qualified"
          ? "Estimate lead fully qualified."
          : "Estimate qualification updated.",
      data: lead,
    };
  }

  private hasExistingLead(
    input: EmployeeActionInput,
  ): boolean {
    return Boolean(
      this.leadMemory.get(this.getMemoryKey(input)),
    );
  }

  private getMemoryKey(
    input: EmployeeActionInput,
  ): string {
    return (
      input.customerId ??
      `${input.source}:anonymous`
    );
  }

  private createWorkflowResult(
    action: EmployeeAction,
    message: string,
  ): EmployeeActionResult {
    return {
      success: true,
      action,
      message,
    };
  }
}