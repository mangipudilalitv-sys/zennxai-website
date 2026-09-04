import {
  InformationExtractor,
  type ExtractedLeadInformation,
} from "./information-extractor";

import { LeadMemory } from "./lead-memory";
import { AppointmentService } from "@/lib/services/appointment-service";
import { SmsExecutor } from "@/lib/employee/execution/sms-executor";
import { FollowUpExecutor } from "@/lib/employee/execution/followup-executor";
import { TaskService } from "@/lib/services/task-service";
import { BusinessCommunicationService } from "@/lib/services/business-communication-service";

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
  businessId?: string;
  content: string;
  source: string;
  qualification?: ExtractedLeadInformation;
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
  data?: unknown;
}

const requiredQualificationFields: LeadQualificationField[] = [
  "name",
  "phone",
  "serviceType",
  "location",
  "urgency",
  "preferredTime",
];

const qualificationQuestions: Record<
  LeadQualificationField,
  string
> = {
  name: "What's your name?",
  phone: "What's the best phone number to reach you?",
  serviceType: "What type of service do you need?",
  location: "What city or area is the property located in?",
  urgency: "How urgent is the issue?",
  preferredTime: "What day or time works best for you?",
};

export class EmployeeActions {
  private readonly extractor =
    new InformationExtractor();

  private readonly leadMemory =
    new LeadMemory();

  private readonly appointments =
    new AppointmentService();

  private readonly sms =
    new SmsExecutor();

  private readonly followUps =
    new FollowUpExecutor();

  private readonly tasks =
    new TaskService();

  private readonly communications =
    new BusinessCommunicationService();

  private readonly leadIds =
    new Map<string, string>();

  private readonly leadCreatedAt =
    new Map<string, string>();

  private readonly leadSummaries =
    new Map<string, string[]>();

  public async execute(
    action: EmployeeAction,
    input: EmployeeActionInput,
  ): Promise<EmployeeActionResult> {
    switch (action) {
      case "REQUEST_ESTIMATE":
        return this.processEstimateLead(input);

      case "RESPOND":
        if (
          this.hasExistingLead(input) ||
          this.hasLeadQualification(input)
        ) {
          return this.processEstimateLead(input);
        }

        return this.createWorkflowResult(
          action,
          "Response workflow started.",
        );

      case "BOOK_APPOINTMENT":
        return this.bookAppointment(input);

      case "UPDATE_CRM":
        return this.createWorkflowResult(
          action,
          "CRM update workflow started.",
        );

      case "SEND_SMS":
        return this.sendSms(input);

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
        return this.scheduleFollowUp(input);

      case "ESCALATE_OWNER":
        return this.escalateOwner(input);

      default:
        return {
          success: true,
          action: "NO_ACTION",
          message: "No action required.",
        };
    }
  }

  private async escalateOwner(
    input: EmployeeActionInput,
  ): Promise<EmployeeActionResult> {
    if (!input.businessId) {
      return {
        success: false,
        action: "ESCALATE_OWNER",
        message:
          "Cannot escalate without a business ID.",
      };
    }

    const qualification =
      input.qualification ??
      this.extractor.extract(input.content);

    const routing =
      await this.communications.getByBusinessId(
        input.businessId,
      );

    const summaryParts = [
      qualification.name
        ? `Customer: ${qualification.name}`
        : undefined,
      qualification.phone
        ? `Phone: ${qualification.phone}`
        : undefined,
      qualification.serviceType
        ? `Service: ${qualification.serviceType}`
        : undefined,
      qualification.location
        ? `Location: ${qualification.location}`
        : undefined,
      qualification.urgency
        ? `Urgency: ${qualification.urgency}`
        : undefined,
      `Request: ${input.content}`,
    ].filter(Boolean);

    const summary =
      summaryParts.join(" | ");

    try {
      const task =
        await this.tasks.create({
          business_id:
            input.businessId,
          customer_id:
            input.customerId,
          status: "scheduled",
          priority:
            qualification.urgency === "high" ||
            qualification.urgency === "critical"
              ? "high"
              : "normal",
          description:
            "Owner escalation required",
          action_type:
            "ESCALATE_OWNER",
          payload: {
            customerId:
              input.customerId,
            customerName:
              qualification.name,
            customerPhone:
              qualification.phone,
            serviceType:
              qualification.serviceType,
            location:
              qualification.location,
            urgency:
              qualification.urgency,
            source:
              input.source,
            request:
              input.content,
            summary,
            ownerPhoneNumber:
              routing?.ownerPhoneNumber,
          },
        });

      return {
        success: true,
        action: "ESCALATE_OWNER",
        message:
          routing?.ownerPhoneNumber
            ? "Owner escalation queued."
            : "Owner escalation queued for manual handling because no owner phone number is configured.",
        data: {
          taskId: task.id,
          status: task.status,
          ownerPhoneConfigured:
            Boolean(
              routing?.ownerPhoneNumber,
            ),
          summary,
        },
      };
    } catch (error) {
      return {
        success: false,
        action: "ESCALATE_OWNER",
        message:
          error instanceof Error
            ? error.message
            : "Owner escalation failed.",
      };
    }
  }

  private async bookAppointment(
    input: EmployeeActionInput,
  ): Promise<EmployeeActionResult> {
    if (!input.businessId) {
      return {
        success: false,
        action: "BOOK_APPOINTMENT",
        message: "Cannot book appointment without a business ID.",
      };
    }

    if (!input.customerId) {
      return {
        success: false,
        action: "BOOK_APPOINTMENT",
        message: "Cannot book appointment without a customer ID.",
      };
    }

    const qualification =
      input.qualification ??
      this.extractor.extract(input.content);

    if (!qualification.preferredTime) {
      return {
        success: false,
        action: "BOOK_APPOINTMENT",
        message: "Cannot book appointment without a preferred time.",
      };
    }

    const startTime =
      this.resolveAppointmentTime(
        qualification.preferredTime,
      );

    if (!startTime) {
      return {
        success: false,
        action: "BOOK_APPOINTMENT",
        message:
          "Preferred appointment time needs clarification before booking.",
        data: {
          preferredTime: qualification.preferredTime,
        },
      };
    }

    try {
      const appointment =
        await this.appointments.create({
          businessId: input.businessId,
          customerId: input.customerId,
          startTime,
          notes: [
            qualification.name
              ? `Customer: ${qualification.name}`
              : undefined,
            qualification.serviceType
              ? `Service: ${qualification.serviceType}`
              : undefined,
            qualification.location
              ? `Location: ${qualification.location}`
              : undefined,
            qualification.urgency
              ? `Urgency: ${qualification.urgency}`
              : undefined,
            `Requested time: ${qualification.preferredTime}`,
          ]
            .filter(Boolean)
            .join(" | "),
        });

      return {
        success: true,
        action: "BOOK_APPOINTMENT",
        message: "Appointment booked successfully.",
        data: appointment,
      };
    } catch (error) {
      return {
        success: false,
        action: "BOOK_APPOINTMENT",
        message:
          error instanceof Error
            ? `Appointment booking failed: ${error.message}`
            : "Appointment booking failed.",
      };
    }
  }

  private async sendSms(
    input: EmployeeActionInput,
  ): Promise<EmployeeActionResult> {
    const qualification =
      input.qualification ??
      this.extractor.extract(input.content);

    if (!qualification.phone) {
      return {
        success: false,
        action: "SEND_SMS",
        message:
          "Cannot send confirmation SMS without a phone number.",
      };
    }

    const customerName =
      qualification.name
        ? ` ${qualification.name}`
        : "";

    const service =
      qualification.serviceType
        ? ` for your ${qualification.serviceType}`
        : "";

    const requestedTime =
      qualification.preferredTime
        ? ` Requested time: ${qualification.preferredTime}.`
        : "";

    const message =
      `Hi${customerName}! Your appointment${service} has been scheduled successfully.` +
      requestedTime +
      " Reply to this message if you need help.";

    if (!input.businessId) {
      return {
        success: false,
        action: "SEND_SMS",
        message:
          "Cannot send SMS without a business identity.",
      };
    }

    const smsResult =
      await this.sms.send({
        businessId: input.businessId,
        to: qualification.phone,
        message,
      });

    if (!smsResult.success) {
      return {
        success: false,
        action: "SEND_SMS",
        message:
          `Confirmation SMS failed: ${
            smsResult.error ??
            "Unknown Twilio error."
          }`,
        data: smsResult,
      };
    }

    return {
      success: true,
      action: "SEND_SMS",
      message:
        "Confirmation SMS sent successfully.",
      data: smsResult,
    };
  }

  private async scheduleFollowUp(
    input: EmployeeActionInput,
  ): Promise<EmployeeActionResult> {
    const qualification =
      input.qualification ??
      this.extractor.extract(
        input.content,
      );

    const followUpResult =
      await this.followUps.schedule({
        customerId:
          input.customerId,
        businessId:
          input.businessId,
        phone:
          qualification.phone,
        customerName:
          qualification.name,
        serviceType:
          qualification.serviceType,
        reason:
          "Follow up after appointment booking",
      });

    if (
      !followUpResult.success ||
      !followUpResult.record
    ) {
      return {
        success: false,
        action: "FOLLOW_UP",
        message:
          followUpResult.error ??
          "Follow-up scheduling failed.",
      };
    }

    return {
      success: true,
      action: "FOLLOW_UP",
      message:
        `Follow-up scheduled for ${followUpResult.record.scheduledFor}.`,
      data:
        followUpResult.record,
    };
  }

  private resolveAppointmentTime(
    preferredTime: string,
  ): string | undefined {
    const value =
      preferredTime.trim().toLowerCase();

    const date = new Date();

    if (value.includes("tomorrow")) {
      date.setDate(date.getDate() + 1);

      if (value.includes("morning")) {
        date.setHours(9, 0, 0, 0);
      } else if (
        value.includes("afternoon")
      ) {
        date.setHours(14, 0, 0, 0);
      } else if (
        value.includes("evening")
      ) {
        date.setHours(17, 0, 0, 0);
      } else {
        date.setHours(9, 0, 0, 0);
      }

      return date.toISOString();
    }

    return undefined;
  }

  private processEstimateLead(
    input: EmployeeActionInput,
  ): EmployeeActionResult {
    const memoryKey =
      this.getMemoryKey(input);

    const incomingInformation =
      input.qualification ??
      this.extractor.extract(
        input.content,
      );

    const memoryRecord =
      this.leadMemory.merge(
        memoryKey,
        input.source,
        incomingInformation,
      );

    const qualification =
      memoryRecord.qualification;

    const missingFields =
      requiredQualificationFields.filter(
        field => !qualification[field],
      );

    const nextMissingField =
      missingFields[0];

    const now =
      new Date().toISOString();

    const leadId =
      this.leadIds.get(memoryKey) ??
      crypto.randomUUID();

    const createdAt =
      this.leadCreatedAt.get(memoryKey) ??
      now;

    this.leadIds.set(
      memoryKey,
      leadId,
    );

    this.leadCreatedAt.set(
      memoryKey,
      createdAt,
    );

    const summaries =
      this.leadSummaries.get(memoryKey) ??
      [];

    if (input.content.trim()) {
      summaries.push(
        input.content.trim(),
      );
    }

    this.leadSummaries.set(
      memoryKey,
      summaries,
    );

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
      nextQuestion:
        nextMissingField
          ? qualificationQuestions[
              nextMissingField
            ]
          : undefined,
      createdAt,
      updatedAt: now,
    };

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
      this.leadMemory.get(
        this.getMemoryKey(input),
      ),
    );
  }

  private hasLeadQualification(
    input: EmployeeActionInput,
  ): boolean {
    const qualification =
      input.qualification ??
      this.extractor.extract(
        input.content,
      );

    return requiredQualificationFields.some(
      field =>
        qualification[field] !== undefined &&
        qualification[field] !== null &&
        qualification[field] !== "",
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