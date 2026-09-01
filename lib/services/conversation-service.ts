import { ConversationRepository } from "@/lib/repositories/conversation-repository";

export class ConversationService {
  private readonly conversations =
    new ConversationRepository();

  async getOrCreate(customerId: string) {
    const existing =
      await this.conversations.findByCustomerId(
        customerId,
      );

    if (existing) {
      return existing;
    }

    return this.conversations.create({
      customer_id: customerId,
      transcript: "",
    });
  }

  async appendMessage(
    conversationId: string,
    transcript: string,
    message: string,
  ) {
    return this.conversations.appendTranscript(
      conversationId,
      transcript,
      message,
    );
  }

  async update(
    conversationId: string,
    updates: Record<string, unknown>,
  ) {
    return this.conversations.update(
      conversationId,
      updates,
    );
  }
}