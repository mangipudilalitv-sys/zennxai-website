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

  async createGenerationReservation(
    input: Omit<
      CreateOutreachMessageRecord,
      "status" | "body"
    >,
  ) {
    return this.outreach.createMessage({
      ...input,
      body: "__generation_reserved__",
      status: "draft",
      requires_approval: true,
    });
  }

  async failGenerationReservation(
    businessId: string,
    messageId: string,
    errorMessage: string,
  ) {
    const message =
      await this.requireMessage(
        businessId,
        messageId,
      );

    if (message.status !== "draft") {
      return message;
    }

    return this.outreach.updateMessage(
      businessId,
      messageId,
      {
        status: "failed",
        error_message:
          errorMessage.trim().slice(0, 1000) ||
          "Outreach generation failed",
      },
    );
  }

  async finalizeGenerationReservation(
    businessId: string,
    messageId: string,
    body: string,
    personalizationContext:
      Record<string, unknown>,
  ) {
    const normalizedBody =
      body.trim();

    if (!normalizedBody) {
      throw new Error(
        "Outreach draft body cannot be empty.",
      );
    }

    return this.outreach.updateMessage(
      businessId,
      messageId,
      {
        body: normalizedBody,
        personalization_context:
          personalizationContext,
        status:
          "pending_approval",
        requires_approval: true,
      },
    );
  }

  async findPendingDraftForContact(
    businessId: string,
    contactId: string,
  ) {
    return this.outreach.findPendingMessageForContact(
      businessId,
      contactId,
    );
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

  async markFailed(
    businessId: string,
    messageId: string,
    errorMessage: string,
  ) {
    const message =
      await this.requireMessage(
        businessId,
        messageId,
      );

    if (
      message.status !== "approved" &&
      message.status !== "scheduled"
    ) {
      throw new Error(
        "Only approved or scheduled outreach messages can be marked failed.",
      );
    }

    const normalizedError =
      errorMessage.trim().slice(0, 1000) ||
      "Outreach delivery failed";

    return this.outreach.updateMessage(
      businessId,
      messageId,
      {
        status: "failed",
        error_message: normalizedError,
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
