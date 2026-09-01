import { BaseRepository } from "./base-repository";

export class BusinessRepository extends BaseRepository {
  private readonly TABLE = "business_health";

  async get(businessId: string) {
    const { data, error } = await this.table(this.TABLE)
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async create(input: {
    business_id: string;
    open_leads?: number;
    active_tasks?: number;
    revenue?: number;
    missed_calls?: number;
  }) {
    const { data, error } = await this.table(this.TABLE)
      .insert(input)
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