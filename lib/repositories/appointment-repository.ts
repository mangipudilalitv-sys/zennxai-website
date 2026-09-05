import { BaseRepository } from "./base-repository";

export type AppointmentStatus =
  | "scheduled"
  | "cancelled"
  | "completed";

export interface CreateAppointmentRecord {
  business_id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
}

export interface UpdateAppointmentRecord {
  start_time?: string;
  end_time?: string;
  status?: AppointmentStatus;
  notes?: string;
}

export class AppointmentRepository extends BaseRepository {
  private readonly TABLE = "appointments";

  async create(
    input: CreateAppointmentRecord,
  ) {
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

  async findByCustomerId(
    businessId: string,
    customerId: string,
  ) {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("business_id", businessId)
        .eq("customer_id", customerId)
        .order("start_time", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async findNextScheduledForCustomer(
    businessId: string,
    customerId: string,
  ) {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("business_id", businessId)
        .eq("customer_id", customerId)
        .eq("status", "scheduled")
        .gte(
          "end_time",
          new Date().toISOString(),
        )
        .order("start_time", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async findOverlapping(
    businessId: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ) {
    let query =
      this.table(this.TABLE)
        .select("*")
        .eq("business_id", businessId)
        .eq("status", "scheduled")
        .lt("start_time", endTime)
        .gt("end_time", startTime);

    if (excludeAppointmentId) {
      query =
        query.neq(
          "id",
          excludeAppointmentId,
        );
    }

    const { data, error } =
      await query
        .limit(1)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async update(
    businessId: string,
    id: string,
    updates: UpdateAppointmentRecord,
  ) {
    const { data, error } =
      await this.table(this.TABLE)
        .update(updates)
        .eq("business_id", businessId)
        .eq("id", id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
