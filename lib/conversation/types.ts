export type ConversationStage =
  | "greeting"
  | "discovery"
  | "qualification"
  | "scheduling"
  | "confirmation"
  | "closing";

export type CallerEmotion =
  | "calm"
  | "confused"
  | "frustrated"
  | "anxious"
  | "excited"
  | "rushed"
  | "neutral";

export type CallerIntent =
  | "ask_question"
  | "request_service"
  | "schedule_appointment"
  | "change_appointment"
  | "cancel_appointment"
  | "request_quote"
  | "report_emergency"
  | "complaint"
  | "sales_inquiry"
  | "unknown";

export type UrgencyLevel = "low" | "normal" | "high" | "emergency";

export type ConversationAction =
  | "acknowledge"
  | "ask_name"
  | "ask_need"
  | "ask_urgency"
  | "ask_contact_details"
  | "ask_scheduling_preference"
  | "clarify"
  | "answer_question"
  | "reassure"
  | "handle_objection"
  | "confirm_details"
  | "close_call"
  | "escalate";

export interface CallerProfile {
  name?: string;
  phoneNumber?: string;
  email?: string;
  companyName?: string;
  preferredContactMethod?: "call" | "text" | "email";
}

export interface ConversationState {
  callSid: string;
  stage: ConversationStage;
  intent: CallerIntent;
  emotion: CallerEmotion;
  urgency: UrgencyLevel;
  caller: CallerProfile;
  serviceRequested?: string;
  schedulingPreference?: string;
  collectedFacts: string[];
  missingInformation: string[];
  usedPhrases: string[];
  turnCount: number;
  previousResponseId?: string;
}

export interface ResponsePlan {
  action: ConversationAction;
  goal: string;
  tone: "warm" | "calm" | "direct" | "reassuring" | "upbeat";
  shouldEndCall: boolean;
  maximumWords: number;
  requiredInformation?: string;
  constraints: string[];
}

export interface ConversationTurnInput {
  callerSpeech: string;
  state: ConversationState;
}

export interface ConversationTurnResult {
  state: ConversationState;
  plan: ResponsePlan;
  spokenReply: string;
  responseId?: string;
}

export type DecisionStage =
  | "exploring"
  | "considering"
  | "ready"
  | "objecting"
  | "committed"
  | "leaving";

export interface HumanState {
  emotion: CallerEmotion;
  stress: number;
  patience: number;
  trust: number;
  confidence: number;
  urgency: number;
  engagement: number;
  cooperativeness: number;
  decisionStage: DecisionStage;
  analysisConfidence: number;
  matchedSignals: string[];
}
