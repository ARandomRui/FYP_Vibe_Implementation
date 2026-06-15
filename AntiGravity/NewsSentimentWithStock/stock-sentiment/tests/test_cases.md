# E2E Test Cases for Stock Sentiment Dashboard

This document outlines all the End-to-End (E2E) test cases implemented in `dashboard.spec.ts` using Playwright. These tests are designed to mock the backend API, ensuring they execute quickly, deterministically, and without hitting third-party API rate limits (like Finnhub or Yahoo Finance).

## 1. Initial State Load
**Test Name:** `should load the dashboard and show initial state`
- **Objective:** Verify that the dashboard loads correctly before the user performs any actions.
- **Expected Outcome:**
  - The main heading "Stock Sentiment Visualizer" is visible.
  - The stock ticker search input field is visible and empty.
  - The "Analyze" button is visible and active.
  - The chart area and the news feed sections are **not** visible.

## 2. Form Validation (Invalid Characters)
**Test Name:** `should show error for invalid ticker format`
- **Objective:** Verify the client-side input sanitization explicitly blocks invalid characters.
- **Input:** `INV@LID!` (or similar string with special characters).
- **Action:** User presses Enter or clicks Analyze.
- **Expected Outcome:**
  - The input is sanitized and the frontend validation throws an error.
  - An error message appears stating: "Invalid characters in symbol. Only alphanumeric, dots, and dashes are allowed."
  - No API requests are made.
  - The chart and news sections remain hidden.

## 3. Graceful Error Handling (API Fetch Failure)
**Test Name:** `should handle API fetch failure gracefully`
- **Objective:** Ensure the frontend handles 500 Internal Server Error responses without crashing.
- **Mock:** Intercept `**/api/stock*` and `**/api/news*` to return a `500` status code.
- **Input:** `FAILING`
- **Action:** User clicks Analyze.
- **Expected Outcome:**
  - The UI gracefully handles the error.
  - An error message appears on screen: "Failed to fetch data".
  - The application does not crash.

## 4. Successful Data Fetch and Render
**Test Name:** `should display chart and news on successful fetch`
- **Objective:** Validate the core functionality of the dashboard: rendering both the composed stock chart and the news cards when valid data is retrieved.
- **Mock:** Intercept `**/api/stock*` to return a mocked stock array, and `**/api/news*` to return a mocked array of news articles with positive and negative sentiment scores.
- **Input:** `MOCK`
- **Action:** User clicks Analyze.
- **Expected Outcome:**
  - The "Price vs. Sentiment Correlation (30 Days)" chart becomes visible.
  - The "Recent News Analysis" section becomes visible.
  - The specific mock news headlines ("Mock Stock is doing great!" and "Mock Stock faces challenges") appear inside the UI cards.

## 5. Empty Data State (No News)
**Test Name:** `should handle empty news results correctly`
- **Objective:** Verify the application handles the edge case where a stock exists but has absolutely no recent news.
- **Mock:** Intercept `**/api/stock*` to return valid stock data, but intercept `**/api/news*` to return an empty array `[]`.
- **Input:** `EMPTY`
- **Action:** User clicks Analyze.
- **Expected Outcome:**
  - The "Price vs. Sentiment Correlation (30 Days)" chart becomes visible (with only the price line rendered).
  - The "Recent News Analysis" section becomes visible.
  - Instead of breaking or showing empty cards, a fallback message appears: "No recent news found for this ticker."
