import {
  SmsExecutor,
} from "@/lib/employee/execution/sms-executor";

import type {
  TaskRecord,
} from "@/lib/repositories/task-repository";

export interface TaskExecutionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export class TaskExecutor {
  private readonly sms =
    new SmsExecutor();

  public async execute(
    task: TaskRecord,
  ): Promise<TaskExecutionResult> {
    switch (
      task.action_type
    ) {
      case "SEND_SMS":
        return this.sendSms(task);

      case "NO_ACTION":
        return {
          success: true,
          message:
            "No action required.",
        };

      default:
        return {
          success: false,
          message:
            `Unsupported task action: ${task.action_type ?? "undefined"}`,
        };
    }
  }

  private async sendSms(
    task: TaskRecord,
  ): Promise<TaskExecutionResult> {
    const payload =
      task.payload ?? {};

    const to =
      typeof payload.to === "string"
        ? payload.to
        : undefined;

    const message =
      typeof payload.message === "string"
        ? payload.message
        : undefined;

    if (!to || !message) {
      return {
        success: false,
        message:
          "SEND_SMS task requires payload.to and payload.message.",
      };
    }

    const result =
      await this.sms.send({
        to,
        message,
      });

    if (!result.success) {
      return {
        success: false,
        message:
          result.error ??
          "SMS task failed.",
      };
    }

    return {
      success: true,
      message:
        "SMS task completed.",
      data: {
        sid: result.sid,
        status: result.status,
      },
    };
  }
}
