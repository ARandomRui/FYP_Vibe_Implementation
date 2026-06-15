# Stock News Sentiment Dashboard Documentation

## Overview

This app is a personal stock dashboard that compares recent US stock price movement with recent news sentiment.

The user can search by ticker or company name, such as:

- `AAPL`
- `Apple`
- `MSFT`
- `Microsoft`

After a stock is selected, the app shows:

- company summary
- latest close price
- 30-day price change
- overall news sentiment
- positive, neutral, and negative article counts
- combined 30-day price and sentiment chart
- recent company news articles with article-level sentiment
- cache status and refresh behavior

## Technology Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Recharts
- Prisma
- SQLite for local development
- Finnhub API for stock profile, symbol search, and company news
- Twelve Data API for historical stock prices
- `sentiment` npm package for local article sentiment scoring

## Main Features

### Ticker and Company Name Search

The search box accepts either a ticker or a company name.

If the input looks like a short ticker, the app uses it directly. If the input looks like a company name, the app calls Finnhub symbol search and resolves it to the best matching stock ticker.

Example:

```text
apple -> AAPL
microsoft -> MSFT
```

If no matching stock is found, the app returns a friendly message:

```text
No such stock found for "search text".
```

### Stock Price Fetching

Stock price history is fetched from Twelve Data.

The app requests daily price data, filters it to the active 30-day window, and stores the result in the local database.

The chart uses daily close prices.

### News Fetching

Company news is fetched from Finnhub.

For a first-time stock search, the app fetches the 30-day window in weekly chunks instead of one large request. This helps avoid missing older articles when a provider returns only the most recent or limited results.

First-time fetch pattern:

```text
days 1-7
days 8-14
days 15-21
days 22-30
```

For later stale refreshes, the app fetches only the last 3 days and merges new articles into the cache.

### News Relevance Filtering

Fetched articles are filtered before sentiment scoring.

An article is considered relevant if:

- Finnhub marks the selected ticker as related
- the headline or summary mentions the ticker
- the headline or summary mentions the company name

This reduces broad market news that is not mainly about the selected company.

### Sentiment Analysis

Sentiment is calculated locally by the app using the `sentiment` npm package.

For each article, the app analyzes:

- headline
- summary, if available

Each article receives:

- raw score
- normalized score from `-1` to `1`
- label: `positive`, `neutral`, or `negative`

Current label thresholds:

```text
>= 0.15   positive
< 0.15 and > -0.15   neutral
<= -0.15  negative
```

### Overall Sentiment Score

The overall sentiment score is based on article counts:

```text
overallScore = (positiveCount - negativeCount) / totalScoredArticles
```

Interpretation:

- above `0.20`: bullish
- between `-0.20` and `0.20`: mixed
- below `-0.20`: bearish

### Combined Timeline Chart

The chart compares:

- stock close price on the left axis
- daily sentiment percentage on the right axis

Sentiment is stored internally from `-1` to `1`, then displayed as `-100%` to `100%`.

Important:

The chart is a comparison view, not proof that news sentiment caused price movement.

### Refresh Cache Button

The dashboard includes a `Refresh cache` button.

When clicked, it calls:

```text
GET /api/stocks/[ticker]?refresh=true
```

This forces the app to:

- refresh price data from Twelve Data
- refresh the full 30-day news window from Finnhub
- deduplicate articles
- reuse existing sentiment scores when possible
- score newly fetched articles

## Caching Behavior

The app stores fetched data in SQLite through Prisma.

Recommended cache windows:

- stock metadata: 30 days
- price data: 12 hours
- news data: 6 hours
- article sentiment: permanent unless the model version changes

This reduces API usage and makes repeated searches faster.

## Database

Local development uses SQLite.

Database URL:

```env
DATABASE_URL="file:./dev.db"
```

The SQLite database file is located at:

```text
prisma/dev.db
```

Main tables:

- `stocks`
- `price_points`
- `news_articles`
- `article_sentiments`
- `stock_snapshots`

## Environment Variables

Create `.env.local` in the project root:

```env
DATABASE_URL="file:./dev.db"
FINNHUB_API_KEY="your_finnhub_api_key"
TWELVE_DATA_API_KEY="your_twelve_data_api_key"
```

The `.env.example` file is only a safe template and should not contain real API keys.

## Running Locally

Install dependencies:

```powershell
npm.cmd install
```

Generate Prisma client:

```powershell
npm.cmd run prisma:generate
```

Create or sync the local database:

```powershell
npx.cmd prisma db push
```

Start the dev server on port `3001`:

```powershell
npm.cmd run dev -- -p 3001
```

Open:

```text
http://localhost:3001
```

## Build Check

Run:

```powershell
npx.cmd next build
```

If the build fails with missing `.next` files, stop the dev server, delete the `.next` folder, and rerun the build.

The `.next` folder is generated by Next.js and is safe to recreate.

## API Routes

### Dashboard Route

```text
GET /api/stocks/[tickerOrCompanyName]
```

Returns the full dashboard payload:

- stock metadata
- price summary
- timeline
- articles
- sentiment summary
- cache status

### Force Refresh

```text
GET /api/stocks/[ticker]?refresh=true
```

Forces provider refresh for the selected stock.

## Important Limitations

### Sentiment Quality

The current sentiment engine is simple and may misunderstand financial language.

Example:

```text
"Apple shares fall less than expected"
```

A basic sentiment model may score this incorrectly because it does not deeply understand market context.

### News Coverage

Finnhub news can include broad market or sector articles. The app filters relevance, but some noisy articles may still appear.

### Price Provider Dependency

Historical stock prices use Twelve Data. If the Twelve Data API key is missing or quota is exhausted, the app can still show cached prices but cannot refresh price history.

### Correlation vs Causation

The chart compares price movement and news sentiment. It should not be interpreted as investment advice or proof that sentiment caused price changes.

## Deployment Notes

For Vercel deployment:

- set all environment variables in Vercel project settings
- replace local SQLite with hosted Postgres
- update `DATABASE_URL` to the production database URL
- run Prisma migration or database push for the production database

Recommended production database:

- Vercel Postgres
- Neon
- Supabase Postgres

## Future Improvements

- autocomplete dropdown for search suggestions
- relevance score shown per article
- relevance-weighted overall sentiment
- 3-day sentiment moving average
- better finance-specific sentiment model
- provider fallback for price data
- admin view for cached stocks
- scheduled refresh for frequently searched tickers
