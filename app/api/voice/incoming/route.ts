import { NextRequest } from "next/server";

import {
  isValidTwilioFormRequest,
} from "@/app/lib/twilio-webhook-auth";

function twiml(host: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://${host}/api/voice/media"/>
    </Connect>
</Response>`;
}

export async function GET() {
  return new Response(
    "Method Not Allowed",
    { status: 405 },
  );
}

export async function POST(
  req: NextRequest,
) {
  const formData =
    await req.formData();

  const valid =
    await isValidTwilioFormRequest(
      req,
      formData,
    );

  if (!valid) {
    return new Response(
      "Unauthorized",
      { status: 401 },
    );
  }

  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host");

  if (!host) {
    return new Response(
      "Missing host",
      { status: 400 },
    );
  }

  return new Response(
    twiml(host),
    {
      headers: {
        "Content-Type": "text/xml",
      },
    },
  );
}
