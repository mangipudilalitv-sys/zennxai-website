import {
  NextResponse,
} from "next/server";

import {
  TaskWorker,
} from "@/lib/employee/workers/task-worker";

export const runtime = "nodejs";
export const dynamic =
  "force-dynamic";

function authorized(
  req: Request,
): boolean {
  const secret =
    process.env
      .AUTONOMOUS_WORKER_SECRET;

  if (!secret) {
    return (
      process.env.NODE_ENV !==
      "production"
    );
  }

  return (
    req.headers.get(
      "authorization",
    ) ===
    `Bearer ${secret}`
  );
}

async function run(
  req: Request,
) {
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
      new TaskWorker();

    const result =
      await worker.run();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "TASK WORKER ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Task worker failed.",
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
