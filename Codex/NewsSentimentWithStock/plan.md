# Stock News Sentiment Website - Implementation Plan

## Status

This is the agreed pre-implementation plan as of 2026-05-27.

Implementation has not started yet. The architecture now separates news fetching from news sentiment analysis so the app is more flexible and less dependent on one provider's built-in sentiment feature.

## Project Goal

Build a realistic personal-use website that lets the user search for a US stock ticker and compare recent news sentiment against recent stock price movement.

The app should use real data, cache fetched results, and present a 30-day view that is useful without requiring authentication.

## Confirmed Requirements

- audience: personal use
- market scope: US stocks only
- stock selection: free-text ticker or company-name search
- time window: 30 days
- sentiment output: article-level sentiment plus overall sentiment
- overall score: based on how many articles are good vs bad
- visualization: combined timeline of stock price and sentiment
- authentication: none
- data freshness: live fetch first, then store/cache for future searches
- deployment target: Vercel-style cloud hosting

## Recommended Architecture

### Core Decision

Separate the data pipeline into three parts:

1. stock price fetching
2. news article fetching
3. sentiment analysis performed by our own app

This means the news API only needs to provide relevant articles. It does not need to provide sentiment.

### Why This Is Better

- avoids being locked into one API's sentiment quality
- allows better free-tier options
- lets us improve sentiment analysis later without changing the news provider
- makes cached sentiment reusable because each article can be scored once
- keeps the dashboard logic under our control

## Recommended MVP Providers

### Primary News/Profile Provider: Finnhub

Use Finnhub for:

- US stock company profile / symbol validation
- recent company news

### Why Finnhub

- strong free-tier fit for personal use
- company news endpoint is straightforward
- sentiment can be handled by our own app instead of paid provider sentiment

### Primary Price Provider: Twelve Data

Use Twelve Data for:

- recent daily stock price history
- 30-day price chart data

### Why Twelve Data

- Finnhub's stock candle endpoint returned `403` with the tested free key
- Twelve Data has a clearer free-tier fit for daily historical price data
- keeping price fetching separate from news fetching makes provider changes smaller

### Sentiment Engine

Use an internal sentiment layer for v1:

- initial implementation: `sentiment` npm package
- score inputs: article headline plus available summary
- output: numeric score, comparative score, and label
- future upgrade path: finance-specific NLP model, Hugging Face model, or OpenAI-based analysis

### Provider Alternatives

Keep these as fallback options:

- marketaux for news if richer news filtering is needed
- Alpha Vantage if a single provider with built-in news sentiment is preferred later

## Product Behavior

### Search Flow

1. User enters a ticker such as `AAPL` or a company name such as `Apple`.
2. App resolves the search input to a US ticker.
3. Backend validates the resolved ticker format.
4. Backend checks whether cached data for that ticker is fresh.
5. If cache is fresh, return the stored dashboard payload.
6. If cache is stale or missing, fetch price data from Twelve Data and news from Finnhub.
7. Backend normalizes and stores raw price/news data.
8. Backend runs sentiment analysis for newly seen articles.
9. Backend stores article-level sentiment results.
10. Backend builds the 30-day combined timeline and overall sentiment summary.
11. Frontend renders the dashboard.

### Caching Rule

Live fetch the first time a ticker is searched. After that, use stored data until it becomes stale.

Recommended cache windows:

- stock/company metadata: 30 days
- price candles: 12 hours
- company news: 6 hours
- article sentiment: permanent unless the sentiment model version changes
- dashboard snapshot: rebuild whenever price or news data refreshes

### Sentiment Reprocessing

Store a `sentimentModelVersion` with each scored article.

If the scoring approach changes later, the app can rescore old articles without refetching news.

## Sentiment Plan

### Article-Level Sentiment

For each article, analyze:

- headline
- summary, if available

The sentiment engine should return:

- raw numeric score
- normalized score from `-1` to `1`
- label: `positive`, `neutral`, or `negative`

### Label Thresholds

Initial thresholds:

- `>= 0.15`: positive
- `> -0.15` and `< 0.15`: neutral
- `<= -0.15`: negative

These can be tuned after reviewing real article results.

### Overall Sentiment Formula

Use a simple, explainable formula:

`overallScore = (positiveCount - negativeCount) / totalScoredArticles`

Interpretation:

- `> 0.20`: bullish / mostly positive
- `-0.20` to `0.20`: mixed or neutral
- `< -0.20`: bearish / mostly negative

### Daily Sentiment Formula

For the combined timeline, group articles by publish date:

`dailySentiment = average(normalizedArticleSentimentScoresForThatDate)`

If a date has no articles, use `null` for sentiment rather than inventing a value.

## UI Plan

### Main Screen

Build a single dashboard page with:

- header
- free-text ticker search
- stock summary strip
- combined price and sentiment timeline
- overall sentiment summary
- recent article list

### Combined Timeline

Use a dual-axis chart:

- X-axis: date
- left Y-axis: closing price
- right Y-axis: sentiment score from `-1` to `1`

Recommended display:

- price as a line
- sentiment as bars or a second line
- tooltip with date, close price, daily sentiment, and article count

### Summary Cards

Show:

- latest close price
- 30-day price change
- article count
- positive article count
- neutral article count
- negative article count
- overall sentiment label

### Article List

Each article row should show:

- headline
- source
- publish date
- sentiment label
- sentiment score
- link to original article

### Empty and Error States

Handle:

- invalid ticker
- ticker has price data but little or no recent news
- Finnhub rate limit
- upstream API failure
- stale cached data used because refresh failed

## Suggested Technical Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts

### Backend

- Next.js Route Handlers
- Zod for request/response validation
- Finnhub API client
- Twelve Data API client
- internal sentiment service

### Storage

- Prisma ORM
- Postgres for production
- SQLite may be used during local development if faster to bootstrap

### Deployment

- Vercel for app hosting
- hosted Postgres for persistent cache/storage

## Data Model

### `stocks`

- `id`
- `ticker`
- `companyName`
- `exchange`
- `currency`
- `logoUrl`
- `lastSearchedAt`
- `createdAt`
- `updatedAt`

### `price_points`

- `id`
- `stockId`
- `date`
- `open`
- `high`
- `low`
- `close`
- `volume`
- `source`
- `fetchedAt`

### `news_articles`

- `id`
- `stockId`
- `providerArticleId`
- `title`
- `source`
- `url`
- `publishedAt`
- `summary`
- `imageUrl`
- `rawPayload`
- `fetchedAt`
- `createdAt`
- `updatedAt`

### `article_sentiments`

- `id`
- `articleId`
- `modelName`
- `modelVersion`
- `rawScore`
- `normalizedScore`
- `label`
- `analyzedText`
- `createdAt`

### `stock_snapshots`

Optional denormalized table for faster dashboard reads:

- `id`
- `stockId`
- `windowDays`
- `overallSentimentScore`
- `positiveCount`
- `neutralCount`
- `negativeCount`
- `latestClose`
- `priceChange30d`
- `timelinePayload`
- `refreshedAt`

## Backend API Plan

### Dashboard Endpoint

`GET /api/stocks/[ticker]`

Returns:

- stock metadata
- latest price summary
- 30-day price series
- article list with sentiment
- daily timeline
- overall sentiment summary
- cache status

### Optional Search Endpoint

`GET /api/search?q=apple`

Use later if we want autocomplete suggestions. For now, company-name resolution happens inside the dashboard endpoint.

## Finnhub Endpoint Mapping

Likely Finnhub endpoints:

- company profile endpoint for ticker metadata
- company news endpoint for 30-day news

Implementation notes:

- keep the Finnhub API key server-side only
- convert user-entered ticker to uppercase
- store raw payloads for debugging provider behavior

## Twelve Data Endpoint Mapping

Likely Twelve Data endpoint:

- time series endpoint with `interval=1day`

Implementation notes:

- keep the Twelve Data API key server-side only
- request more than 30 rows so weekends and market holidays do not leave the chart short
- filter results to the active 30-day window before saving

## Timeline Construction

For each day in the 30-day window:

- include the stock closing price if available
- attach the average sentiment score for articles published that day
- attach article count for that day

If the market was closed:

- price can be omitted or carried only if the chart library needs continuity
- sentiment should still appear if articles were published that day

The chart label should make clear that this is a comparison view, not proof of causation.

## Non-Functional Requirements

### Performance

- cached searches should respond quickly
- first-time searches should show loading feedback
- API work should happen server-side

### Reliability

- cached data should still be displayed if a refresh fails
- provider errors should be shown clearly
- no-news cases should not look broken

### Security

- API keys must stay in server environment variables
- frontend must never call Finnhub directly
- no authentication needed for v1

### Maintainability

- provider fetching and sentiment scoring should be separate modules
- sentiment model version should be tracked
- normalized data should be independent from Finnhub-specific payload shape

## Risks and Mitigations

### Sentiment Quality

Risk:

- basic sentiment libraries may misread finance-specific language.

Mitigation:

- keep v1 explainable and cached
- expose article-level scores
- design the sentiment layer so it can be upgraded later

### API Rate Limits

Risk:

- repeated searches can exhaust the free-tier API.

Mitigation:

- cache data in the database
- refresh stale data on demand
- avoid refetching sentiment for articles already scored

### News Relevance

Risk:

- company news may include weakly related articles.

Mitigation:

- prefer ticker-specific company news endpoints
- deduplicate articles by URL/provider ID
- optionally filter article text for company/ticker mentions

## Implementation Milestones

### Phase 1 - Project Setup

- initialize Next.js app
- configure TypeScript, Tailwind, ESLint, Prisma
- add environment-variable support

### Phase 2 - Data Layer

- create Prisma schema
- add database migrations
- implement stock, price, article, and sentiment tables
- add cache freshness helpers

### Phase 3 - Provider and Sentiment Services

- implement Finnhub client
- implement price data fetcher
- implement company news fetcher
- implement sentiment scorer
- add normalization utilities

### Phase 4 - Dashboard API

- implement `GET /api/stocks/[ticker]`
- add cache-first behavior
- add stale-data fallback
- generate daily timeline and overall score

### Phase 5 - Frontend Dashboard

- build ticker search
- build summary strip
- build combined timeline chart
- build sentiment summary
- build article list
- add loading, empty, and error states

### Phase 6 - Deployment Preparation

- configure Vercel environment variables
- connect production Postgres
- test uncached and cached searches
- document required API keys

## Definition of Done for MVP

The MVP is complete when:

- the user can search a US ticker or company name
- the app fetches real price data from Twelve Data
- the app fetches real company news from Finnhub
- the app scores each article using the internal sentiment layer
- the app stores fetched data and sentiment results
- repeated searches use cached data when fresh
- the dashboard shows a 30-day price and sentiment timeline
- the dashboard shows article-level sentiment and overall sentiment
- the app can be deployed to Vercel

## Remaining Decisions Before Implementation

1. For the first local build, use SQLite for speed or start directly with Postgres?

Recommended defaults:

- SQLite locally, Postgres in production

## Sources Checked During Planning

- Finnhub pricing: https://api.finnhub.io/pricing
- Finnhub company news docs: https://finnhub.io/docs/api/company-news
- Finnhub stock candles docs: https://finnhub.io/docs/api/stock-candles
- Twelve Data docs: https://twelvedata.com/docs
- Twelve Data pricing: https://twelvedata.com/pricing
- marketaux pricing: https://www.marketaux.com/pricing
- marketaux documentation: https://www.marketaux.com/documentation
- Alpha Vantage documentation: https://www.alphavantage.co/documentation/
- Alpha Vantage pricing: https://www.alphavantage.co/premium/
- Vercel pricing docs: https://vercel.com/docs/pricing
- Vercel cron usage and pricing: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel Postgres docs: https://vercel.com/docs/storage/vercel-postgres
