import { chunkDateRange, dateKey, getWindowRange, hoursSince, WINDOW_DAYS, windowDays } from "./dates";
import { getCompanyNews, getCompanyProfile } from "./finnhub";
import { isRelevantCompanyNews } from "./news-filter";
import { prisma } from "./prisma";
import { resolveStockQuery } from "./resolve-stock";
import { scoreArticle, SENTIMENT_MODEL_VERSION } from "./sentiment";
import { getDailyTimeSeries } from "./twelve-data";

const METADATA_CACHE_DAYS = 30;
const PRICE_CACHE_HOURS = 12;
const NEWS_CACHE_HOURS = 6;
const FIRST_NEWS_FETCH_CHUNK_DAYS = 7;
const STALE_NEWS_REFRESH_DAYS = 3;

export type DashboardPayload = Awaited<ReturnType<typeof getStockDashboard>>;

export async function getStockDashboard(tickerInput: string, options: { forceRefresh?: boolean } = {}) {
  const ticker = await resolveStockQuery(tickerInput);
  const { start, end } = getWindowRange();

  let stock = await prisma.stock.findUnique({
    where: { ticker }
  });

  const needsMetadata = !stock || hoursSince(stock.updatedAt) > METADATA_CACHE_DAYS * 24;

  if (needsMetadata) {
    const profile = await getCompanyProfile(ticker);

    stock = await prisma.stock.upsert({
      where: { ticker },
      create: {
        ticker,
        companyName: profile.name || ticker,
        exchange: profile.exchange,
        currency: profile.currency,
        logoUrl: profile.logo,
        lastSearchedAt: new Date()
      },
      update: {
        companyName: profile.name || stock?.companyName || ticker,
        exchange: profile.exchange || stock?.exchange,
        currency: profile.currency || stock?.currency,
        logoUrl: profile.logo || stock?.logoUrl,
        lastSearchedAt: new Date()
      }
    });
  } else {
    stock = await prisma.stock.update({
      where: { ticker },
      data: { lastSearchedAt: new Date() }
    });
  }

  const [latestPriceFetch, latestNewsFetch] = await Promise.all([
    prisma.pricePoint.findFirst({
      where: { stockId: stock.id },
      orderBy: { fetchedAt: "desc" },
      select: { fetchedAt: true }
    }),
    prisma.newsArticle.findFirst({
      where: { stockId: stock.id },
      orderBy: { fetchedAt: "desc" },
      select: { fetchedAt: true }
    })
  ]);

  const refreshErrors: string[] = [];
  let refreshedPrice = false;
  let refreshedNews = false;

  if (options.forceRefresh || hoursSince(latestPriceFetch?.fetchedAt) > PRICE_CACHE_HOURS) {
    try {
      const candles = await getDailyTimeSeries(ticker);
      const windowCandles = candles.filter((candle) => candle.date >= start && candle.date <= end);
      await upsertCandles(stock.id, windowCandles, "twelve-data");
      refreshedPrice = true;
    } catch (error) {
      refreshErrors.push(
        error instanceof Error
          ? `Price refresh failed: ${error.message}`
          : "Price refresh failed."
      );
    }
  }

  if (options.forceRefresh || hoursSince(latestNewsFetch?.fetchedAt) > NEWS_CACHE_HOURS) {
    try {
      const fetchStart = latestNewsFetch?.fetchedAt && !options.forceRefresh
        ? new Date(Math.max(start.getTime(), end.getTime() - (STALE_NEWS_REFRESH_DAYS - 1) * 24 * 60 * 60 * 1000))
        : start;
      const articles = await getCompanyNewsForWindows(ticker, fetchStart, end);
      const relevantArticles = articles.filter((article) =>
        isRelevantCompanyNews({
          ticker,
          companyName: stock.companyName,
          title: article.headline,
          summary: article.summary,
          related: article.related
        })
      );
      await upsertArticles(stock.id, relevantArticles);
      refreshedNews = true;
    } catch (error) {
      refreshErrors.push(
        error instanceof Error
          ? `News refresh failed: ${error.message}`
          : "News refresh failed."
      );
    }
  }

  await scoreUnscoredArticles(stock.id);

  const [prices, articles] = await Promise.all([
    prisma.pricePoint.findMany({
      where: {
        stockId: stock.id,
        date: { gte: start, lte: end }
      },
      orderBy: { date: "asc" }
    }),
    prisma.newsArticle.findMany({
      where: {
        stockId: stock.id,
        publishedAt: { gte: start, lte: end }
      },
      include: { sentiment: true },
      orderBy: { publishedAt: "desc" }
    })
  ]);

  const summary = buildSummary(prices, articles);
  const timeline = buildTimeline(start, end, prices, articles);

  await prisma.stockSnapshot.upsert({
    where: {
      stockId_windowDays: {
        stockId: stock.id,
        windowDays: WINDOW_DAYS
      }
    },
    create: {
      stockId: stock.id,
      windowDays: WINDOW_DAYS,
      overallSentimentScore: summary.overallSentimentScore,
      positiveCount: summary.positiveCount,
      neutralCount: summary.neutralCount,
      negativeCount: summary.negativeCount,
      latestClose: summary.latestClose,
      priceChange30d: summary.priceChange30d,
      timelinePayload: JSON.stringify(timeline)
    },
    update: {
      overallSentimentScore: summary.overallSentimentScore,
      positiveCount: summary.positiveCount,
      neutralCount: summary.neutralCount,
      negativeCount: summary.negativeCount,
      latestClose: summary.latestClose,
      priceChange30d: summary.priceChange30d,
      timelinePayload: JSON.stringify(timeline),
      refreshedAt: new Date()
    }
  });

  return {
    stock: {
      ticker: stock.ticker,
      companyName: stock.companyName,
      exchange: stock.exchange,
      currency: stock.currency,
      logoUrl: stock.logoUrl
    },
    summary,
    timeline,
    articles: articles.map((article) => ({
      id: article.id,
      title: article.title,
      source: article.source,
      url: article.url,
      publishedAt: article.publishedAt.toISOString(),
      summary: article.summary,
      imageUrl: article.imageUrl,
      sentiment: article.sentiment
        ? {
            score: article.sentiment.normalizedScore,
            label: article.sentiment.label
          }
        : null
    })),
    cache: {
      refreshedPrice,
      refreshedNews,
      errors: refreshErrors
    }
  };
}

async function getCompanyNewsForWindows(ticker: string, start: Date, end: Date) {
  const chunks = chunkDateRange(start, end, FIRST_NEWS_FETCH_CHUNK_DAYS);
  const responses = await Promise.all(chunks.map((chunk) => getCompanyNews(ticker, chunk.start, chunk.end)));
  const articlesById = new Map<number, Awaited<ReturnType<typeof getCompanyNews>>[number]>();

  for (const articles of responses) {
    for (const article of articles) {
      articlesById.set(article.id, article);
    }
  }

  return Array.from(articlesById.values());
}

export function normalizeTicker(ticker: string) {
  const normalized = ticker.trim().toUpperCase();

  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(normalized)) {
    throw new Error("Enter a valid US stock ticker, such as AAPL or MSFT.");
  }

  return normalized;
}

async function upsertCandles(stockId: string, candles: Array<{
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>, source = "finnhub") {
  await prisma.$transaction(
    candles.map((candle) =>
      prisma.pricePoint.upsert({
        where: {
          stockId_date: {
            stockId,
            date: candle.date
          }
        },
        create: {
          stockId,
          date: candle.date,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          source
        },
        update: {
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          fetchedAt: new Date()
        }
      })
    )
  );
}

async function upsertArticles(stockId: string, articles: Array<{
  datetime: number;
  headline: string;
  id: number;
  image?: string;
  source?: string;
  summary?: string;
  url: string;
}>) {
  await prisma.$transaction(
    articles.map((article) =>
      prisma.newsArticle.upsert({
        where: {
          providerArticleId: `finnhub:${article.id}`
        },
        create: {
          stockId,
          providerArticleId: `finnhub:${article.id}`,
          title: article.headline,
          source: article.source,
          url: article.url,
          publishedAt: new Date(article.datetime * 1000),
          summary: article.summary,
          imageUrl: article.image,
          rawPayload: JSON.stringify(article)
        },
        update: {
          title: article.headline,
          source: article.source,
          url: article.url,
          publishedAt: new Date(article.datetime * 1000),
          summary: article.summary,
          imageUrl: article.image,
          rawPayload: JSON.stringify(article),
          fetchedAt: new Date()
        }
      })
    )
  );
}

async function scoreUnscoredArticles(stockId: string) {
  const articles = await prisma.newsArticle.findMany({
    where: {
      stockId,
      OR: [
        { sentiment: null },
        {
          sentiment: {
            modelVersion: { not: SENTIMENT_MODEL_VERSION }
          }
        }
      ]
    },
    include: { sentiment: true }
  });

  await prisma.$transaction(
    articles.map((article) => {
      const sentiment = scoreArticle({
        title: article.title,
        summary: article.summary
      });

      return prisma.articleSentiment.upsert({
        where: { articleId: article.id },
        create: {
          articleId: article.id,
          ...sentiment
        },
        update: sentiment
      });
    })
  );
}

function buildSummary(
  prices: Array<{ close: number }>,
  articles: Array<{ sentiment: { label: string; normalizedScore: number } | null }>
) {
  const positiveCount = articles.filter((article) => article.sentiment?.label === "positive").length;
  const neutralCount = articles.filter((article) => article.sentiment?.label === "neutral").length;
  const negativeCount = articles.filter((article) => article.sentiment?.label === "negative").length;
  const totalScoredArticles = positiveCount + neutralCount + negativeCount;
  const overallSentimentScore =
    totalScoredArticles > 0 ? (positiveCount - negativeCount) / totalScoredArticles : 0;
  const latestClose = prices.at(-1)?.close ?? null;
  const firstClose = prices.at(0)?.close ?? null;
  const priceChange30d = latestClose !== null && firstClose !== null ? latestClose - firstClose : null;
  const priceChangePercent =
    priceChange30d !== null && firstClose ? (priceChange30d / firstClose) * 100 : null;

  return {
    articleCount: articles.length,
    positiveCount,
    neutralCount,
    negativeCount,
    totalScoredArticles,
    overallSentimentScore,
    overallSentimentLabel: labelOverall(overallSentimentScore),
    latestClose,
    priceChange30d,
    priceChangePercent
  };
}

function buildTimeline(
  start: Date,
  end: Date,
  prices: Array<{ date: Date; close: number }>,
  articles: Array<{ publishedAt: Date; sentiment: { normalizedScore: number } | null }>
) {
  const pricesByDay = new Map(prices.map((price) => [dateKey(price.date), price.close]));
  const sentimentsByDay = new Map<string, number[]>();

  for (const article of articles) {
    if (!article.sentiment) {
      continue;
    }

    const key = dateKey(article.publishedAt);
    const values = sentimentsByDay.get(key) ?? [];
    values.push(article.sentiment.normalizedScore);
    sentimentsByDay.set(key, values);
  }

  return windowDays(start, end).map((date) => {
    const key = dateKey(date);
    const sentiments = sentimentsByDay.get(key) ?? [];

    return {
      date: key,
      close: pricesByDay.get(key) ?? null,
      sentiment:
        sentiments.length > 0
          ? sentiments.reduce((sum, value) => sum + value, 0) / sentiments.length
          : null,
      articleCount: sentiments.length
    };
  });
}

function labelOverall(score: number) {
  if (score > 0.2) {
    return "bullish";
  }

  if (score < -0.2) {
    return "bearish";
  }

  return "mixed";
}
