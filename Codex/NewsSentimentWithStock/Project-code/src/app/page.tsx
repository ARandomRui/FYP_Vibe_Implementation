"use client";

import { FormEvent, useState, useTransition } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Newspaper,
  RefreshCw,
  Search
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type DashboardPayload = {
  stock: {
    ticker: string;
    companyName: string | null;
    exchange: string | null;
    currency: string | null;
    logoUrl: string | null;
  };
  summary: {
    articleCount: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    overallSentimentScore: number;
    overallSentimentLabel: string;
    latestClose: number | null;
    priceChange30d: number | null;
    priceChangePercent: number | null;
  };
  timeline: Array<{
    date: string;
    close: number | null;
    sentiment: number | null;
    articleCount: number;
  }>;
  articles: Array<{
    id: string;
    title: string;
    source: string | null;
    url: string;
    publishedAt: string;
    summary: string | null;
    imageUrl: string | null;
    sentiment: {
      score: number;
      label: string;
    } | null;
  }>;
  cache: {
    refreshedPrice: boolean;
    refreshedNews: boolean;
    errors: string[];
  };
};

const formatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

export default function Home() {
  const [ticker, setTicker] = useState("AAPL");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadStock(query: string, options: { refresh?: boolean } = {}) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError("Enter a ticker or company name to search.");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const refreshParam = options.refresh ? "?refresh=true" : "";
        const response = await fetch(`/api/stocks/${encodeURIComponent(trimmedQuery)}${refreshParam}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load this stock.");
        }

        setData(payload);
        setActiveQuery(payload.stock.ticker);
        setTicker(payload.stock.ticker);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load this stock.");
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadStock(ticker);
  }

  function refreshCurrentStock() {
    loadStock(data?.stock.ticker || activeQuery || ticker, { refresh: true });
  }

  const chartData = data?.timeline.map((point) => ({
    ...point,
    sentimentPercent: point.sentiment === null ? null : point.sentiment * 100
  }));

  return (
    <main className="min-h-screen px-5 py-6 md:px-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-7">
        <header className="flex flex-col justify-between gap-5 border-b border-[var(--line)] pb-6 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              News sentiment lab
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
              Market mood, mapped against price.
            </h1>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex w-full max-w-md items-center gap-2 border border-[var(--line)] bg-[var(--panel)] p-2 shadow-sm"
          >
            <Search className="ml-2 size-5 text-[var(--ink-muted)]" aria-hidden="true" />
            <input
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              placeholder="AAPL or Apple"
              className="min-w-0 flex-1 bg-transparent px-1 py-3 text-lg font-semibold uppercase outline-none"
              aria-label="Stock ticker or company name"
            />
            <button
              type="submit"
              disabled={isPending}
              className="flex h-11 w-11 shrink-0 items-center justify-center bg-[var(--accent)] text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Search stock"
              title="Search stock"
            >
              {isPending ? <RefreshCw className="size-5 animate-spin" /> : <Search className="size-5" />}
            </button>
          </form>
        </header>

        {error ? (
          <div className="flex items-center gap-3 border border-[#d9afa7] bg-[#fff6f3] px-4 py-3 text-[#8f2f24]">
            <AlertCircle className="size-5" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}

        {data ? (
          <>
            <section className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
              <div className="border border-[var(--line)] bg-[var(--panel)] p-5">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                  <div className="flex items-center gap-4">
                    {data.stock.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.stock.logoUrl}
                        alt=""
                        className="h-14 w-14 border border-[var(--line)] object-contain p-2"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center border border-[var(--line)] bg-[var(--panel-strong)]">
                        <Activity className="size-7 text-[var(--accent)]" aria-hidden="true" />
                      </div>
                    )}
                <div>
                  <p className="text-sm uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                    {data.stock.exchange || "US market"}
                  </p>
                      <h2 className="text-3xl font-semibold">{data.stock.ticker}</h2>
                      <p className="text-[var(--ink-muted)]">{data.stock.companyName || "Company profile"}</p>
                    </div>
                  </div>

                <div className="text-left md:text-right">
                  <p className="text-sm uppercase tracking-[0.16em] text-[var(--ink-muted)]">Latest close</p>
                  <p className="text-4xl font-semibold">
                      {data.summary.latestClose === null
                        ? "N/A"
                        : currencyFormatter.format(data.summary.latestClose)}
                    </p>
                  <p className={priceTone(data.summary.priceChange30d)}>
                    {formatChange(data.summary.priceChange30d, data.summary.priceChangePercent)}
                  </p>
                  <button
                    type="button"
                    onClick={refreshCurrentStock}
                    disabled={isPending}
                    className="mt-4 inline-flex items-center gap-2 border border-[var(--line)] bg-[#fbf7ed] px-3 py-2 text-sm font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
                    Refresh cache
                  </button>
                </div>
                </div>
              </div>

              <div className="border border-[var(--line)] bg-[var(--foreground)] p-5 text-white">
                <p className="text-sm uppercase tracking-[0.16em] text-[#c9d6d8]">Overall sentiment</p>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-4xl font-semibold capitalize">{data.summary.overallSentimentLabel}</p>
                  <SentimentIcon label={data.summary.overallSentimentLabel} />
                </div>
                <p className="mt-4 text-[#dbe2dc]">
                  {formatter.format(data.summary.overallSentimentScore * 100)} score from{" "}
                  {data.summary.articleCount} articles
                </p>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-4">
              <Metric label="Positive" value={data.summary.positiveCount} tone="positive" />
              <Metric label="Neutral" value={data.summary.neutralCount} tone="neutral" />
              <Metric label="Negative" value={data.summary.negativeCount} tone="negative" />
              <Metric label="Articles" value={data.summary.articleCount} tone="accent" />
            </section>

            <section className="border border-[var(--line)] bg-[var(--panel)] p-4 md:p-6">
              <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-semibold">30-day price and sentiment timeline</h2>
                  <p className="text-[var(--ink-muted)]">Price uses daily close. Sentiment is averaged per news day.</p>
                </div>
                <div className="flex gap-4 text-sm text-[var(--ink-muted)]">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-6 bg-[var(--accent)]" />
                    Close
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-6 bg-[var(--gold)]" />
                    Sentiment
                  </span>
                </div>
              </div>
              <div className="h-[360px] w-full">
                <ResponsiveContainer>
                  <ComposedChart data={chartData} margin={{ top: 12, right: 10, left: 0, bottom: 12 }}>
                    <CartesianGrid stroke="#e0d7c7" vertical={false} />
                    <XAxis dataKey="date" minTickGap={28} tick={{ fill: "#6b6f68", fontSize: 12 }} />
                    <YAxis
                      yAxisId="price"
                      tick={{ fill: "#6b6f68", fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <YAxis
                      yAxisId="sentiment"
                      orientation="right"
                      domain={[-100, 100]}
                      tick={{ fill: "#6b6f68", fontSize: 12 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      yAxisId="sentiment"
                      dataKey="sentimentPercent"
                      fill="var(--gold)"
                      opacity={0.42}
                      radius={[2, 2, 0, 0]}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="close"
                      stroke="var(--accent)"
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="border border-[var(--line)] bg-[var(--panel)] p-5">
                <h2 className="text-2xl font-semibold">Cache status</h2>
                <div className="mt-4 space-y-3 text-[var(--ink-muted)]">
                  <p>Price refresh: {data.cache.refreshedPrice ? "live fetch completed" : "served from cache"}</p>
                  <p>News refresh: {data.cache.refreshedNews ? "live fetch completed" : "served from cache"}</p>
                  {data.cache.errors.length > 0 ? (
                    <div className="border border-[#d9afa7] bg-[#fff6f3] p-3 text-[#8f2f24]">
                      {data.cache.errors.map((cacheError) => (
                        <p key={cacheError}>{cacheError}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border border-[var(--line)] bg-[var(--panel)] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">Recent articles</h2>
                  <Newspaper className="size-6 text-[var(--accent)]" aria-hidden="true" />
                </div>
                <div className="space-y-3">
                  {data.articles.length > 0 ? (
                    data.articles.slice(0, 12).map((article) => <ArticleRow key={article.id} article={article} />)
                  ) : (
                    <p className="text-[var(--ink-muted)]">No recent company news found for this ticker.</p>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="grid min-h-[420px] place-items-center border border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.55)] p-8 text-center">
            <div className="max-w-xl">
              <Activity className="mx-auto mb-5 size-12 text-[var(--accent)]" aria-hidden="true" />
              <h2 className="text-3xl font-semibold">Search a US stock to begin.</h2>
              <p className="mt-3 text-[var(--ink-muted)]">
                Enter a ticker or company name. The first search fetches live price and news data, then later searches
                reuse the stored cache until it becomes stale.
              </p>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "positive" | "neutral" | "negative" | "accent";
}) {
  const color =
    tone === "positive"
      ? "var(--positive)"
      : tone === "negative"
        ? "var(--negative)"
        : tone === "accent"
          ? "var(--accent)"
          : "var(--neutral)";

  return (
    <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-sm uppercase tracking-[0.16em] text-[var(--ink-muted)]">{label}</p>
      <p className="mt-2 text-4xl font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function ArticleRow({
  article
}: {
  article: DashboardPayload["articles"][number];
}) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      className="block border border-[var(--line)] bg-[#fbf7ed] p-4 transition hover:border-[var(--accent)]"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {article.source || "News"} · {new Date(article.publishedAt).toLocaleDateString()}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">{article.title}</h3>
          {article.summary ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--ink-muted)]">{article.summary}</p>
          ) : null}
        </div>
        <span className={sentimentBadge(article.sentiment?.label)}>
          {article.sentiment?.label || "unscored"}{" "}
          {article.sentiment ? formatter.format(article.sentiment.score * 100) : ""}
        </span>
      </div>
    </a>
  );
}

function SentimentIcon({ label }: { label: string }) {
  if (label === "bullish") {
    return <ArrowUpRight className="size-11 text-[var(--positive)]" aria-hidden="true" />;
  }

  if (label === "bearish") {
    return <ArrowDownRight className="size-11 text-[var(--negative)]" aria-hidden="true" />;
  }

  return <Activity className="size-11 text-[#dbe2dc]" aria-hidden="true" />;
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | null; payload: { articleCount: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const close = payload.find((item) => item.dataKey === "close")?.value;
  const sentiment = payload.find((item) => item.dataKey === "sentimentPercent")?.value;

  return (
    <div className="border border-[var(--line)] bg-[var(--panel)] p-3 shadow-sm">
      <p className="font-semibold">{label}</p>
      <p className="text-sm text-[var(--ink-muted)]">
        Close: {typeof close === "number" ? currencyFormatter.format(close) : "N/A"}
      </p>
      <p className="text-sm text-[var(--ink-muted)]">
        Sentiment: {typeof sentiment === "number" ? `${formatter.format(sentiment)}%` : "N/A"}
      </p>
      <p className="text-sm text-[var(--ink-muted)]">Articles: {payload[0]?.payload.articleCount ?? 0}</p>
    </div>
  );
}

function priceTone(value: number | null) {
  if (value === null) {
    return "mt-1 text-[var(--ink-muted)]";
  }

  return value >= 0 ? "mt-1 text-[var(--positive)]" : "mt-1 text-[var(--negative)]";
}

function formatChange(change: number | null, percent: number | null) {
  if (change === null || percent === null) {
    return "30-day change unavailable";
  }

  const sign = change >= 0 ? "+" : "";
  return `${sign}${currencyFormatter.format(change)} (${sign}${formatter.format(percent)}%) over 30 days`;
}

function sentimentBadge(label?: string) {
  const base = "shrink-0 self-start border px-3 py-1 text-sm font-semibold capitalize";

  if (label === "positive") {
    return `${base} border-[#9cc8b7] bg-[#edf8f3] text-[var(--positive)]`;
  }

  if (label === "negative") {
    return `${base} border-[#e0aaaa] bg-[#fff3f3] text-[var(--negative)]`;
  }

  return `${base} border-[#c6cbd0] bg-[#f3f4f2] text-[var(--neutral)]`;
}
