import { test, expect } from '@playwright/test';

test.describe('Stock Sentiment Dashboard E2E Tests', () => {
  
  test('should load the dashboard and show initial state', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Stock Sentiment Visualizer/i })).toBeVisible();
    await expect(page.getByPlaceholder('Enter stock ticker')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analyze' })).toBeVisible();
    
    // Ensure charts and news aren't visible yet
    await expect(page.getByText('Price vs. Sentiment Correlation')).not.toBeVisible();
    await expect(page.getByText('Recent News Analysis')).not.toBeVisible();
  });

  test('should show error for invalid ticker format', async ({ page }) => {
    await page.goto('/');
    
    const input = page.getByPlaceholder('Enter stock ticker');
    await input.fill('INV@LID!');
    await input.press('Enter');
    
    // Should display validation error
    await expect(page.getByText('Invalid characters in symbol. Only alphanumeric, dots, and dashes are allowed.')).toBeVisible();
    // Should not attempt to fetch data
    await expect(page.getByText('Price vs. Sentiment Correlation')).not.toBeVisible();
  });

  test('should handle API fetch failure gracefully', async ({ page }) => {
    // Mock the backend API to return a 500 error
    await page.route('**/api/stock*', async route => {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Failed to fetch data' }) });
    });
    await page.route('**/api/news*', async route => {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Failed to fetch news' }) });
    });

    await page.goto('/');
    
    const input = page.getByPlaceholder('Enter stock ticker');
    await input.fill('FAILING');
    
    await page.getByRole('button', { name: 'Analyze' }).click();
    
    // Expect error message to appear
    await expect(page.getByText(/Failed to fetch data/i)).toBeVisible();
  });

  test('should display chart and news on successful fetch', async ({ page }) => {
    // Mock successful stock response
    await page.route('**/api/stock*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { date: new Date().toISOString(), close: 150.00 }
        ])
      });
    });

    // Mock successful news response
    await page.route('**/api/news*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            link: 'https://example.com/news1',
            publisher: 'MockNews',
            title: 'Mock Stock is doing great!',
            summary: 'A very positive summary about the mock stock.',
            providerPublishTime: new Date().toISOString(),
            sentimentScore: 0.8,
            sentimentDetails: { compound: 0.8, pos: 1, neg: 0, neu: 0 }
          },
          {
            link: 'https://example.com/news2',
            publisher: 'MockNews',
            title: 'Mock Stock faces challenges',
            summary: 'A negative summary.',
            providerPublishTime: new Date().toISOString(),
            sentimentScore: -0.5,
            sentimentDetails: { compound: -0.5, pos: 0, neg: 1, neu: 0 }
          }
        ])
      });
    });

    await page.goto('/');
    
    const input = page.getByPlaceholder('Enter stock ticker');
    await input.fill('MOCK');
    
    await page.getByRole('button', { name: 'Analyze' }).click();
    
    // Wait for the chart header
    await expect(page.getByText('Price vs. Sentiment Correlation (30 Days)')).toBeVisible();
    
    // Verify News Feed
    await expect(page.getByText('Recent News Analysis')).toBeVisible();
    await expect(page.getByText('Mock Stock is doing great!')).toBeVisible();
    await expect(page.getByText('Mock Stock faces challenges')).toBeVisible();
  });

  test('should handle empty news results correctly', async ({ page }) => {
    // Mock successful stock response
    await page.route('**/api/stock*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { date: new Date().toISOString(), close: 150.00 }
        ])
      });
    });

    // Mock EMPTY news response
    await page.route('**/api/news*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/');
    
    const input = page.getByPlaceholder('Enter stock ticker');
    await input.fill('EMPTY');
    
    await page.getByRole('button', { name: 'Analyze' }).click();
    
    await expect(page.getByText('Price vs. Sentiment Correlation (30 Days)')).toBeVisible();
    
    // Check for the "no news" message
    await expect(page.getByText(/No recent news found for this ticker/i)).toBeVisible();
  });

});
