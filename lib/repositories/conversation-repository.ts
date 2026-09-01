import { BaseRepository } from "./base-repository";

export class ConversationRepository extends BaseRepository {
  private readonly TABLE = "conversations";

  async findByCustomerId(customerId: string) {
    const { data, error } = await this.table(this.TABLE)
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async create(conversation: {
    customer_id: string;
    source?: string;
    transcript?: string;
    sentiment?: string;
    summary?: string;
  }) {
    const { data, error } = await this.table(this.TABLE)
      .insert(conversation)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async update(
    id: string,
    updates: Record<string, unknown>,
  ) {
    const { data, error } = await this.table(this.TABLE)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async appendTranscript(
    id: string,
    existingTranscript: string,
    message: string,
  ) {
    return this.update(id, {
      transcript: existingTranscript
        ? `${existingTranscript}\n${message}`
        : message,
    });
  }
}