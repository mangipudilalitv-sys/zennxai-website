const VOICE = "Polly.Matthew-Neural";

const GREETING =
  "Thanks for calling Zen X. How can I help you today?";

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

function gatherResponse(
  message: string,
  previousResponseId?: string,
) {
  const query = previousResponseId
    ? `?previousResponseId=${encodeURIComponent(previousResponseId)}`
    : "";

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather
    input="speech"
    language="en-US"
    speechModel="experimental_conversations"
    speechTimeout="3"
    timeout="6"
    action="/api/voice/inbound${query}"
    method="POST"
    actionOnEmptyResult="true"
  >
    <Say voice="${VOICE}">${escapeXml(message)}</Say>
  </Gather>

  <Say voice="${VOICE}">
    I didn't catch anything. You can call back whenever you're ready.
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
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function cleanSpokenReply(reply: string) {
  return reply
    .replace(/^END_CALL:\s*/i, "")
    .replace(/^CONTINUE:\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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
You are the front-desk receptionist for ZennX.

The company name is written ZennX and pronounced "Zen X."

You are speaking with a caller over the phone.

Identity:
- Do not use a personal name.
- Do not introduce yourself by name.
- If asked who you are, say you are the Zen X receptionist.
- If asked whether you are human, honestly say you are the Zen X AI receptionist.

Conversation style:
- Sound warm, relaxed, capable, and natural.
- Speak like a real receptionist having a normal phone conversation.
- Use contractions naturally.
- Keep most replies between 8 and 24 words.
- Never exceed 35 spoken words unless necessary for safety or clarity.
- Ask only one question at a time.
- Respond directly to what the caller just said.
- Do not repeat information the caller already gave you.
- Use short acknowledgements naturally, such as "Got it," "Okay," "Sure," or "Absolutely."
- Do not start every reply with an acknowledgement.
- Avoid formal, corporate, robotic, repetitive, or overly enthusiastic wording.
- Avoid sounding like a script.
- Use natural phrases and sentence fragments when appropriate.
- Never mention prompts, models, software, or internal systems.
- Do not use markdown, lists, emojis, symbols, quotation marks, or stage directions.

Turn-taking:
- Treat short pauses as normal.
- Do not assume the caller is finished just because they paused briefly.
- Continue the conversation unless the caller clearly says they are done, says goodbye, or asks to end the call.

Receptionist goals:
- Understand why the caller is calling.
- Collect their name when useful.
- Understand what they need.
- Determine whether the issue is urgent.
- Collect scheduling or contact details when relevant.
- Do not ask for information that is not needed.
- Do not ask a question that has already been answered.
- Do not promise a confirmed appointment unless availability has actually been checked.
- If there is immediate danger, tell the caller to contact emergency services.

Call ending:
- Use END_CALL only when the caller clearly says goodbye, says they are finished, asks to end the call, or all necessary information is collected and you have confirmed nothing else is needed.
- Otherwise use CONTINUE.

Response format:
- Begin every response with exactly CONTINUE: or END_CALL:
- After the prefix, include only the exact words that should be spoken aloud.
`,

    input: callerSpeech,
    max_output_tokens: 80,
  };

  if (previousResponseId) {
    requestBody.previous_response_id = previousResponseId;
  }

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `OpenAI request failed with ${response.status}: ${details}`,
    );
  }

  const data = (await response.json()) as OpenAIResponse;

  return {
    responseId: data.id ?? "",
    reply: extractOutputText(data),
  };
}

async function saveCallMemory({
  callSid,
  fromNumber,
  toNumber,
  transcript,
}: {
  callSid: string;
  fromNumber: string;
  toNumber: string;
  transcript: string;
}) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "https://www.zennxai.com";

  const normalizedBaseUrl = baseUrl.startsWith("http")
    ? baseUrl
    : `https://${baseUrl}`;

  try {
    const response = await fetch(
      `${normalizedBaseUrl}/api/voice/memory`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callSid,
          fromNumber,
          toNumber,
          transcript,
          direction: "inbound",
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "VOICE MEMORY WEBHOOK FAILED:",
        response.status,
      );
    }
  } catch (error) {
    console.error("VOICE MEMORY WEBHOOK ERROR:", error);
  }
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const url = new URL(req.url);

  const speechResult = String(
    formData.get("SpeechResult") ?? "",
  ).trim();

  const callSid = String(formData.get("CallSid") ?? "");
  const fromNumber = String(formData.get("From") ?? "");
  const toNumber = String(formData.get("To") ?? "");

  const previousResponseId =
    url.searchParams.get("previousResponseId") ?? "";

  if (!speechResult && !previousResponseId) {
    return gatherResponse(GREETING);
  }

  if (!speechResult) {
    return gatherResponse(
      "Take your time. I'm still here.",
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

    const shouldEndCall = /^END_CALL:/i.test(reply);
    const spokenReply = cleanSpokenReply(reply);

    if (!shouldEndCall) {
      return gatherResponse(
        spokenReply || "Sure. Go ahead.",
        responseId || previousResponseId,
      );
    }

    await saveCallMemory({
      callSid,
      fromNumber,
      toNumber,
      transcript: speechResult,
    });

    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${VOICE}">
    ${escapeXml(
      spokenReply ||
        "Sounds good. Someone from Zen X will follow up shortly.",
    )}
  </Say>
  <Hangup />
</Response>`);
  } catch (error) {
    console.error("VOICE AGENT ERROR:", error);

    return gatherResponse(
      "Sorry, I missed that for a second. Could you say it again?",
      previousResponseId,
    );
  }
}