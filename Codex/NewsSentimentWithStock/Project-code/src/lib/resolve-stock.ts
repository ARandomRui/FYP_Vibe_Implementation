import { searchSymbols } from "./finnhub";

const TICKER_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;
const COMMON_SUFFIX_PATTERN = /\b(inc|inc\.|corporation|corp|corp\.|company|co|co\.|ltd|plc|class a|common stock)\b/gi;

export class StockNotFoundError extends Error {
  constructor(query: string) {
    super(`No such stock found for "${query}".`);
    this.name = "StockNotFoundError";
  }
}

export async function resolveStockQuery(input: string) {
  const query = input.trim();

  if (!query) {
    throw new Error("Enter a ticker or company name to search.");
  }

  const upperQuery = query.toUpperCase();

  if (TICKER_PATTERN.test(upperQuery) && !query.includes(" ") && isLikelyTickerInput(upperQuery)) {
    return upperQuery;
  }

  const results = await searchSymbols(query);

  if (results.length === 0) {
    throw new StockNotFoundError(query);
  }

  const ranked = results
    .filter((result) => isLikelyCommonStock(result.type))
    .map((result) => ({
      ...result,
      score: scoreSymbolResult(query, result)
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0] ?? results[0];

  if (!best?.symbol) {
    throw new StockNotFoundError(query);
  }

  return best.symbol.toUpperCase();
}

function isLikelyTickerInput(value: string) {
  return value.length <= 4 || value.includes(".") || value.includes("-");
}

function isLikelyCommonStock(type?: string) {
  if (!type) {
    return true;
  }

  const normalized = type.toLowerCase();
  return normalized.includes("common") || normalized.includes("equity") || normalized.includes("stock");
}

function scoreSymbolResult(query: string, result: { description: string; symbol: string; displaySymbol?: string }) {
  const normalizedQuery = normalizeName(query);
  const description = normalizeName(result.description);
  const symbol = result.symbol.toUpperCase();
  const displaySymbol = result.displaySymbol?.toUpperCase();
  let score = 0;

  if (description === normalizedQuery) {
    score += 100;
  }

  if (description.startsWith(normalizedQuery)) {
    score += 60;
  }

  if (description.includes(normalizedQuery)) {
    score += 35;
  }

  if (symbol === query.toUpperCase() || displaySymbol === query.toUpperCase()) {
    score += 80;
  }

  if (!symbol.includes(".") && !symbol.includes(":")) {
    score += 10;
  }

  return score;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(COMMON_SUFFIX_PATTERN, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
