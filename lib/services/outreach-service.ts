import {
  type CreateOutreachMessageRecord,
  type OutreachMessageStatus,
  OutreachRepository,
} from "../repositories/outreach-repository";

export function canMarkOutreachMessageSent(
  status: OutreachMessageStatus,
  requiresApproval: boolean,
) {
  if (!requiresApproval) {
    return status === "approved" ||
      status === "scheduled";
  }

  return status === "approved" ||
    status === "scheduled";
}

export class OutreachService {
  constructor(
    private readonly outreach = new OutreachRepository(),
  ) {}

  async createDraft(
    input: Omit<
      CreateOutreachMessageRecord,
      "status" | "body"
    > & {
      body: string;
    },
  ) {
    const body = input.body.trim();

    if (!body) {
      throw new Error(
        "Outreach draft body cannot be empty.",
      );
    }

    const requiresApproval =
      input.requires_approval ?? true;

    return this.outreach.createMessage({
      ...input,
      body,
      requires_approval: requiresApproval,
      status: requiresApproval
        ? "pending_approval"
        : "approved",
    });
  }

  async approveDraft(
    businessId: string,
    messageId: string,
    approvedBy: string,
  ) {
    const message =
      await this.requireMessage(
        businessId,
        messageId,
      );

    if (
      message.status !== "draft" &&
      message.status !== "pending_approval"
    ) {
      throw new Error(
        "Only draft outreach messages can be approved.",
      );
    }

    return this.outreach.updateMessage(
      businessId,
      messageId,
      {
        status: "approved",
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      },
    );
  }

  async rejectDraft(
    businessId: string,
    messageId: string,
  ) {
    const message =
      await this.requireMessage(
        businessId,
        messageId,
      );

    if (
      message.status !== "draft" &&
      message.status !== "pending_approval"
    ) {
      throw new Error(
        "Only draft outreach messages can be rejected.",
      );
    }

    return this.outreach.updateMessage(
      businessId,
      messageId,
      {
        status: "rejected",
      },
    );
  }

  async markSent(
    businessId: string,
    messageId: string,
    externalMessageId?: string,
  ) {
    const message =
      await this.requireMessage(
        businessId,
        messageId,
      );

    if (
      !canMarkOutreachMessageSent(
        message.status as OutreachMessageStatus,
        Boolean(message.requires_approval),
      )
    ) {
      throw new Error(
        "Outreach message must be approved before sending.",
      );
    }

    return this.outreach.updateMessage(
      businessId,
      messageId,
      {
        status: "sent",
        sent_at: new Date().toISOString(),
        external_message_id: externalMessageId,
      },
    );
  }

  private async requireMessage(
    businessId: string,
    messageId: string,
  ) {
    const message =
      await this.outreach.findMessage(
        businessId,
        messageId,
      );

    if (!message) {
      throw new Error(
        "Outreach message was not found.",
      );
    }

    return message;
  }
}
