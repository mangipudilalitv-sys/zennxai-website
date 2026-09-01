import { BaseRepository } from "./base-repository";

export class LeadRepository extends BaseRepository {
  private readonly TABLE = "leads";

  async create(input: {
    business_id: string;
    customer_id: string;
    status: string;
    source: string;
    summary: string;
    qualification: unknown;
    value?: number;
  }) {
    const { data, error } = await this.table(this.TABLE)
      .insert(input)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async findByCustomerId(
    customerId: string,
  ) {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    return data;
  }

  async update(
    id: string,
    updates: Record<string, unknown>,
  ) {
    const { data, error } =
      await this.table(this.TABLE)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;

    return data;
  }
}