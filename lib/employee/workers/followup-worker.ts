import { FollowUpService } from "@/lib/services/followup-service";
import { SmsExecutor } from "@/lib/employee/execution/sms-executor";
import { LearningRepository } from "@/lib/repositories/learning-repository";

const MAX_ATTEMPTS = 3;

export interface FollowUpWorkerItemResult {
  id: string;
  success: boolean;
  status: string;
  error?: string;
}

export interface FollowUpWorkerResult {
  checkedAt: string;
  dueCount: number;
  completedCount: number;
  failedCount: number;
  results: FollowUpWorkerItemResult[];
}

export class FollowUpWorker {
  private readonly followUps =
    new FollowUpService();

  private readonly sms =
    new SmsExecutor();

  private readonly learning =
    new LearningRepository();

  public async run(
    now = new Date(),
  ): Promise<FollowUpWorkerResult> {
    const due =
      await this.followUps.claimDue(25);

    const results: FollowUpWorkerItemResult[] =
      [];

    for (const followUp of due) {
      const attemptCount =
        followUp.attempt_count;

      try {

        if (!followUp.phone) {
          throw new Error(
            "Follow-up has no customer phone number.",
          );
        }

        const message =
          this.buildMessage({
            customerName:
              followUp.customer_name,
            serviceType:
              followUp.service_type,
          });

        if (!followUp.business_id) {
          await this.followUps.cancel(
            followUp.id,
          );

          results.push({
            id: followUp.id,
            success: false,
            status: "cancelled",
            error:
              "Follow-up has no business identity.",
          });

          continue;
        }

        const smsResult =
          await this.sms.send({
            businessId: followUp.business_id,
            to: followUp.phone,
            message,
          });

        if (
          !smsResult.success &&
          (
            smsResult.blocked === true ||
            smsResult.status === "suppressed"
          )
        ) {
          await this.followUps.cancel(
            followUp.id,
          );

          try {
            await this.learning.create({
              business_id:
                followUp.business_id,
              customer_id:
                followUp.customer_id,
              action:
                "FOLLOW_UP_SMS_SUPPRESSED",
              outcome:
                "cancelled",
              confidence: 1,
            });
          } catch (learningError) {
            console.error(
              "FOLLOW-UP LEARNING ERROR:",
              learningError,
            );
          }

          results.push({
            id: followUp.id,
            success: false,
            status: "cancelled",
            error:
              smsResult.error ??
              "SMS suppressed.",
          });

          continue;
        }

        if (!smsResult.success) {
          throw new Error(
            smsResult.error ??
              "Twilio SMS send failed.",
          );
        }

        await this.followUps.complete(
          followUp.id,
        );

        try {
          await this.learning.create({
            business_id:
              followUp.business_id,
            customer_id:
              followUp.customer_id,
            action:
              "FOLLOW_UP_SMS_SENT",
            outcome:
              "completed",
            confidence: 1,
          });
        } catch (learningError) {
          console.error(
            "FOLLOW-UP LEARNING ERROR:",
            learningError,
          );
        }

        results.push({
          id: followUp.id,
          success: true,
          status: "completed",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown follow-up execution error.";

        console.error(
          "FOLLOW-UP EXECUTION ERROR:",
          followUp.id,
          message,
        );

        if (attemptCount >= MAX_ATTEMPTS) {
          await this.followUps.fail(
            followUp.id,
            message,
          );

          if (followUp.business_id) {
            try {
              await this.learning.create({
                business_id:
                  followUp.business_id,
                customer_id:
                  followUp.customer_id,
                action:
                  "FOLLOW_UP_SMS_SENT",
                outcome:
                  "failed",
                confidence: 1,
              });
            } catch (learningError) {
              console.error(
                "FOLLOW-UP LEARNING ERROR:",
                learningError,
              );
            }
          }

          results.push({
            id: followUp.id,
            success: false,
            status: "failed",
            error: message,
          });

          continue;
        }

        await this.followUps.rescheduleRetry(
          followUp.id,
          message,
          attemptCount,
        );

        results.push({
          id: followUp.id,
          success: false,
          status: "scheduled",
          error: message,
        });
      }
    }

    const completedCount =
      results.filter(
        result => result.status === "completed",
      ).length;

    const failedCount =
      results.filter(
        result => !result.success,
      ).length;

    return {
      checkedAt: now.toISOString(),
      dueCount: due.length,
      completedCount,
      failedCount,
      results,
    };
  }

  private buildMessage(input: {
    customerName?: string;
    serviceType?: string;
  }): string {
    const name =
      input.customerName
        ? ` ${input.customerName}`
        : "";

    const service =
      input.serviceType
        ? ` about your ${input.serviceType} request`
        : "";

    return (
      `ZennX: Hi${name}, we're following up${service}. ` +
      `Reply here if you need help or want to make an update. ` +
      `Reply STOP to opt out.`
    );
  }
}
