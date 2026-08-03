import { analyzeEmotion } from "./emotion-engine";
import { analyzeHumanState } from "./human-state-engine";
import { analyzeIntent } from "./intent-engine";
import type {
  ConversationAction,
  ConversationStage,
  ConversationState,
  ResponsePlan,
} from "./types";

export interface ConversationAnalysis {
  state: ConversationState;
  plan: ResponsePlan;
  humanState: ReturnType<typeof analyzeHumanState>;
  diagnostics: {
    intentConfidence: number;
    emotionConfidence: number;
    humanStateConfidence: number;
    matchedSignals: string[];
  };
}

function determineStage(
  state: ConversationState,
): ConversationStage {
  if (state.intent === "schedule_appointment") {
    if (!state.schedulingPreference) return "scheduling";
    if (!state.caller.name) return "qualification";
    return "confirmation";
  }

  if (
    state.intent === "request_service" ||
    state.intent === "request_quote" ||
    state.intent === "sales_inquiry"
  ) {
    return state.serviceRequested
      ? "qualification"
      : "discovery";
  }

  if (
    state.intent === "change_appointment" ||
    state.intent === "cancel_appointment"
  ) {
    return "qualification";
  }

  return state.turnCount === 0
    ? "greeting"
    : "discovery";
}

function determineNextAction(
  state: ConversationState,
): ConversationAction {
  if (state.urgency === "emergency") {
    return "escalate";
  }

  if (state.intent === "unknown") {
    return "clarify";
  }

  if (
    state.emotion === "frustrated" ||
    state.emotion === "anxious"
  ) {
    return "reassure";
  }

  if (
    state.intent === "request_service" &&
    !state.serviceRequested
  ) {
    return "ask_need";
  }

  if (
    state.intent === "schedule_appointment" &&
    !state.schedulingPreference
  ) {
    return "ask_scheduling_preference";
  }

  if (
    state.intent === "request_quote" ||
    state.intent === "sales_inquiry"
  ) {
    return "answer_question";
  }

  if (
    !state.caller.name &&
    state.turnCount >= 2
  ) {
    return "ask_name";
  }

  if (state.stage === "confirmation") {
    return "confirm_details";
  }

  return "answer_question";
}

function determineTone(
  state: ConversationState,
): ResponsePlan["tone"] {
  if (state.emotion === "frustrated") return "calm";

  if (
    state.emotion === "anxious" ||
    state.urgency === "high" ||
    state.urgency === "emergency"
  ) {
    return "reassuring";
  }

  if (state.emotion === "rushed") return "direct";
  if (state.emotion === "excited") return "upbeat";

  return "warm";
}

function buildPlan(
  state: ConversationState,
): ResponsePlan {
  const action = determineNextAction(state);

  const goals: Record<ConversationAction, string> = {
    acknowledge: "Acknowledge the caller naturally.",
    ask_name: "Ask for the caller's name naturally.",
    ask_need: "Understand exactly what help they need.",
    ask_urgency: "Determine how urgent the situation is.",
    ask_contact_details:
      "Collect the best contact details for follow-up.",
    ask_scheduling_preference:
      "Ask for the caller's preferred day or time.",
    clarify:
      "Ask one short question to understand their request.",
    answer_question:
      "Answer directly and move the conversation forward.",
    reassure:
      "Acknowledge their concern and regain confidence.",
    handle_objection:
      "Understand the hesitation and address it honestly.",
    confirm_details:
      "Confirm the important details already collected.",
    close_call:
      "End naturally and explain the next step.",
    escalate:
      "Give the safest immediate instruction and escalate.",
  };

  return {
    action,
    goal: goals[action],
    tone: determineTone(state),
    shouldEndCall:
      state.stage === "closing" ||
      action === "close_call",
    maximumWords:
      state.emotion === "rushed" ||
      state.emotion === "frustrated"
        ? 18
        : 28,
    constraints: [
      "Ask only one question.",
      "Do not repeat known information.",
      "Use natural spoken language.",
      "Do not promise unconfirmed availability.",
    ],
  };
}

export function analyzeConversationTurn({
  callerSpeech,
  state,
}: {
  callerSpeech: string;
  state: ConversationState;
}): ConversationAnalysis {
  const intentAnalysis = analyzeIntent(callerSpeech);
  const emotionAnalysis = analyzeEmotion(callerSpeech);
  const humanState = analyzeHumanState(callerSpeech);

  const selectedEmotion =
    humanState.analysisConfidence >=
    emotionAnalysis.confidence
      ? humanState.emotion
      : emotionAnalysis.emotion;

  const updatedState: ConversationState = {
    ...state,
    intent:
      intentAnalysis.intent === "unknown"
        ? state.intent
        : intentAnalysis.intent,
    emotion: selectedEmotion,
    urgency: intentAnalysis.urgency,
    turnCount: state.turnCount + 1,
    collectedFacts: [
      ...state.collectedFacts,
      callerSpeech,
    ].slice(-20),
  };

  updatedState.stage = determineStage(updatedState);

  return {
    state: updatedState,
    plan: buildPlan(updatedState),
    humanState,
    diagnostics: {
      intentConfidence: intentAnalysis.confidence,
      emotionConfidence: emotionAnalysis.confidence,
      humanStateConfidence:
        humanState.analysisConfidence,
      matchedSignals: [
        ...new Set([
          ...intentAnalysis.matchedSignals,
          ...humanState.matchedSignals,
        ]),
      ],
    },
  };
}
