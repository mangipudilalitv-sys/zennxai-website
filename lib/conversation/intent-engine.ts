import type {
  CallerIntent,
  UrgencyLevel,
} from "./types";

export interface IntentAnalysis {
  intent: CallerIntent;
  urgency: UrgencyLevel;
  confidence: number;
  matchedSignals: string[];
}

interface IntentRule {
  intent: CallerIntent;
  signals: string[];
  weight: number;
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: "report_emergency",
    signals: [
      "emergency",
      "right now",
      "immediately",
      "flooding",
      "fire",
      "smoke",
      "gas leak",
      "sparking",
      "burst pipe",
      "danger",
      "someone is hurt",
    ],
    weight: 5,
  },
  {
    intent: "schedule_appointment",
    signals: [
      "schedule",
      "book",
      "appointment",
      "come out",
      "send someone",
      "available",
      "availability",
      "what time",
      "what day",
    ],
    weight: 4,
  },
  {
    intent: "change_appointment",
    signals: [
      "reschedule",
      "change my appointment",
      "move my appointment",
      "different time",
      "different day",
    ],
    weight: 5,
  },
  {
    intent: "cancel_appointment",
    signals: [
      "cancel",
      "cancel my appointment",
      "don't need the appointment",
    ],
    weight: 5,
  },
  {
    intent: "request_quote",
    signals: [
      "quote",
      "estimate",
      "how much",
      "price",
      "pricing",
      "cost",
      "rate",
    ],
    weight: 4,
  },
  {
    intent: "complaint",
    signals: [
      "complaint",
      "unhappy",
      "upset",
      "terrible service",
      "bad service",
      "not satisfied",
      "frustrated",
      "nobody called",
      "never showed up",
    ],
    weight: 4,
  },
  {
    intent: "request_service",
    signals: [
      "need help",
      "need someone",
      "not working",
      "broken",
      "repair",
      "fix",
      "leaking",
      "stopped working",
      "problem with",
      "issue with",
    ],
    weight: 3,
  },
  {
    intent: "sales_inquiry",
    signals: [
      "interested in",
      "looking for",
      "want to buy",
      "sign up",
      "learn more about your service",
      "what do you offer",
    ],
    weight: 3,
  },
  {
    intent: "ask_question",
    signals: [
      "question",
      "do you",
      "can you",
      "what is",
      "what are",
      "where are",
      "when are",
      "are you open",
      "hours",
    ],
    weight: 2,
  },
];

const HIGH_URGENCY_SIGNALS = [
  "today",
  "as soon as possible",
  "asap",
  "urgent",
  "right away",
  "can't wait",
  "need someone now",
];

const EMERGENCY_SIGNALS = [
  "emergency",
  "fire",
  "gas leak",
  "someone is hurt",
  "danger",
  "sparking",
  "flooding badly",
];

function normalizeSpeech(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function determineUrgency(
  normalizedSpeech: string,
  intent: CallerIntent,
): UrgencyLevel {
  if (
    intent === "report_emergency" ||
    EMERGENCY_SIGNALS.some((signal) =>
      normalizedSpeech.includes(signal),
    )
  ) {
    return "emergency";
  }

  if (
    HIGH_URGENCY_SIGNALS.some((signal) =>
      normalizedSpeech.includes(signal),
    )
  ) {
    return "high";
  }

  return "normal";
}

export function analyzeIntent(
  callerSpeech: string,
): IntentAnalysis {
  const normalizedSpeech = normalizeSpeech(callerSpeech);

  if (!normalizedSpeech) {
    return {
      intent: "unknown",
      urgency: "normal",
      confidence: 0,
      matchedSignals: [],
    };
  }

  const scores = new Map<CallerIntent, number>();
  const matches = new Map<CallerIntent, string[]>();

  for (const rule of INTENT_RULES) {
    for (const signal of rule.signals) {
      if (!normalizedSpeech.includes(signal)) {
        continue;
      }

      scores.set(
        rule.intent,
        (scores.get(rule.intent) ?? 0) + rule.weight,
      );

      matches.set(rule.intent, [
        ...(matches.get(rule.intent) ?? []),
        signal,
      ]);
    }
  }

  const rankedResults = [...scores.entries()].sort(
    (first, second) => second[1] - first[1],
  );

  const intent = rankedResults[0]?.[0] ?? "unknown";
  const highestScore = rankedResults[0]?.[1] ?? 0;
  const secondHighestScore = rankedResults[1]?.[1] ?? 0;

  const confidence =
    highestScore === 0
      ? 0
      : Math.min(
          1,
          0.5 +
            highestScore * 0.08 +
            (highestScore - secondHighestScore) * 0.04,
        );

  return {
    intent,
    urgency: determineUrgency(normalizedSpeech, intent),
    confidence: Number(confidence.toFixed(2)),
    matchedSignals: matches.get(intent) ?? [],
  };
}
