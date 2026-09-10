import { NextResponse } from "next/server";

import {
  isAuthorizedInternalRequest,
} from "@/app/lib/internal-api-auth";
import {
  OutreachRepository,
} from "@/lib/repositories/outreach-repository";
import {
  OutreachService,
} from "@/lib/services/outreach-service";

const outreachRepository = new OutreachRepository();
const outreachService = new OutreachService(
  outreachRepository,
);

function resolveBusinessId(
  request: Request,
  suppliedBusinessId?: unknown,
) {
  const supplied =
    String(suppliedBusinessId || "").trim();

  if (supplied) {
    return supplied;
  }

  const url = new URL(request.url);

  const queryBusinessId =
    String(
      url.searchParams.get("businessId") || "",
    ).trim();

  if (queryBusinessId) {
    return queryBusinessId;
  }

  return String(
    process.env.DEFAULT_BUSINESS_ID || "",
  ).trim();
}

export async function GET(request: Request) {
  try {
    if (!isAuthorizedInternalRequest(request)) {
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

    const businessId =
      resolveBusinessId(request);

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "businessId is required",
        },
        {
          status: 400,
        },
      );
    }

    const approvals =
      await outreachRepository
        .listPendingApprovals(
          businessId,
        );

    return NextResponse.json({
      success: true,
      businessId,
      count: approvals.length,
      approvals,
    });
  } catch (error) {
    console.error(
      "OUTREACH APPROVAL LIST ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load outreach approvals",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedInternalRequest(request)) {
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

    const body = await request.json();

    const businessId =
      resolveBusinessId(
        request,
        body.businessId,
      );

    const messageId =
      String(body.messageId || "").trim();

    const action =
      String(body.action || "")
        .trim()
        .toLowerCase();

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "businessId is required",
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
          error: "messageId is required",
        },
        {
          status: 400,
        },
      );
    }

    if (
      action !== "approve" &&
      action !== "reject"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "action must be approve or reject",
        },
        {
          status: 400,
        },
      );
    }

    const message =
      action === "approve"
        ? await outreachService.approveDraft(
            businessId,
            messageId,
            String(
              body.approvedBy ||
                "zennx-internal",
            ).trim(),
          )
        : await outreachService.rejectDraft(
            businessId,
            messageId,
          );

    return NextResponse.json({
      success: true,
      action,
      message,
    });
  } catch (error) {
    console.error(
      "OUTREACH APPROVAL ACTION ERROR:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Outreach approval action failed";

    const isStateError =
      message.includes("Only draft") ||
      message.includes("not found");

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: isStateError
          ? 409
          : 500,
      },
    );
  }
}
