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
    id: string,
  ): Promise<CustomerRecord | null> {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }

      throw error;
    }

    return data;
  }

  public async findByPhone(
    phone: string,
  ): Promise<CustomerRecord | null> {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("phone", phone)
        .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }

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
    id: string,
    updates: Partial<CustomerRecord>,
  ): Promise<CustomerRecord> {
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

  public async delete(
    id: string,
  ): Promise<void> {
    const { error } =
      await this.table(this.TABLE)
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }
  }
}