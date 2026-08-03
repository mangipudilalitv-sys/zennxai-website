import type {
  CallerEmotion,
  DecisionStage,
  HumanState,
} from "./types";

interface SignalGroup {
  signals: string[];
  strength: number;
}

const SIGNALS = {
  stress: {
    signals: [
      "stressed",
      "worried",
      "scared",
      "panicking",
      "urgent",
      "emergency",
      "right now",
      "as soon as possible",
      "i don't know what to do",
      "this is getting worse",
    ],
    strength: 0.16,
  },

  lowPatience: {
    signals: [
      "hurry",
      "quickly",
      "right now",
      "i don't have time",
      "been waiting",
      "third time",
      "again",
      "nobody answered",
      "just tell me",
      "get to the point",
    ],
    strength: 0.18,
  },

  lowTrust: {
    signals: [
      "i don't believe",
      "are you sure",
      "that doesn't sound right",
      "you already told me that",
      "nobody called",
      "never showed up",
      "bad service",
      "terrible service",
      "this is ridiculous",
    ],
    strength: 0.17,
  },

  highTrust: {
    signals: [
      "i trust you",
      "sounds good",
      "that works",
      "perfect",
      "thank you",
      "i appreciate it",
      "go ahead",
      "let's do it",
    ],
    strength: 0.13,
  },

  highConfidence: {
    signals: [
      "i need",
      "i want",
      "definitely",
      "for sure",
      "i'm ready",
      "let's do it",
      "book it",
      "go ahead",
    ],
    strength: 0.14,
  },

  lowConfidence: {
    signals: [
      "maybe",
      "i think",
      "i'm not sure",
      "possibly",
      "i guess",
      "i don't know",
      "let me think",
      "not certain",
    ],
    strength: 0.14,
  },

  engagement: {
    signals: [
      "tell me more",
      "how does that work",
      "what happens next",
      "what do you recommend",
      "what are my options",
      "can you explain",
      "i'm interested",
    ],
    strength: 0.15,
  },

  lowCooperation: {
    signals: [
      "i already told you",
      "why do you need that",
      "i'm not answering that",
      "none of your business",
      "stop asking",
      "just handle it",
    ],
    strength: 0.2,
  },
} satisfies Record<string, SignalGroup>;

function normalizeSpeech(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function scoreSignals(
  text: string,
  group: SignalGroup,
): {
  score: number;
  matches: string[];
} {
  const matches = group.signals.filter((signal) =>
    text.includes(signal),
  );

  return {
    score: matches.length * group.strength,
    matches,
  };
}

function detectEmotion(text: string): CallerEmotion {
  if (
    /(angry|annoyed|frustrated|ridiculous|terrible|upset)/.test(
      text,
    )
  ) {
    return "frustrated";
  }

  if (/(worried|nervous|scared|concerned|panicking)/.test(text)) {
    return "anxious";
  }

  if (/(confused|don't understand|what do you mean|not following)/.test(text)) {
    return "confused";
  }

  if (/(excited|awesome|amazing|perfect|love that)/.test(text)) {
    return "excited";
  }

  if (/(hurry|quick|busy|don't have time|get to the point)/.test(text)) {
    return "rushed";
  }

  return "calm";
}

function detectDecisionStage(
  text: string,
  confidence: number,
  trust: number,
): DecisionStage {
  if (
    /(goodbye|never mind|forget it|not interested|i'm done)/.test(
      text,
    )
  ) {
    return "leaving";
  }

  if (
    /(too expensive|not sure|need to think|maybe later|why should i)/.test(
      text,
    )
  ) {
    return "objecting";
  }

  if (
    /(book it|sign me up|let's do it|go ahead|i'm ready)/.test(text)
  ) {
    return "committed";
  }

  if (
    confidence >= 0.72 &&
    trust >= 0.62 &&
    /(schedule|appointment|quote|buy|start|available)/.test(text)
  ) {
    return "ready";
  }

  if (
    /(price|cost|options|how does|what do you offer|tell me more)/.test(
      text,
    )
  ) {
    return "considering";
  }

  return "exploring";
}

export function analyzeHumanState(
  callerSpeech: string,
): HumanState {
  const text = normalizeSpeech(callerSpeech);

  if (!text) {
    return {
      emotion: "calm",
      stress: 0.2,
      patience: 0.7,
      trust: 0.5,
      confidence: 0.5,
      urgency: 0.2,
      engagement: 0.4,
      cooperativeness: 0.7,
      decisionStage: "exploring",
      analysisConfidence: 0,
      matchedSignals: [],
    };
  }

  const stressSignals = scoreSignals(text, SIGNALS.stress);
  const patienceSignals = scoreSignals(text, SIGNALS.lowPatience);
  const lowTrustSignals = scoreSignals(text, SIGNALS.lowTrust);
  const highTrustSignals = scoreSignals(text, SIGNALS.highTrust);
  const highConfidenceSignals = scoreSignals(
    text,
    SIGNALS.highConfidence,
  );
  const lowConfidenceSignals = scoreSignals(
    text,
    SIGNALS.lowConfidence,
  );
  const engagementSignals = scoreSignals(
    text,
    SIGNALS.engagement,
  );
  const cooperationSignals = scoreSignals(
    text,
    SIGNALS.lowCooperation,
  );

  const stress = clamp(0.2 + stressSignals.score);
  const patience = clamp(0.75 - patienceSignals.score);

  const trust = clamp(
    0.5 -
      lowTrustSignals.score +
      highTrustSignals.score,
  );

  const confidence = clamp(
    0.5 +
      highConfidenceSignals.score -
      lowConfidenceSignals.score,
  );

  const urgency = clamp(
    0.2 +
      stressSignals.score +
      (/(emergency|right now|immediately|asap)/.test(text)
        ? 0.35
        : 0),
  );

  const engagement = clamp(
    0.45 + engagementSignals.score,
  );

  const cooperativeness = clamp(
    0.8 - cooperationSignals.score,
  );

  const matchedSignals = [
    ...stressSignals.matches,
    ...patienceSignals.matches,
    ...lowTrustSignals.matches,
    ...highTrustSignals.matches,
    ...highConfidenceSignals.matches,
    ...lowConfidenceSignals.matches,
    ...engagementSignals.matches,
    ...cooperationSignals.matches,
  ];

  const analysisConfidence = clamp(
    0.45 + matchedSignals.length * 0.08,
  );

  return {
    emotion: detectEmotion(text),
    stress: Number(stress.toFixed(2)),
    patience: Number(patience.toFixed(2)),
    trust: Number(trust.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    urgency: Number(urgency.toFixed(2)),
    engagement: Number(engagement.toFixed(2)),
    cooperativeness: Number(cooperativeness.toFixed(2)),
    decisionStage: detectDecisionStage(
      text,
      confidence,
      trust,
    ),
    analysisConfidence: Number(
      analysisConfidence.toFixed(2),
    ),
    matchedSignals: [...new Set(matchedSignals)],
  };
}
