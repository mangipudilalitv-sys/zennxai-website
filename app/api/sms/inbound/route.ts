import { NextResponse } from "next/server";

import {
  isValidTwilioFormRequest,
} from "@/app/lib/twilio-webhook-auth";

import {
  BusinessCommunicationService,
} from "@/lib/services/business-communication-service";

import {
  EmployeeRuntime,
} from "@/lib/employee/employee-runtime";

import {
  SmsConsentService,
} from "@/lib/services/sms-consent-service";

const communications =
  new BusinessCommunicationService();

const runtime =
  new EmployeeRuntime();

const smsConsent =
  new SmsConsentService();

function twiml(message?: string) {
  const escaped =
    message
      ?.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const body = escaped
    ? `<Message>${escaped}</Message>`
    : "";

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    },
  );
}

function normalizeCommand(body: string) {
  return body
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function isStopCommand(command: string) {
  return [
    "STOP",
    "STOPALL",
    "UNSUBSCRIBE",
    "CANCEL",
    "END",
    "QUIT",
  ].includes(command);
}

function isStartCommand(command: string) {
  return [
    "START",
    "UNSTOP",
    "YES",
  ].includes(command);
}

function isHelpCommand(command: string) {
  return command === "HELP" ||
    command === "INFO";
}

export async function POST(req: Request) {
  try {
    const formData =
      await req.formData();

    const valid =
      await isValidTwilioFormRequest(
        req,
        formData,
      );

    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Twilio signature.",
        },
        {
          status: 401,
        },
      );
    }

    const from =
      String(
        formData.get("From") ?? "",
      ).trim();

    const to =
      String(
        formData.get("To") ?? "",
      ).trim();

    const body =
      String(
        formData.get("Body") ?? "",
      ).trim();

    if (!from || !to) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Inbound SMS is missing From or To.",
        },
        {
          status: 400,
        },
      );
    }

    const routing =
      await communications
        .findBusinessByTwilioNumber(to);

    if (!routing) {
      console.error(
        "[ZENNX SMS] Receiving number is not mapped to a business.",
        {
          to,
        },
      );

      /*
       * Return valid empty TwiML so Twilio does not repeatedly
       * retry a message that ZennX cannot safely tenant-route.
       */
      return twiml();
    }

    const command =
      normalizeCommand(body);

    /*
     * Twilio itself provides Advanced Opt-Out for supported
     * Messaging Services. We still intercept these keywords at
     * the application boundary so they never enter the employee
     * reasoning/workflow pipeline.
     *
     * Durable application-level consent state comes next.
     */
    if (isStopCommand(command)) {
      await smsConsent.unsubscribe(
        routing.businessId,
        from,
      );

      console.log(
        "[ZENNX SMS] Customer requested SMS opt-out.",
        {
          businessId:
            routing.businessId,
          from,
        },
      );

      return twiml(
        "ZennX: You have been unsubscribed and will no longer receive messages. Reply START to resubscribe.",
      );
    }

    if (isStartCommand(command)) {
      await smsConsent.subscribe(
        routing.businessId,
        from,
      );

      console.log(
        "[ZENNX SMS] Customer requested SMS opt-in.",
        {
          businessId:
            routing.businessId,
          from,
        },
      );

      return twiml(
        "ZennX: You have been resubscribed. Reply HELP for help or STOP to opt out.",
      );
    }

    if (isHelpCommand(command)) {
      return twiml(
        "ZennX: Reply with what you need help with and we'll assist you. Reply STOP to opt out.",
      );
    }

    if (!body) {
      return twiml(
        "ZennX: Please send a message describing what you need help with. Reply STOP to opt out.",
      );
    }

    /*
     * Important:
     * The Twilio From number is authoritative customer identity
     * for an inbound SMS. Include it in the content so the current
     * InformationExtractor / CustomerService pipeline resolves the
     * durable tenant-scoped customer.
     */
    const runtimeResult =
      await runtime.process({
        source: "sms",
        customerId: from,
        content:
          `${body}\nCustomer phone: ${from}`,
        timestamp: new Date(),
        businessId:
          routing.businessId,
      } as any);

    const response =
      runtimeResult.result?.message?.trim();

    if (!response) {
      return twiml(
        "ZennX: Thanks. We received your message and will follow up shortly.",
      );
    }

    return twiml(response);
  } catch (error) {
    console.error(
      "[ZENNX SMS] Inbound processing failed:",
      error,
    );

    /*
     * Return empty TwiML rather than exposing internal errors
     * or creating an uncontrolled Twilio retry loop.
     */
    return twiml();
  }
}

export function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed.",
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}
