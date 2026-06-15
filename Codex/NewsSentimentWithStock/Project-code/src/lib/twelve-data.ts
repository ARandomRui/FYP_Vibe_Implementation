import { z } from "zod";

const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";

const timeSeriesSchema = z.object({
  meta: z
    .object({
      symbol: z.string().optional(),
      currency: z.string().optional(),
      exchange: z.string().optional()
    })
    .optional(),
  values: z
    .array(
      z.object({
        datetime: z.string(),
        open: z.string(),
        high: z.string(),
        low: z.string(),
        close: z.string(),
        volume: z.string().optional()
      })
    )
    .optional(),
  status: z.string().optional(),
  message: z.string().optional(),
  code: z.number().optional()
});

export type TwelveDataCandle = {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export class TwelveDataError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "TwelveDataError";
  }
}

export async function getDailyTimeSeries(ticker: string, outputSize = 45): Promise<TwelveDataCandle[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new TwelveDataError(
      "Missing TWELVE_DATA_API_KEY. Add it to .env.local to load stock price history."
    );
  }

  const url = new URL(`${TWELVE_DATA_BASE_URL}/time_series`);
  url.searchParams.set("symbol", ticker);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(outputSize));
  url.searchParams.set("order", "ASC");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, {
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new TwelveDataError(`Twelve Data request failed with status ${response.status}.`, response.status);
  }

  const data = timeSeriesSchema.parse(await response.json());

  if (data.status === "error") {
    throw new TwelveDataError(data.message || "Twelve Data returned an error.", data.code);
  }

  if (!data.values?.length) {
    return [];
  }

  return data.values.map((value) => ({
    date: new Date(`${value.datetime}T00:00:00.000Z`),
    open: Number(value.open),
    high: Number(value.high),
    low: Number(value.low),
    close: Number(value.close),
    volume: Number(value.volume ?? 0)
  }));
}
