import twilio from "twilio";

export interface OwnerNotificationInput {
  businessId: string;
  to: string;
  message: string;
}

export interface OwnerNotificationResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
}

export class OwnerNotificationExecutor {
  public async send(
    input: OwnerNotificationInput,
  ): Promise<OwnerNotificationResult> {
    if (!input.businessId) {
      return {
        success: false,
        error:
          "Owner notification blocked because business identity is missing.",
      };
    }

    const accountSid =
      process.env.TWILIO_ACCOUNT_SID;

    const authToken =
      process.env.TWILIO_AUTH_TOKEN;

    const from =
      process.env.TWILIO_PHONE_NUMBER;

    if (
      !accountSid ||
      !authToken ||
      !from
    ) {
      return {
        success: false,
        error:
          "Twilio configuration is incomplete.",
      };
    }

    const to =
      this.normalizePhoneNumber(
        input.to,
      );

    if (!to) {
      return {
        success: false,
        error:
          "Invalid owner phone number.",
      };
    }

    try {
      const client =
        twilio(
          accountSid,
          authToken,
        );

      const message =
        await client.messages.create({
          body: input.message,
          from,
          to,
        });

      return {
        success: true,
        sid: message.sid,
        status: message.status,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Owner notification delivery failed.",
      };
    }
  }

  private normalizePhoneNumber(
    phone: string,
  ): string | undefined {
    const trimmed =
      phone.trim();

    if (trimmed.startsWith("+")) {
      const digits =
        trimmed.replace(/\D/g, "");

      return digits.length >= 10
        ? `+${digits}`
        : undefined;
    }

    const digits =
      trimmed.replace(/\D/g, "");

    if (digits.length === 10) {
      return `+1${digits}`;
    }

    if (
      digits.length === 11 &&
      digits.startsWith("1")
    ) {
      return `+${digits}`;
    }

    return undefined;
  }
}
