import { BaseRepository } from "./base-repository";

export class WorkflowRepository extends BaseRepository {
  private readonly TABLE = "workflows";

  async findByCustomerId(customerId: string) {
    const { data, error } = await this.table(this.TABLE)
      .select("*")
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async create(workflow: {
    customer_id: string;
    stage: string;
    goal: string;
    current_step: string;
    completed_steps: unknown;
  }) {
    const { data, error } = await this.table(this.TABLE)
      .insert(workflow)
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
}