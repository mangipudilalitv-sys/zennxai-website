import { BaseRepository } from "./base-repository";

export type TaskStatus =
  | "pending"
  | "scheduled"
  | "queued"
  | "processing"
  | "retry"
  | "completed"
  | "failed"
  | "cancelled";

export interface TaskRecord {
  id: string;
  business_id?: string | null;
  customer_id?: string | null;
  status?: TaskStatus | null;
  priority?: string | null;
  description?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  completed_at?: string | null;

  action_type?: string | null;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;

  attempt_count: number;
  max_attempts: number;
  last_attempt_at?: string | null;
  next_attempt_at?: string | null;
  error_message?: string | null;

  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  business_id?: string;
  customer_id?: string;
  status?: TaskStatus;
  priority?: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;

  action_type: string;
  payload?: Record<string, unknown>;
  max_attempts?: number;
}

export class TaskRepository extends BaseRepository {
  private readonly TABLE = "tasks";

  public async create(
    input: CreateTaskInput,
  ): Promise<TaskRecord> {
    const { data, error } =
      await this.table(this.TABLE)
        .insert({
          ...input,
          status:
            input.status ?? "scheduled",
          payload:
            input.payload ?? {},
          max_attempts:
            input.max_attempts ?? 3,
        })
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  public async findById(
    id: string,
  ): Promise<TaskRecord | null> {
    const { data, error } =
      await this.table(this.TABLE)
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  public async claimDue(
    limit = 25,
  ): Promise<TaskRecord[]> {
    const { data, error } =
      await this.rpc(
        "claim_due_tasks",
        {
          p_limit: limit,
        },
      );

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  public async update(
    id: string,
    updates: Partial<TaskRecord>,
  ): Promise<TaskRecord> {
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

  public async complete(
    id: string,
    result: Record<string, unknown>,
  ): Promise<TaskRecord> {
    return this.update(id, {
      status: "completed",
      result,
      completed_at:
        new Date().toISOString(),
      error_message: null,
      next_attempt_at: null,
    });
  }

  public async retry(
    id: string,
    input: {
      errorMessage: string;
      nextAttemptAt: string;
    },
  ): Promise<TaskRecord> {
    return this.update(id, {
      status: "retry",
      error_message:
        input.errorMessage,
      next_attempt_at:
        input.nextAttemptAt,
    });
  }

  public async fail(
    id: string,
    errorMessage: string,
  ): Promise<TaskRecord> {
    return this.update(id, {
      status: "failed",
      error_message:
        errorMessage,
      next_attempt_at: null,
    });
  }

  public async cancel(
    id: string,
    reason: string,
  ): Promise<TaskRecord> {
    return this.update(id, {
      status: "cancelled",
      error_message: reason,
      next_attempt_at: null,
    });
  }
}
