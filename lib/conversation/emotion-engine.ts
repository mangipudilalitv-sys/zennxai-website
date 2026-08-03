import type { CallerEmotion } from "./types";

export interface EmotionAnalysis {
  emotion: CallerEmotion;
  confidence: number;
  responseTone: "warm" | "calm" | "direct" | "reassuring" | "upbeat";
  responseLength: "short" | "normal";
  pace: "slow" | "normal" | "fast";
}

const EMOTION_RULES = {
  frustrated: [
    "frustrated",
    "angry",
    "annoyed",
    "upset",
    "ridiculous",
    "terrible",
    "nobody answered",
    "this is crazy",
    "been waiting",
    "third time",
  ],
  anxious: [
    "worried",
    "concerned",
    "nervous",
    "is everything okay",
    "not sure",
    "scared",
  ],
  excited: [
    "awesome",
    "great",
    "perfect",
    "love",
    "amazing",
    "thank you so much",
  ],
  rushed: [
    "quick",
    "in a hurry",
    "busy",
    "right now",
    "fast",
    "don't have much time",
  ],
  confused: [
    "don't understand",
    "confused",
    "what do you mean",
    "can you explain",
    "not following",
  ],
};

export function analyzeEmotion(
  speech: string,
): EmotionAnalysis {
  const text = speech.toLowerCase();

  let emotion: CallerEmotion = "calm";
  let confidence = 0.55;

  for (const [key, phrases] of Object.entries(EMOTION_RULES)) {
    const hits = phrases.filter((phrase) =>
      text.includes(phrase),
    ).length;

    if (hits > 0) {
      emotion = key as CallerEmotion;
      confidence = Math.min(0.95, 0.6 + hits * 0.12);
      break;
    }
  }

  switch (emotion) {
    case "frustrated":
      return {
        emotion,
        confidence,
        responseTone: "calm",
        responseLength: "short",
        pace: "slow",
      };

    case "anxious":
      return {
        emotion,
        confidence,
        responseTone: "reassuring",
        responseLength: "normal",
        pace: "slow",
      };

    case "excited":
      return {
        emotion,
        confidence,
        responseTone: "upbeat",
        responseLength: "normal",
        pace: "fast",
      };

    case "rushed":
      return {
        emotion,
        confidence,
        responseTone: "direct",
        responseLength: "short",
        pace: "fast",
      };

    case "confused":
      return {
        emotion,
        confidence,
        responseTone: "calm",
        responseLength: "normal",
        pace: "slow",
      };

    default:
      return {
        emotion: "calm",
        confidence,
        responseTone: "warm",
        responseLength: "normal",
        pace: "normal",
      };
  }
}
