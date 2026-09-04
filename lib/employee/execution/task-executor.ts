import {
  SmsExecutor,
} from "@/lib/employee/execution/sms-executor";

import {
  OwnerNotificationExecutor,
} from "@/lib/employee/execution/owner-notification-executor";

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

  private readonly ownerNotifications =
    new OwnerNotificationExecutor();

  public async execute(
    task: TaskRecord,
  ): Promise<TaskExecutionResult> {
    switch (
      task.action_type
    ) {
      case "SEND_SMS":
        return this.sendSms(task);

      case "ESCALATE_OWNER":
        return this.escalateOwner(task);

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

  private async escalateOwner(
    task: TaskRecord,
  ): Promise<TaskExecutionResult> {
    if (!task.business_id) {
      return {
        success: false,
        message:
          "ESCALATE_OWNER task has no business identity.",
        data: {
          terminal: true,
          reason:
            "missing_business_id",
        },
      };
    }

    const payload =
      task.payload ?? {};

    const ownerPhoneNumber =
      typeof payload.ownerPhoneNumber ===
      "string"
        ? payload.ownerPhoneNumber
        : undefined;

    if (!ownerPhoneNumber) {
      return {
        success: false,
        message:
          "Owner escalation retained, but no owner phone number is configured.",
        data: {
          terminal: true,
          reason:
            "missing_owner_phone",
          escalationRetained: true,
        },
      };
    }

    const summary =
      typeof payload.summary === "string"
        ? payload.summary
        : typeof payload.request === "string"
          ? payload.request
          : "Customer requires owner attention.";

    const message =
      `ZennX owner escalation: ${summary}`;

    const result =
      await this.ownerNotifications.send({
        businessId:
          task.business_id,
        to:
          ownerPhoneNumber,
        message,
      });

    if (!result.success) {
      return {
        success: false,
        message:
          result.error ??
          "Owner notification failed.",
      };
    }

    return {
      success: true,
      message:
        "Owner notified successfully.",
      data: {
        sid:
          result.sid,
        status:
          result.status,
        ownerNotified:
          true,
      },
    };
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

    if (!task.business_id) {
      return {
        success: false,
        message:
          "SEND_SMS task has no business identity.",
        data: {
          terminal: true,
          reason:
            "missing_business_id",
        },
      };
    }

    const result =
      await this.sms.send({
        businessId:
          task.business_id,
        to,
        message,
      });

    if (!result.success) {
      if (
        result.blocked === true ||
        result.status === "suppressed"
      ) {
        return {
          success: false,
          message:
            result.error ??
            "SMS suppressed.",
          data: {
            terminal: true,
            blocked: true,
            status:
              "suppressed",
            reason:
              "sms_opt_out",
          },
        };
      }

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
        sid:
          result.sid,
        status:
          result.status,
      },
    };
  }
}
