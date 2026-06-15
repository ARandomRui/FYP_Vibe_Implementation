

# Comprehensive Testing Suite Setup

This plan outlines the steps to introduce a full testing suite for the Stock Sentiment Visualizer, covering both frontend components and backend API routes.

## User Review Required

> [!IMPORTANT]
> **Testing Framework Selection**: I propose using **Jest** coupled with **React Testing Library**. This is the industry standard for React/Next.js applications and provides an excellent virtual DOM environment (JSDOM) for testing UI components. Is this stack acceptable to you?

## Open Questions

1. **E2E Testing**: This plan focuses on Unit and Integration tests. Do you also want End-to-End (E2E) tests configured (e.g., using Playwright or Cypress) to run against a fully built version of the site in a real browser?
2. **Coverage Thresholds**: Do you have a specific test coverage percentage you'd like to enforce (e.g., 80% line coverage)?

## Proposed Changes

### Configuration and Setup
- **Dependencies**: Install `jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event`. *(Note: All dependencies will be verified via SecureCoder's `scan_dependencies` skill before installation).*
- **Jest Config**: Create `jest.config.ts` and `jest.setup.ts` to configure Next.js compatibility and global mocks (like `ResizeObserver` for Recharts).
- **Scripts**: Update `package.json` to include `"test"` and `"test:coverage"` scripts.

### Backend API Tests (`__tests__/api/`)
- **Stock Route (`route.ts`)**:
  - Mock `yahoo-finance2`.
  - Test case: Successful stock data retrieval with valid ticker.
  - Test case: Missing ticker validation.
  - Test case: Invalid ticker format validation.
  - Test case: API failure handling (e.g., 500 error propagation).
- **News Route (`route.ts`)**:
  - Mock global `fetch` (Finnhub API) and `vader-sentiment`.
  - Test case: Missing `FINNHUB_API_KEY` handling.
  - Test case: Chunked request merging logic (simulating 4 valid responses).
  - Test case: Deduplication logic (simulating overlapping news IDs).
  - Test case: Empty results handling.

### Frontend Component Tests (`__tests__/components/`)
- **Dashboard Component (`Dashboard.tsx`)**:
  - Mock the `/api/stock` and `/api/news` endpoints.
  - Test case: Initial render state (empty search bar, no charts).
  - Test case: User input interaction (typing a ticker).
  - Test case: Form submission triggers loading state.
  - Test case: Successful data fetch renders the chart and news feed correctly.
  - Test case: Network failure renders the error message UI.
  - Test case: Input validation (preventing invalid characters from triggering fetch).

## Verification Plan

### Automated Tests
- Run `npm test` to execute the full suite and verify all unit/integration tests pass.
- Run `npm run test:coverage` to generate and review the code coverage report.

### Manual Verification
- After tests are added, perform a manual regression test in the browser to ensure the testing utilities did not interfere with the dev environment build process.
