import { BaseRepository } from "./base-repository";

export interface LearningEventRow {
  id: string;
  business_id: string;
  customer_id: string | null;
  action: string;
  outcome: string;
  confidence: number;
  created_at: string;
}

export class LearningRepository extends BaseRepository {
  private readonly TABLE = "learning_events";

  async create(event: {
    business_id: string;
    customer_id?: string | null;
    action: string;
    outcome: string;
    confidence: number;
  }) {
    const { data, error } =
      await this.table(this.TABLE)
        .insert(event)
        .select()
        .single();

    if (error) throw error;

    return data;
  }

  async findRecentByBusinessAndAction(
    businessId: string,
    action: string,
    limit = 100,
  ): Promise<LearningEventRow[]> {
    if (!businessId) {
      throw new Error(
        "businessId is required for learning reads.",
      );
    }

    const { data, error } =
      await this.table(this.TABLE)
        .select(
          "id,business_id,customer_id,action,outcome,confidence,created_at",
        )
        .eq("business_id", businessId)
        .eq("action", action)
        .order("created_at", {
          ascending: false,
        })
        .limit(limit);

    if (error) throw error;

    return (data ?? []) as LearningEventRow[];
  }

  async deleteByIds(ids: string[]) {
    if (ids.length === 0) return;

    const { error } =
      await this.table(this.TABLE)
        .delete()
        .in("id", ids);

    if (error) throw error;
  }
}
