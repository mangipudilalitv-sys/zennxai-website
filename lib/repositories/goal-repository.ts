import { BaseRepository } from "./base-repository";

export class GoalRepository extends BaseRepository {
  private readonly TABLE = "goals";

  async findByCustomerId(customerId: string) {
    const { data, error } = await this.table(this.TABLE)
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async create(goal: {
    customer_id: string;
    goal: string;
    priority: number;
    status: string;
  }) {
    const { data, error } = await this.table(this.TABLE)
      .insert(goal)
      .select()
      .single();

    if (error) throw error;

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

    if (error) throw error;

    return data;
  }
}