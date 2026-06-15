import Sentiment from "sentiment";

export const SENTIMENT_MODEL_NAME = "sentiment-npm";
export const SENTIMENT_MODEL_VERSION = "1.0.0";

const analyzer = new Sentiment();

export type SentimentLabel = "positive" | "neutral" | "negative";

export function scoreArticle(input: { title: string; summary?: string | null }) {
  const analyzedText = [input.title, input.summary].filter(Boolean).join(". ");
  const result = analyzer.analyze(analyzedText);
  const normalizedScore = clamp(result.comparative / 2, -1, 1);
  const label = labelSentiment(normalizedScore);

  return {
    modelName: SENTIMENT_MODEL_NAME,
    modelVersion: SENTIMENT_MODEL_VERSION,
    rawScore: result.score,
    normalizedScore,
    label,
    analyzedText
  };
}

function labelSentiment(score: number): SentimentLabel {
  if (score >= 0.15) {
    return "positive";
  }

  if (score <= -0.15) {
    return "negative";
  }

  return "neutral";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
