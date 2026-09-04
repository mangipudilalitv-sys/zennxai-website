import { BaseRepository } from "./base-repository";

export interface ConversationRecord {
  id: string;
  customer_id: string;
  source?: string;
  transcript?: string;
  sentiment?: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
}

export class ConversationRepository extends BaseRepository {
  private readonly TABLE = "conversations";

  public async findLatestByCustomerId(
    customerId: string,
  ): Promise<ConversationRecord | null> {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  public async create(
    conversation: {
      customer_id: string;
      source?: string;
      transcript?: string;
      sentiment?: string;
      summary?: string;
    },
  ): Promise<ConversationRecord> {
    const { data, error } =
      await this.table(this.TABLE)
        .insert(conversation)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  public async update(
    id: string,
    updates: {
      source?: string;
      transcript?: string;
      sentiment?: string;
      summary?: string;
    },
  ): Promise<ConversationRecord> {
    const { data, error } =
      await this.table(this.TABLE)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
