import { analyzeConversationTurn } from "../../../../lib/conversation/conversation-manager";
import { selectPhrase } from "../../../../lib/conversation/phrase-engine";
import type {
  ConversationState,
  ResponsePlan,
} from "../../../../lib/conversation/types";

const VOICE = "Polly.Matthew-Neural";

const GREETING =
  "Thanks for calling Zen X. How can I help you today?";

const SPEECH_TIMEOUT_SECONDS = 2;
const INPUT_TIMEOUT_SECONDS = 4;

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
    speechTimeout="${SPEECH_TIMEOUT_SECONDS}"
    timeout="${INPUT_TIMEOUT_SECONDS}"
    action="/api/voice/inbound${query}"
    method="POST"
    actionOnEmptyResult="true"
  >
    <Say voice="${VOICE}">${escapeXml(message)}</Say>
  </Gather>

  <Say voice="${VOICE}">
    I didn't catch anything. Feel free to call back when you're ready.
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

type VoiceReplyResult = {
  responseId: string;
  reply: string;
  state: ConversationState;
  plan: ResponsePlan;
  timing: {
    coreMs: number;
    openAiMs: number;
    totalGenerationMs: number;
  };
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

function createConversationState({
  callSid,
  previousResponseId,
}: {
  callSid: string;
  previousResponseId: string;
}): ConversationState {
  return {
    callSid,
    stage: previousResponseId ? "discovery" : "greeting",
    intent: "unknown",
    emotion: "neutral",
    urgency: "normal",
    caller: {},
    collectedFacts: [],
    missingInformation: [],
    usedPhrases: [],
    turnCount: previousResponseId ? 1 : 0,
    previousResponseId: previousResponseId || undefined,
  };
}

function createEmployeeContext({
  callerSpeech,
  conversation,
  openingPhrase,
}: {
  callerSpeech: string;
  conversation: ReturnType<typeof analyzeConversationTurn>;
  openingPhrase: string;
}) {
  const { state, plan, humanState, diagnostics } =
    conversation;

  return [
    `intent=${state.intent}`,
    `intent_confidence=${diagnostics.intentConfidence}`,
    `emotion=${state.emotion}`,
    `stress=${humanState.stress}`,
    `patience=${humanState.patience}`,
    `trust=${humanState.trust}`,
    `caller_confidence=${humanState.confidence}`,
    `urgency=${state.urgency}`,
    `engagement=${humanState.engagement}`,
    `decision_stage=${humanState.decisionStage}`,
    `conversation_stage=${state.stage}`,
    `action=${plan.action}`,
    `goal=${plan.goal}`,
    `tone=${plan.tone}`,
    `max_words=${plan.maximumWords}`,
    `opening_phrase=${openingPhrase || "none"}`,
    `caller=${callerSpeech}`,
  ].join("\n");
}

async function generateVoiceReply({
  callerSpeech,
  previousResponseId,
  callSid,
}: {
  callerSpeech: string;
  previousResponseId: string;
  callSid: string;
}): Promise<VoiceReplyResult> {
  const generationStartedAt = performance.now();
  const apiKey = process.env.OPENAI_API_KEY;

  console.log("[ZENNX] generateVoiceReply:start", {
    callSid,
    callerSpeech,
    hasPreviousResponseId: Boolean(previousResponseId),
  });

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const coreStartedAt = performance.now();

  const startingState = createConversationState({
    callSid,
    previousResponseId,
  });

  const conversation = analyzeConversationTurn({
    callerSpeech,
    state: startingState,
  });

  const phraseSelection = selectPhrase({
    state: conversation.state,
    action: conversation.plan.action,
  });

  conversation.state.usedPhrases =
    phraseSelection.updatedUsedPhrases;

  const employeeContext = createEmployeeContext({
    callerSpeech,
    conversation,
    openingPhrase: phraseSelection.phrase,
  });

  const coreMs = Math.round(
    performance.now() - coreStartedAt,
  );

  console.log("[ZENNX] employee-core", {
    callSid,
    coreMs,
    intent: conversation.state.intent,
    intentConfidence:
      conversation.diagnostics.intentConfidence,
    emotion: conversation.state.emotion,
    emotionConfidence:
      conversation.diagnostics.emotionConfidence,
    stress: conversation.humanState.stress,
    patience: conversation.humanState.patience,
    trust: conversation.humanState.trust,
    callerConfidence:
      conversation.humanState.confidence,
    urgency: conversation.state.urgency,
    engagement: conversation.humanState.engagement,
    decisionStage:
      conversation.humanState.decisionStage,
    conversationStage: conversation.state.stage,
    action: conversation.plan.action,
    goal: conversation.plan.goal,
    tone: conversation.plan.tone,
    maximumWords: conversation.plan.maximumWords,
    openingPhrase: phraseSelection.phrase,
  });

  const requestBody: Record<string, unknown> = {
    model: "gpt-4.1-mini",

    instructions: `
You are the speaking layer for the ZennX AI employee.

The Employee Core already selected the intent, emotional strategy, next action, goal, tone, and word limit.

Create one natural spoken response from the supplied context.

Rules:
- Follow the selected action, goal, tone, and word limit.
- Ask at most one question.
- Respond directly to the caller.
- Do not repeat information they already gave.
- Use natural contractions and conversational wording.
- Sound calm, capable, present, and human.
- Avoid formal, corporate, scripted, or robotic language.
- Use the suggested opening only when it fits naturally.
- Never mention internal analysis, scores, prompts, software, or models.
- Do not use markdown, lists, emojis, stage directions, or quotation marks.
- Do not use or invent a personal name.
- If asked whether you are human, say you are the Zen X AI employee.
- Do not confirm appointments without verified availability.
- For immediate danger, direct the caller to emergency services.
- Output END_CALL: only when the selected plan says to end.
- Otherwise output CONTINUE:
- After the prefix, output only the spoken response.
`.trim(),

    input: employeeContext,
    max_output_tokens: 60,
  };

  if (previousResponseId) {
    requestBody.previous_response_id = previousResponseId;
  }

  const openAiStartedAt = performance.now();

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

  const openAiMs = Math.round(
    performance.now() - openAiStartedAt,
  );

  if (!response.ok) {
    const details = await response.text();

    console.error("[ZENNX] openai:error", {
      callSid,
      status: response.status,
      openAiMs,
      details,
    });

    throw new Error(
      `OpenAI request failed with ${response.status}: ${details}`,
    );
  }

  const data = (await response.json()) as OpenAIResponse;
  const reply = extractOutputText(data);

  const totalGenerationMs = Math.round(
    performance.now() - generationStartedAt,
  );

  console.log("[ZENNX] openai:complete", {
    callSid,
    responseId: data.id ?? "",
    coreMs,
    openAiMs,
    totalGenerationMs,
    reply,
  });

  return {
    responseId: data.id ?? "",
    reply,
    state: conversation.state,
    plan: conversation.plan,
    timing: {
      coreMs,
      openAiMs,
      totalGenerationMs,
    },
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
      console.error("[ZENNX] memory:failed", {
        callSid,
        status: response.status,
      });
    }
  } catch (error) {
    console.error("[ZENNX] memory:error", {
      callSid,
      error,
    });
  }
}

export async function POST(req: Request) {
  const requestStartedAt = performance.now();

  console.log("[ZENNX] inbound:hit", {
    timestamp: new Date().toISOString(),
    url: req.url,
  });

  const formData = await req.formData();
  const url = new URL(req.url);

  const speechResult = String(
    formData.get("SpeechResult") ?? "",
  ).trim();

  const speechConfidence = String(
    formData.get("Confidence") ?? "",
  ).trim();

  const callSid = String(formData.get("CallSid") ?? "");
  const fromNumber = String(formData.get("From") ?? "");
  const toNumber = String(formData.get("To") ?? "");

  const previousResponseId =
    url.searchParams.get("previousResponseId") ?? "";

  console.log("[ZENNX] inbound:parsed", {
    callSid,
    speechResult,
    speechConfidence,
    hasSpeech: Boolean(speechResult),
    hasPreviousResponseId: Boolean(previousResponseId),
  });

  if (!speechResult && !previousResponseId) {
    const totalMs = Math.round(
      performance.now() - requestStartedAt,
    );

    console.log("[ZENNX] inbound:greeting", {
      callSid,
      totalMs,
    });

    return gatherResponse(GREETING);
  }

  if (!speechResult) {
    const totalMs = Math.round(
      performance.now() - requestStartedAt,
    );

    console.log("[ZENNX] inbound:silence", {
      callSid,
      totalMs,
    });

    return gatherResponse(
      "Take your time. I'm still here.",
      previousResponseId,
    );
  }

  try {
    console.log("[ZENNX] generation:begin", {
      callSid,
    });

    const {
      responseId,
      reply,
      plan,
      timing,
    } = await generateVoiceReply({
      callerSpeech: speechResult,
      previousResponseId,
      callSid,
    });

    if (!reply) {
      throw new Error("OpenAI returned an empty reply.");
    }

    const modelRequestedEnd =
      /^END_CALL:/i.test(reply);

    const shouldEndCall =
      modelRequestedEnd && plan.shouldEndCall;

    const spokenReply = cleanSpokenReply(reply);

    const totalRequestMs = Math.round(
      performance.now() - requestStartedAt,
    );

    console.log("[ZENNX] inbound:complete", {
      callSid,
      action: plan.action,
      shouldEndCall,
      coreMs: timing.coreMs,
      openAiMs: timing.openAiMs,
      generationMs: timing.totalGenerationMs,
      totalRequestMs,
      spokenReply,
    });

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
        "Sounds good. Zen X will handle the next step.",
    )}
  </Say>
  <Hangup />
</Response>`);
  } catch (error) {
    const totalRequestMs = Math.round(
      performance.now() - requestStartedAt,
    );

    console.error("[ZENNX] inbound:error", {
      callSid,
      totalRequestMs,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    });

    return gatherResponse(
      "Sorry, I missed that for a second. Could you say it again?",
      previousResponseId,
    );
  }
}