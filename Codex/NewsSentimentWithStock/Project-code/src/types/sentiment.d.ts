declare module "sentiment" {
  type SentimentResult = {
    score: number;
    comparative: number;
    calculation: Array<Record<string, number>>;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  };

  export default class Sentiment {
    analyze(text: string): SentimentResult;
  }
}
