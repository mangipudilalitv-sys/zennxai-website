import {
  TaskService,
} from "@/lib/services/task-service";

import {
  TaskExecutor,
} from "@/lib/employee/execution/task-executor";

export class TaskWorker {
  private readonly tasks =
    new TaskService();

  private readonly executor =
    new TaskExecutor();

  public async run() {
    const claimed =
      await this.tasks.claimDue(25);

    const results: Array<{
      id: string;
      success: boolean;
      status: string;
      error?: string;
    }> = [];

    for (const task of claimed) {
      const attemptCount =
        task.attempt_count ?? 1;

      try {
        const execution =
          await this.executor.execute(
            task,
          );

        if (!execution.success) {
          throw new Error(
            execution.message,
          );
        }

        await this.tasks.complete(
          task.id,
          {
            message:
              execution.message,
            ...(execution.data ?? {}),
          },
        );

        results.push({
          id: task.id,
          success: true,
          status: "completed",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Task execution failed.";

        if (
          attemptCount >=
          (task.max_attempts ?? 3)
        ) {
          await this.tasks.fail(
            task.id,
            message,
          );

          results.push({
            id: task.id,
            success: false,
            status: "failed",
            error: message,
          });

          continue;
        }

        await this.tasks.retry(
          task.id,
          message,
          attemptCount,
        );

        results.push({
          id: task.id,
          success: false,
          status: "retry",
          error: message,
        });
      }
    }

    return {
      checkedAt:
        new Date().toISOString(),
      claimedCount:
        claimed.length,
      completedCount:
        results.filter(
          result =>
            result.status ===
            "completed",
        ).length,
      failedCount:
        results.filter(
          result =>
            result.status ===
            "failed",
        ).length,
      retryCount:
        results.filter(
          result =>
            result.status ===
            "retry",
        ).length,
      results,
    };
  }
}
