type NewsFilterInput = {
  ticker: string;
  companyName?: string | null;
  title: string;
  summary?: string | null;
  related?: string | null;
};

const COMPANY_SUFFIXES = [
  "inc",
  "inc.",
  "corporation",
  "corp",
  "corp.",
  "company",
  "co",
  "co.",
  "ltd",
  "plc",
  "class a",
  "common stock"
];

const COMMON_TICKER_WORDS = new Set(["A", "I", "ON", "IT", "OR", "GO", "ALL"]);

export function isRelevantCompanyNews(input: NewsFilterInput) {
  const ticker = input.ticker.toUpperCase();
  const relatedTickers = splitRelatedTickers(input.related);

  if (relatedTickers.includes(ticker)) {
    return true;
  }

  const text = `${input.title} ${input.summary ?? ""}`.toLowerCase();
  const companyTerms = buildCompanyTerms(input.companyName);

  if (companyTerms.some((term) => text.includes(term))) {
    return true;
  }

  if (!COMMON_TICKER_WORDS.has(ticker) && new RegExp(`\\b${escapeRegExp(ticker)}\\b`, "i").test(text)) {
    return true;
  }

  return false;
}

function splitRelatedTickers(related?: string | null) {
  if (!related) {
    return [];
  }

  return related
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function buildCompanyTerms(companyName?: string | null) {
  if (!companyName) {
    return [];
  }

  const normalized = companyName.toLowerCase().replace(/[^\w\s.]/g, " ").replace(/\s+/g, " ").trim();
  const terms = new Set<string>([normalized]);

  let withoutSuffix = normalized;
  for (const suffix of COMPANY_SUFFIXES) {
    withoutSuffix = withoutSuffix.replace(new RegExp(`\\b${escapeRegExp(suffix)}$`, "i"), "").trim();
  }

  if (withoutSuffix.length >= 3) {
    terms.add(withoutSuffix);
  }

  return Array.from(terms).filter((term) => term.length >= 3);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
