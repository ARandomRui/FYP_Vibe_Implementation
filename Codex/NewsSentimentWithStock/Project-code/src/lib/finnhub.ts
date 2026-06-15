import { z } from "zod";
import { toFinnhubDate, toUnixSeconds } from "./dates";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

const profileSchema = z.object({
  name: z.string().optional(),
  ticker: z.string().optional(),
  exchange: z.string().optional(),
  currency: z.string().optional(),
  logo: z.string().optional()
});

const candleSchema = z.object({
  c: z.array(z.number()).optional(),
  h: z.array(z.number()).optional(),
  l: z.array(z.number()).optional(),
  o: z.array(z.number()).optional(),
  s: z.string(),
  t: z.array(z.number()).optional(),
  v: z.array(z.number()).optional()
});

const newsItemSchema = z.object({
  category: z.string().optional(),
  datetime: z.number(),
  headline: z.string(),
  id: z.number(),
  image: z.string().optional(),
  related: z.string().optional(),
  source: z.string().optional(),
  summary: z.string().optional(),
  url: z.string().url()
});

const symbolSearchSchema = z.object({
  count: z.number().optional(),
  result: z
    .array(
      z.object({
        description: z.string(),
        displaySymbol: z.string().optional(),
        symbol: z.string(),
        type: z.string().optional()
      })
    )
    .optional()
});

export type FinnhubProfile = z.infer<typeof profileSchema>;

export type FinnhubCandle = {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type FinnhubNewsItem = z.infer<typeof newsItemSchema>;
export type FinnhubSymbolResult = NonNullable<z.infer<typeof symbolSearchSchema>["result"]>[number];

export class FinnhubError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "FinnhubError";
  }
}

export async function getCompanyProfile(ticker: string) {
  const data = await request("stock/profile2", { symbol: ticker });
  return profileSchema.parse(data);
}

export async function searchSymbols(query: string) {
  const data = await request("search", { q: query });
  return symbolSearchSchema.parse(data).result ?? [];
}

export async function getCompanyNews(ticker: string, start: Date, end: Date) {
  const data = await request("company-news", {
    symbol: ticker,
    from: toFinnhubDate(start),
    to: toFinnhubDate(end)
  });

  return z.array(newsItemSchema).parse(data);
}

export async function getDailyCandles(ticker: string, start: Date, end: Date) {
  const data = candleSchema.parse(
    await request("stock/candle", {
      symbol: ticker,
      resolution: "D",
      from: String(toUnixSeconds(start)),
      to: String(toUnixSeconds(end))
    })
  );

  if (data.s === "no_data") {
    return [];
  }

  if (data.s !== "ok" || !data.t || !data.o || !data.h || !data.l || !data.c || !data.v) {
    throw new FinnhubError("Finnhub did not return usable candle data.");
  }

  return data.t.map((timestamp, index) => ({
    date: new Date(timestamp * 1000),
    open: data.o![index],
    high: data.h![index],
    low: data.l![index],
    close: data.c![index],
    volume: data.v![index]
  }));
}

async function request(path: string, params: Record<string, string>) {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new FinnhubError("Missing FINNHUB_API_KEY. Add it to .env.local before searching live data.");
  }

  const url = new URL(`${FINNHUB_BASE_URL}/${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("token", apiKey);

  const response = await fetch(url, {
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new FinnhubError(`Finnhub request failed with status ${response.status}.`, response.status);
  }

  const data = await response.json();

  if (data?.error) {
    throw new FinnhubError(String(data.error));
  }

  return data;
}
