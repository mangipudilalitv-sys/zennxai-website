function xmlResponse(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

export async function POST(req: Request) {
  const formData = await req.formData();

  const speechResult = String(formData.get("SpeechResult") || "");
  const callSid = String(formData.get("CallSid") || "");
  const fromNumber = String(formData.get("From") || "");
  const toNumber = String(formData.get("To") || "");

  if (!speechResult) {
    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/voice/inbound" method="POST">
    <Say voice="alice">Thanks for calling. This is ZennX, the AI operations assistant. How can I help you today?</Say>
  </Gather>
  <Say voice="alice">I did not catch that. Please call again or leave a message later.</Say>
</Response>`);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3002";

  await fetch(`${baseUrl}/api/voice/memory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      callSid,
      fromNumber,
      toNumber,
      transcript: speechResult,
      direction: "inbound",
    }),
  }).catch((error) => {
    console.error("VOICE MEMORY WEBHOOK ERROR:", error);
  });

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Got it. I recorded your request and someone from the business will follow up shortly.</Say>
  <Hangup />
</Response>`);
}