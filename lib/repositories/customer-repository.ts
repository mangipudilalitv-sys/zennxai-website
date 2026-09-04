import { BaseRepository } from "./base-repository";

export interface CustomerRecord {
  id: string;
  business_id: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  created_at?: string;
  updated_at?: string;
}

export class CustomerRepository extends BaseRepository {
  private readonly TABLE = "customers";

  public async findById(
    businessId: string,
    id: string,
  ): Promise<CustomerRecord | null> {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("business_id", businessId)
        .eq("id", id)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  public async findByBusinessAndPhone(
    businessId: string,
    phone: string,
  ): Promise<CustomerRecord | null> {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("business_id", businessId)
        .eq("phone", phone)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  public async create(
    customer: Omit<
      CustomerRecord,
      "id" | "created_at" | "updated_at"
    >,
  ): Promise<CustomerRecord> {
    const { data, error } =
      await this.table(this.TABLE)
        .insert(customer)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  public async update(
    businessId: string,
    id: string,
    updates: Partial<
      Omit<CustomerRecord, "id" | "business_id">
    >,
  ): Promise<CustomerRecord> {
    const { data, error } =
      await this.table(this.TABLE)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId)
        .eq("id", id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  public async delete(
    businessId: string,
    id: string,
  ): Promise<void> {
    const { error } =
      await this.table(this.TABLE)
        .delete()
        .eq("business_id", businessId)
        .eq("id", id);

    if (error) {
      throw error;
    }
  }
}
