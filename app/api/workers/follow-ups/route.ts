import { NextResponse } from "next/server";
import { FollowUpWorker } from "@/lib/employee/workers/followup-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret =
    process.env.AUTONOMOUS_WORKER_SECRET;

  if (!secret) {
    return (
      process.env.NODE_ENV !==
      "production"
    );
  }

  const auth =
    req.headers.get("authorization");

  return auth === `Bearer ${secret}`;
}

async function run(req: Request) {
  if (!authorized(req)) {
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

  try {
    const worker =
      new FollowUpWorker();

    const result =
      await worker.run();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "FOLLOW-UP WORKER ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Follow-up worker failed.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(
  req: Request,
) {
  return run(req);
}

export async function POST(
  req: Request,
) {
  return run(req);
}
