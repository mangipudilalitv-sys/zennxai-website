import { FollowUpService } from "@/lib/services/followup-service";

export type FollowUpStatus =
  | "scheduled"
  | "processing"
  | "completed"
  | "cancelled"
  | "failed";

export interface ScheduleFollowUpInput {
  customerId?: string;
  businessId?: string;
  phone?: string;
  customerName?: string;
  serviceType?: string;
  reason?: string;
  delayMs?: number;
}

export interface FollowUpRecord {
  id: string;
  customerId: string;
  businessId?: string;
  phone?: string;
  customerName?: string;
  serviceType?: string;
  reason: string;
  status: FollowUpStatus;
  scheduledFor: string;
  attemptCount: number;
  lastAttemptAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpResult {
  success: boolean;
  record?: FollowUpRecord;
  error?: string;
}

export class FollowUpExecutor {
  private readonly service =
    new FollowUpService();

  public async schedule(
    input: ScheduleFollowUpInput,
  ): Promise<FollowUpResult> {
    if (!input.customerId) {
      return {
        success: false,
        error:
          "Cannot schedule follow-up without a customer ID.",
      };
    }

    try {
      const delayMs =
        input.delayMs ??
        24 * 60 * 60 * 1000;

      const scheduledFor =
        new Date(
          Date.now() + delayMs,
        ).toISOString();

      const record =
        await this.service.schedule({
          customer_id:
            input.customerId,
          business_id:
            input.businessId,
          phone:
            input.phone,
          customer_name:
            input.customerName,
          service_type:
            input.serviceType,
          reason:
            input.reason ??
            "Appointment follow-up",
          scheduled_for:
            scheduledFor,
        });

      return {
        success: true,
        record: this.mapRecord(record),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Follow-up scheduling failed.",
      };
    }
  }

  public async get(
    id: string,
  ): Promise<FollowUpRecord | undefined> {
    const record =
      await this.service.get(id);

    return record
      ? this.mapRecord(record)
      : undefined;
  }

  public async getForCustomer(
    customerId: string,
  ): Promise<FollowUpRecord[]> {
    const records =
      await this.service.getForCustomer(
        customerId,
      );

    return records.map(record =>
      this.mapRecord(record),
    );
  }

  public async getDue(
    now = new Date(),
  ): Promise<FollowUpRecord[]> {
    const records =
      await this.service.getDue(now);

    return records.map(record =>
      this.mapRecord(record),
    );
  }

  public async complete(
    id: string,
  ): Promise<FollowUpRecord> {
    return this.mapRecord(
      await this.service.complete(id),
    );
  }

  public async cancel(
    id: string,
  ): Promise<FollowUpRecord> {
    return this.mapRecord(
      await this.service.cancel(id),
    );
  }

  private mapRecord(
    record: {
      id: string;
      customer_id: string;
      business_id?: string;
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
    },
  ): FollowUpRecord {
    return {
      id: record.id,
      customerId:
        record.customer_id,
      businessId:
        record.business_id,
      phone:
        record.phone,
      customerName:
        record.customer_name,
      serviceType:
        record.service_type,
      reason:
        record.reason,
      status:
        record.status,
      scheduledFor:
        record.scheduled_for,
      attemptCount:
        record.attempt_count,
      lastAttemptAt:
        record.last_attempt_at,
      completedAt:
        record.completed_at,
      errorMessage:
        record.error_message,
      createdAt:
        record.created_at,
      updatedAt:
        record.updated_at,
    };
  }
}
