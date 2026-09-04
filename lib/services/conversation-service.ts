import {
  ConversationRepository,
  type ConversationRecord,
} from "@/lib/repositories/conversation-repository";

export class ConversationService {
  private readonly conversations =
    new ConversationRepository();

  public async getOrCreate(
    customerId: string,
    source?: string,
  ): Promise<ConversationRecord> {
    const existing =
      await this.conversations.findLatestByCustomerId(
        customerId,
      );

    if (existing) {
      return existing;
    }

    return this.conversations.create({
      customer_id: customerId,
      source,
      transcript: "",
      summary: "",
    });
  }

  public async recordTurn(input: {
    customerId: string;
    source?: string;
    customerMessage: string;
    employeeMessage?: string;
    summary?: string;
  }): Promise<ConversationRecord> {
    const conversation =
      await this.getOrCreate(
        input.customerId,
        input.source,
      );

    const entries: string[] = [];

    if (input.customerMessage.trim()) {
      entries.push(
        `CUSTOMER: ${input.customerMessage.trim()}`,
      );
    }

    if (input.employeeMessage?.trim()) {
      entries.push(
        `ZENNX: ${input.employeeMessage.trim()}`,
      );
    }

    const addition = entries.join("\n");

    const transcript =
      conversation.transcript && addition
        ? `${conversation.transcript}\n${addition}`
        : conversation.transcript || addition;

    return this.conversations.update(
      conversation.id,
      {
        source:
          input.source ??
          conversation.source,
        transcript,
        summary:
          input.summary ??
          conversation.summary,
      },
    );
  }

  public async getHistory(
    customerId: string,
  ): Promise<ConversationRecord | null> {
    return this.conversations.findLatestByCustomerId(
      customerId,
    );
  }
}
