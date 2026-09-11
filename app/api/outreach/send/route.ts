import { NextResponse } from "next/server";

import {
  isAuthorizedInternalRequest,
  resolveAuthorizedBusinessId,
} from "@/app/lib/internal-api-auth";
import {
  supabaseServer,
} from "@/app/lib/supabase-server";
import {
  OutreachRepository,
} from "@/lib/repositories/outreach-repository";
import {
  OutreachService,
} from "@/lib/services/outreach-service";

const outreachRepository =
  new OutreachRepository();

const outreachService =
  new OutreachService(
    outreachRepository,
  );

function isBlockedTestEmail(
  email: string,
) {
  const normalized =
    email.trim().toLowerCase();

  return (
    normalized.endsWith(".example") ||
    normalized.endsWith("@example.com") ||
    normalized.endsWith("@example.org") ||
    normalized.endsWith("@example.net")
  );
}

export async function POST(
  request: Request,
) {
  try {
    if (
      !isAuthorizedInternalRequest(
        request,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json();

    const businessId =
      resolveAuthorizedBusinessId(
        body.businessId,
      ) || "";

    const messageId =
      String(
        body.messageId || "",
      ).trim();

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "businessId is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!messageId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "messageId is required",
        },
        {
          status: 400,
        },
      );
    }

    const message =
      await outreachRepository
        .findMessage(
          businessId,
          messageId,
        );

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Outreach message not found",
        },
        {
          status: 404,
        },
      );
    }

    if (
      message.status !== "approved"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Outreach message must be approved before delivery",
        },
        {
          status: 409,
        },
      );
    }

    if (
      message.channel !== "email"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only email outreach delivery is supported by this endpoint",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: contact,
      error: contactError,
    } =
      await supabaseServer
        .from("outreach_contacts")
        .select(
          "id, email, display_name, organization_name",
        )
        .eq(
          "business_id",
          businessId,
        )
        .eq(
          "id",
          message.contact_id,
        )
        .maybeSingle();

    if (contactError) {
      throw contactError;
    }

    if (!contact) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Outreach contact not found",
        },
        {
          status: 404,
        },
      );
    }

    const recipient =
      String(
        contact.email || "",
      ).trim();

    if (!recipient) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Outreach contact has no email address",
        },
        {
          status: 400,
        },
      );
    }

    if (
      isBlockedTestEmail(
        recipient,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Test/example email addresses cannot be delivered",
        },
        {
          status: 409,
        },
      );
    }

    const resendApiKey =
      String(
        process.env
          .RESEND_API_KEY || "",
      ).trim();

    const fromEmail =
      String(
        process.env
          .OUTREACH_FROM_EMAIL || "",
      ).trim();

    if (!resendApiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "RESEND_API_KEY is not configured",
        },
        {
          status: 500,
        },
      );
    }

    if (!fromEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OUTREACH_FROM_EMAIL is not configured",
        },
        {
          status: 500,
        },
      );
    }

    const providerResponse =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${resendApiKey}`,
            "Content-Type":
              "application/json",
            "Idempotency-Key":
              `outreach/${message.id}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [recipient],
            subject:
              "Quick question from ZennX",
            text: message.body,
          }),
        },
      );

    const providerData =
      await providerResponse.json()
        .catch(() => ({}));

    if (!providerResponse.ok) {
      console.error(
        "OUTREACH EMAIL PROVIDER ERROR:",
        providerData,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Email provider rejected outreach delivery",
          provider:
            providerData,
        },
        {
          status: 502,
        },
      );
    }

    const providerMessageId =
      String(
        providerData?.id || "",
      ).trim();

    if (!providerMessageId) {
      throw new Error(
        "Email provider returned no message id",
      );
    }

    const sentMessage =
      await outreachService
        .markSent(
          businessId,
          messageId,
          providerMessageId,
        );

    return NextResponse.json({
      success: true,
      provider:
        "resend",
      providerMessageId,
      message:
        sentMessage,
    });
  } catch (error) {
    console.error(
      "OUTREACH SEND ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Outreach delivery failed",
      },
      {
        status: 500,
      },
    );
  }
}
