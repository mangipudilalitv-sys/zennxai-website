import { BaseRepository } from "./base-repository";

export type FollowUpStatus =
  | "scheduled"
  | "processing"
  | "completed"
  | "cancelled"
  | "failed";

export interface FollowUpRecord {
  id: string;
  business_id?: string;
  customer_id: string;
  phone?: string;
  customer_name?: string;
  service_type?: string;
  reason: string;
  status: FollowUpStatus;
  scheduled_for: string;
  attempt_count: number;
  last_attempt_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFollowUpInput {
  business_id?: string;
  customer_id: string;
  phone?: string;
  customer_name?: string;
  service_type?: string;
  reason: string;
  scheduled_for: string;
}

export class FollowUpRepository extends BaseRepository {
  private readonly TABLE = "follow_ups";

  public async create(
    input: CreateFollowUpInput,
  ): Promise<FollowUpRecord> {
    const { data, error } =
      await this.table(this.TABLE)
        .insert(input)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  public async findById(
    id: string,
  ): Promise<FollowUpRecord | null> {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  public async findByCustomerId(
    customerId: string,
  ): Promise<FollowUpRecord[]> {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("customer_id", customerId)
        .order("scheduled_for", {
          ascending: false,
        });

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  public async claimDue(
    limit = 25,
  ): Promise<FollowUpRecord[]> {
    const { data, error } =
      await this.rpc(
        "claim_due_follow_ups",
        {
          p_limit: limit,
        },
      );

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  public async findDue(
    now = new Date(),
  ): Promise<FollowUpRecord[]> {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("status", "scheduled")
        .lte(
          "scheduled_for",
          now.toISOString(),
        )
        .order("scheduled_for", {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  public async update(
    id: string,
    updates: Partial<FollowUpRecord>,
  ): Promise<FollowUpRecord> {
    const { data, error } =
      await this.table(this.TABLE)
        .update({
          ...updates,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
