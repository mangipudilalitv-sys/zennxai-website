const VOICE = "Polly.Matthew-Neural";

function xmlResponse(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function gatherResponse(message: string, previousResponseId?: string) {
  const query = previousResponseId
    ? `?previousResponseId=${encodeURIComponent(previousResponseId)}`
    : "";

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather
    input="speech"
    language="en-US"
    speechModel="experimental_conversations"
    speechTimeout="2"
    timeout="5"
    action="/api/voice/inbound${query}"
    method="POST"
    actionOnEmptyResult="true"
  >
    <Say voice="${VOICE}">${escapeXml(message)}</Say>
  </Gather>

  <Say voice="${VOICE}">
    I didn't hear anything. Feel free to call us back whenever you're ready.
  </Say>

  <Hangup />
</Response>`);
}

type OpenAIResponse = {
  id?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text.trim();
  }

  return (
    response.output
      ?.flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text || "")
      .join("")
      .trim() || ""
  );
}

async function generateVoiceReply({
  callerSpeech,
  previousResponseId,
}: {
  callerSpeech: string;
  previousResponseId: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const requestBody: Record<string, unknown> = {
    model: "gpt-4.1-mini",
    instructions: `
You are Ava, the warm, capable front-desk voice assistant for ZennX.

The brand is written ZennX but spoken aloud as "Zen X."

Your job is to have a natural phone conversation and understand why the caller is calling.

Rules:
- Sound warm, calm, confident, and human.
- Keep each answer under 35 words.
- Ask only one useful question at a time.
- Do not repeat everything the caller just said.
- Never say you are a language model.
- Do not use markdown, lists, emojis, symbols, or stage directions.
- Use conversational phrases such as "Absolutely," "Got it," and "I can help with that," but do not overuse them.
- Collect the caller's name, what they need, urgency, and any useful scheduling details.
- Do not promise a specific appointment unless availability has actually been confirmed.
- If there is immediate danger, tell the caller to contact emergency services.
- When enough information has been collected, begin your response with exactly END_CALL:
- Otherwise begin your response with exactly CONTINUE:
- After the prefix, provide only what should be spoken aloud.
`,
    input: callerSpeech,
    max_output_tokens: 120,
  };

  if (previousResponseId) {
    requestBody.previous_response_id = previousResponseId;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `OpenAI request failed with ${response.status}: ${details}`,
    );
  }

  const data = (await response.json()) as OpenAIResponse;

  return {
    responseId: data.id || "",
    reply: extractOutputText(data),
  };
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const url = new URL(req.url);

  const speechResult = String(formData.get("SpeechResult") || "").trim();
  const callSid = String(formData.get("CallSid") || "");
  const fromNumber = String(formData.get("From") || "");
  const toNumber = String(formData.get("To") || "");
  const previousResponseId =
    url.searchParams.get("previousResponseId") || "";

  // First request when somebody initially calls.
  if (!speechResult && !previousResponseId) {
    return gatherResponse(
      "Thanks for calling Zen X. This is Ava. How can I help you today?",
    );
  }

  // Caller stayed silent during an active conversation.
  if (!speechResult) {
    return gatherResponse(
      "Are you still there? Take your time. What else can I help you with?",
      previousResponseId,
    );
  }

  try {
    const { responseId, reply } = await generateVoiceReply({
      callerSpeech: speechResult,
      previousResponseId,
    });

    if (!reply) {
      throw new Error("OpenAI returned an empty reply.");
    }

    const shouldEndCall = reply.startsWith("END_CALL:");
    const spokenReply = reply
      .replace(/^END_CALL:\s*/i, "")
      .replace(/^CONTINUE:\s*/i, "")
      .trim();

    if (!shouldEndCall) {
      return gatherResponse(
        spokenReply || "Got it. Could you tell me a little more?",
        responseId,
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      "https://www.zennxai.com";

    const normalizedBaseUrl = baseUrl.startsWith("http")
      ? baseUrl
      : `https://${baseUrl}`;

    await fetch(`${normalizedBaseUrl}/api/voice/memory`, {
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
  <Say voice="${VOICE}">
    ${escapeXml(
      spokenReply ||
        "Thank you. I've got everything I need, and someone from the business will follow up shortly.",
    )}
  </Say>
  <Hangup />
</Response>`);
  } catch (error) {
    console.error("VOICE AGENT ERROR:", error);

    return gatherResponse(
      "Sorry about that. I had a brief technical issue. Could you say that one more time?",
      previousResponseId,
    );
  }
}