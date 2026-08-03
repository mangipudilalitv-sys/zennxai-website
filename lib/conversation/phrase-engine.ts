import type {
  CallerEmotion,
  ConversationAction,
  ConversationState,
} from "./types";

type PhraseCategory =
  | "acknowledgement"
  | "clarification"
  | "reassurance"
  | "transition"
  | "closing"
  | "sales"
  | "urgency";

interface PhraseChoice {
  text: string;
  category: PhraseCategory;
  score: number;
}

const PHRASES: Record<PhraseCategory, string[]> = {
  acknowledgement: [
    "Got it.",
    "Okay.",
    "Sure.",
    "Absolutely.",
    "Makes sense.",
    "No problem.",
    "Of course.",
    "Alright.",
    "Thanks for letting me know.",
    "I understand.",
  ],

  clarification: [
    "Could you tell me a little more?",
    "What happened?",
    "Can you walk me through that?",
    "Just so I understand, what do you need help with?",
    "What seems to be going on?",
  ],

  reassurance: [
    "I can help with that.",
    "We'll get this sorted out.",
    "You're in the right place.",
    "I'll help you through it.",
    "Let's take care of this.",
  ],

  transition: [
    "One quick question.",
    "Before we move forward,",
    "Just so I have this right,",
    "Let me ask you this.",
    "The next thing I need is",
  ],

  closing: [
    "You're all set.",
    "Perfect, we'll take it from here.",
    "Sounds good. We'll follow up shortly.",
    "Thanks for calling.",
    "We'll handle the next step.",
  ],

  sales: [
    "What would make you feel comfortable moving forward?",
    "Is there anything holding you back?",
    "What would you like to know before deciding?",
    "Would you like me to help you get the next step started?",
    "What part are you still unsure about?",
  ],

  urgency: [
    "I understand this is urgent.",
    "Let's move quickly.",
    "I'll keep this brief.",
    "Let's focus on the fastest next step.",
    "I want to make sure this gets handled right away.",
  ],
};

function normalizePhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

function wasRecentlyUsed(
  phrase: string,
  usedPhrases: string[],
) {
  const normalizedPhrase = normalizePhrase(phrase);

  return usedPhrases
    .slice(-6)
    .some(
      (used) =>
        normalizePhrase(used) === normalizedPhrase,
    );
}

function scorePhrase({
  phrase,
  emotion,
  action,
  usedPhrases,
}: {
  phrase: string;
  emotion: CallerEmotion;
  action: ConversationAction;
  usedPhrases: string[];
}) {
  let score = 1;

  if (wasRecentlyUsed(phrase, usedPhrases)) {
    score -= 10;
  }

  if (
    emotion === "frustrated" &&
    phrase.length < 45
  ) {
    score += 2;
  }

  if (
    emotion === "rushed" &&
    phrase.split(/\s+/).length <= 6
  ) {
    score += 2;
  }

  if (
    action === "reassure" &&
    /(help|sorted|take care|right place)/i.test(
      phrase,
    )
  ) {
    score += 2;
  }

  if (
    action === "handle_objection" &&
    /\?$/.test(phrase)
  ) {
    score += 2;
  }

  return score;
}

function chooseBestPhrase(
  category: PhraseCategory,
  state: ConversationState,
  action: ConversationAction,
) {
  const choices: PhraseChoice[] =
    PHRASES[category].map((text) => ({
      text,
      category,
      score: scorePhrase({
        phrase: text,
        emotion: state.emotion,
        action,
        usedPhrases: state.usedPhrases,
      }),
    }));

  choices.sort((a, b) => b.score - a.score);

  const bestScore = choices[0]?.score ?? 0;
  const topChoices = choices.filter(
    (choice) => choice.score === bestScore,
  );

  const selected =
    topChoices[
      Math.floor(Math.random() * topChoices.length)
    ] ?? choices[0];

  return selected?.text ?? "";
}

function categoryForAction(
  action: ConversationAction,
): PhraseCategory {
  switch (action) {
    case "clarify":
      return "clarification";

    case "reassure":
      return "reassurance";

    case "handle_objection":
      return "sales";

    case "close_call":
      return "closing";

    case "escalate":
      return "urgency";

    case "confirm_details":
    case "ask_name":
    case "ask_need":
    case "ask_urgency":
    case "ask_contact_details":
    case "ask_scheduling_preference":
      return "transition";

    default:
      return "acknowledgement";
  }
}

export function selectPhrase({
  state,
  action,
}: {
  state: ConversationState;
  action: ConversationAction;
}) {
  const category = categoryForAction(action);
  const phrase = chooseBestPhrase(
    category,
    state,
    action,
  );

  return {
    phrase,
    category,
    updatedUsedPhrases: [
      ...state.usedPhrases,
      phrase,
    ].slice(-20),
  };
}
