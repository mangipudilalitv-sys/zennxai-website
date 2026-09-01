import twilio from "twilio";

export interface SendSmsInput {
  to: string;
  message: string;
}

export interface SendSmsResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
}

export class SmsExecutor {
  public async send(
    input: SendSmsInput,
  ): Promise<SendSmsResult> {
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
          "Invalid destination phone number.",
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
            : "SMS delivery failed.",
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
