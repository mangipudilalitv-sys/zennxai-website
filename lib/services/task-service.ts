import {
  TaskRepository,
  type CreateTaskInput,
  type TaskRecord,
} from "@/lib/repositories/task-repository";

export class TaskService {
  private readonly repository =
    new TaskRepository();

  public async create(
    input: CreateTaskInput,
  ): Promise<TaskRecord> {
    return this.repository.create(input);
  }

  public async get(
    id: string,
  ): Promise<TaskRecord | null> {
    return this.repository.findById(id);
  }

  public async claimDue(
    limit = 25,
  ): Promise<TaskRecord[]> {
    return this.repository.claimDue(limit);
  }

  public async complete(
    id: string,
    result: Record<string, unknown>,
  ): Promise<TaskRecord> {
    return this.repository.complete(
      id,
      result,
    );
  }

  public async retry(
    id: string,
    errorMessage: string,
    attemptCount: number,
  ): Promise<TaskRecord> {
    const delayMs =
      Math.min(
        5 * 60 * 1000 *
          Math.pow(
            2,
            Math.max(
              0,
              attemptCount - 1,
            ),
          ),
        60 * 60 * 1000,
      );

    const nextAttemptAt =
      new Date(
        Date.now() + delayMs,
      ).toISOString();

    return this.repository.retry(
      id,
      {
        errorMessage,
        nextAttemptAt,
      },
    );
  }

  public async fail(
    id: string,
    errorMessage: string,
  ): Promise<TaskRecord> {
    return this.repository.fail(
      id,
      errorMessage,
    );
  }
}
