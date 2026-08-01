import { NextRequest } from "next/server";

function twiml(host: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://${host}/api/voice/media"/>
    </Connect>
</Response>`;
}

export async function GET(req: NextRequest) {
  const host = req.headers.get("host")!;

  return new Response(twiml(host), {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

export async function POST(req: NextRequest) {
  const host = req.headers.get("host")!;

  return new Response(twiml(host), {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}