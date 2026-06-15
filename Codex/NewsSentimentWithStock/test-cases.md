# Test Cases

## Overview

This document lists practical test cases for the Stock News Sentiment Dashboard.

The project can support automated tests later with tools such as:

- Vitest for unit tests
- React Testing Library for component tests
- Playwright for browser/end-to-end tests
- mocked API responses for Finnhub and Twelve Data

For now, these cases define what should be tested and what the expected behavior is.

## Environment Setup Tests

### TC-001: Required Environment Variables Exist

Precondition:

- `.env.local` exists

Steps:

1. Check that `DATABASE_URL` is defined.
2. Check that `FINNHUB_API_KEY` is defined.
3. Check that `TWELVE_DATA_API_KEY` is defined.

Expected result:

- App can start without missing environment variable errors.

### TC-002: Database Is Initialized

Precondition:

- Dependencies are installed.

Steps:

1. Run `npx.cmd prisma db push`.
2. Start the app.

Expected result:

- `prisma/dev.db` exists.
- App can write stock, price, article, and sentiment records.

## Search Tests

### TC-003: Search By Valid Ticker

Steps:

1. Open the app.
2. Search `AAPL`.

Expected result:

- Dashboard loads Apple stock data.
- Displayed ticker is `AAPL`.

### TC-004: Search By Company Name

Steps:

1. Open the app.
2. Search `apple`.

Expected result:

- Input resolves to `AAPL`.
- Dashboard loads Apple stock data.
- Search box updates to `AAPL`.

### TC-005: Search Another Company Name

Steps:

1. Search `microsoft`.

Expected result:

- Input resolves to `MSFT`.
- Dashboard loads Microsoft stock data.

### TC-006: No Such Stock Found

Steps:

1. Search a nonsense term such as `zzzznotastock123`.

Expected result:

- App shows a clear error message:

```text
No such stock found for "zzzznotastock123".
```

- Dashboard does not crash.

### TC-007: Empty Search

Steps:

1. Clear the search input.
2. Submit the search.

Expected result:

- App shows:

```text
Enter a ticker or company name to search.
```

## Price Data Tests

### TC-008: Twelve Data Price Fetch Works

Steps:

1. Search `AAPL`.

Expected result:

- Price refresh succeeds if the Twelve Data key is valid.
- Latest close price is shown.
- 30-day price chart line appears.

### TC-009: Missing Twelve Data Key

Precondition:

- Remove or temporarily rename `TWELVE_DATA_API_KEY`.

Steps:

1. Search a stock that has no cached price data.

Expected result:

- App shows a price refresh error.
- App does not crash.
- News data can still load if Finnhub is configured.

### TC-010: Cached Price Data Is Reused

Steps:

1. Search `AAPL`.
2. Search `AAPL` again within the price cache window.

Expected result:

- Second search uses cached price data.
- Cache status says price was served from cache.

## News Fetch Tests

### TC-011: First-Time News Fetch Uses Full Month

Precondition:

- The stock has no cached news.

Steps:

1. Search a stock.

Expected result:

- App fetches the 30-day news window in weekly chunks.
- Articles from different parts of the month can appear if available.
- Articles are stored in the database.

### TC-012: Stale News Refresh Uses Recent Window

Precondition:

- The stock already has cached news.
- News cache is stale.

Steps:

1. Search the same stock again.

Expected result:

- App fetches only the recent refresh window.
- New articles are merged into existing cached articles.
- Duplicate articles are not created.

### TC-013: Article Deduplication

Steps:

1. Search a stock.
2. Refresh cache for the same stock.

Expected result:

- Existing articles are updated, not duplicated.
- Article count does not inflate incorrectly.

### TC-014: News Relevance Filtering

Steps:

1. Search `AAPL`.
2. Inspect article list.

Expected result:

- Articles should mention Apple, AAPL, or have `AAPL` as a related ticker.
- Broad unrelated market articles should be reduced.

## Sentiment Tests

### TC-015: Positive Article Sentiment

Input:

```text
Apple shares rise after strong earnings report
```

Expected result:

- Sentiment label is `positive`.
- Normalized score is greater than or equal to `0.15`.

### TC-016: Negative Article Sentiment

Input:

```text
Apple shares fall after weak demand warning
```

Expected result:

- Sentiment label is `negative`.
- Normalized score is less than or equal to `-0.15`.

### TC-017: Neutral Article Sentiment

Input:

```text
Apple announces annual developer conference date
```

Expected result:

- Sentiment label is `neutral`, unless the sentiment library scores it strongly.

### TC-018: Sentiment Is Not Recomputed Unnecessarily

Steps:

1. Search a stock.
2. Search the same stock again.

Expected result:

- Existing articles keep their stored sentiment rows.
- Sentiment is only computed for new or model-version-mismatched articles.

## Overall Sentiment Tests

### TC-019: Bullish Overall Sentiment

Input state:

- positive articles: 6
- negative articles: 1
- neutral articles: 3

Expected result:

```text
overallScore = (6 - 1) / 10 = 0.5
label = bullish
```

### TC-020: Bearish Overall Sentiment

Input state:

- positive articles: 1
- negative articles: 6
- neutral articles: 3

Expected result:

```text
overallScore = (1 - 6) / 10 = -0.5
label = bearish
```

### TC-021: Mixed Overall Sentiment

Input state:

- positive articles: 3
- negative articles: 2
- neutral articles: 5

Expected result:

```text
overallScore = (3 - 2) / 10 = 0.1
label = mixed
```

## Timeline Tests

### TC-022: Timeline Has 30 Days

Steps:

1. Search a stock.

Expected result:

- Timeline contains one entry for each day in the 30-day window.

### TC-023: Days Without News Have Null Sentiment

Steps:

1. Search a stock with sparse news.

Expected result:

- Days without articles have `sentiment = null`.
- Chart does not treat missing news as neutral sentiment.

### TC-024: Days Without Market Price Do Not Break Chart

Steps:

1. View a 30-day chart that includes weekends.

Expected result:

- Weekend price values may be `null`.
- Chart remains usable.
- Sentiment can still appear on weekend news days.

## Cache Refresh Tests

### TC-025: Refresh Cache Button Forces Refresh

Steps:

1. Search `AAPL`.
2. Click `Refresh cache`.

Expected result:

- App calls `/api/stocks/AAPL?refresh=true`.
- Price and news refresh are attempted.
- UI remains responsive.

### TC-026: Refresh Cache Reuses Sentiment Where Possible

Steps:

1. Search a stock.
2. Click `Refresh cache`.

Expected result:

- Existing article sentiment rows are reused.
- Newly fetched articles are scored.

## API Route Tests

### TC-027: Dashboard API Returns Success

Request:

```text
GET /api/stocks/AAPL
```

Expected result:

- HTTP status `200`.
- JSON contains `stock`, `summary`, `timeline`, `articles`, and `cache`.

### TC-028: Dashboard API Supports Refresh

Request:

```text
GET /api/stocks/AAPL?refresh=true
```

Expected result:

- HTTP status `200`.
- Provider refresh is attempted.
- Response includes cache status.

### TC-029: Dashboard API Returns 404 For Unknown Stock

Request:

```text
GET /api/stocks/zzzznotastock123
```

Expected result:

- HTTP status `404`.
- JSON contains a clear error message.

## UI Tests

### TC-030: Initial Empty Dashboard State

Steps:

1. Open the app before searching.

Expected result:

- App shows initial search prompt.
- No chart is displayed yet.

### TC-031: Loaded Dashboard State

Steps:

1. Search `AAPL`.

Expected result:

- Summary cards are visible.
- Chart is visible.
- Article list is visible.
- Refresh cache button is visible.

### TC-032: Error State

Steps:

1. Search an invalid stock.

Expected result:

- Error banner appears.
- App does not show broken layout.

### TC-033: Mobile Layout

Steps:

1. Open app in a narrow viewport.
2. Search a stock.

Expected result:

- Search, summary, chart, and article list remain readable.
- Text does not overlap.

## Build and Regression Tests

### TC-034: Production Build Passes

Command:

```powershell
npx.cmd next build
```

Expected result:

- Build completes successfully.
- TypeScript and lint checks pass.

### TC-035: Dev Server Starts

Command:

```powershell
npm.cmd run dev -- -p 3001
```

Expected result:

- Dev server starts.
- App is available at:

```text
http://localhost:3001
```

## Recommended Automated Test Roadmap

Phase 1:

- unit tests for `scoreArticle`
- unit tests for `isRelevantCompanyNews`
- unit tests for `resolveStockQuery` with mocked Finnhub search
- unit tests for overall sentiment formulas

Phase 2:

- API tests for `/api/stocks/[ticker]` with mocked provider clients
- database cache tests using a temporary SQLite database

Phase 3:

- Playwright tests for search, no-stock-found, dashboard load, and refresh button
