import {
  FollowUpRepository,
  type CreateFollowUpInput,
  type FollowUpRecord,
} from "@/lib/repositories/followup-repository";

export class FollowUpService {
  private readonly repository =
    new FollowUpRepository();

  public async schedule(
    input: CreateFollowUpInput,
  ): Promise<FollowUpRecord> {
    return this.repository.create(input);
  }

  public async get(
    id: string,
  ): Promise<FollowUpRecord | null> {
    return this.repository.findById(id);
  }

  public async getForCustomer(
    customerId: string,
  ): Promise<FollowUpRecord[]> {
    return this.repository.findByCustomerId(
      customerId,
    );
  }

  public async claimDue(
    limit = 25,
  ): Promise<FollowUpRecord[]> {
    return this.repository.claimDue(limit);
  }

  public async getDue(
    now = new Date(),
  ): Promise<FollowUpRecord[]> {
    return this.repository.findDue(now);
  }

  public async markProcessing(
    id: string,
    attemptCount: number,
  ): Promise<FollowUpRecord> {
    return this.repository.update(id, {
      status: "processing",
      attempt_count: attemptCount,
      last_attempt_at:
        new Date().toISOString(),
      error_message: undefined,
    });
  }

  public async complete(
    id: string,
  ): Promise<FollowUpRecord> {
    return this.repository.update(id, {
      status: "completed",
      completed_at:
        new Date().toISOString(),
      error_message: undefined,
    });
  }

  public async fail(
    id: string,
    errorMessage: string,
  ): Promise<FollowUpRecord> {
    return this.repository.update(id, {
      status: "failed",
      error_message: errorMessage,
    });
  }

  public async rescheduleRetry(
    id: string,
    errorMessage: string,
    attemptCount: number,
  ): Promise<FollowUpRecord> {
    const retryDelayMs =
      Math.min(
        15 * 60 * 1000 *
          Math.pow(
            2,
            Math.max(
              0,
              attemptCount - 1,
            ),
          ),
        60 * 60 * 1000,
      );

    return this.repository.update(id, {
      status: "scheduled",
      scheduled_for:
        new Date(
          Date.now() + retryDelayMs,
        ).toISOString(),
      attempt_count: attemptCount,
      error_message: errorMessage,
    });
  }

  public async cancel(
    id: string,
  ): Promise<FollowUpRecord> {
    return this.repository.update(id, {
      status: "cancelled",
    });
  }
}
