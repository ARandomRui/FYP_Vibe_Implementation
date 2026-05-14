import { test, expect } from '@playwright/test';

test.describe('To-Do List Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local server
    await page.goto('/');
    // Clear localStorage before each test to ensure isolation
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
  });

  test('FT-01: Add a standard task', async ({ page }) => {
    await page.fill('#task-input', 'Buy milk');
    await page.click('button[aria-label="Add Task"]');
    
    const taskText = page.locator('.task-text').first();
    await expect(taskText).toHaveText('Buy milk');
    
    // Check if input is cleared
    await expect(page.locator('#task-input')).toHaveValue('');
  });

  test('FT-02: Add task via Enter key', async ({ page }) => {
    await page.fill('#task-input', 'Read book');
    await page.press('#task-input', 'Enter');
    
    await expect(page.locator('.task-text').first()).toHaveText('Read book');
  });

  test('FT-03 & FT-04: Mark task as completed and unmark', async ({ page }) => {
    await page.fill('#task-input', 'Buy milk');
    await page.press('#task-input', 'Enter');
    
    const checkbox = page.locator('.task-checkbox').first();
    const taskItem = page.locator('.task-item').first();
    
    // Check
    await checkbox.check();
    await expect(taskItem).toHaveClass(/completed/);
    
    // Uncheck
    await checkbox.uncheck();
    await expect(taskItem).not.toHaveClass(/completed/);
  });

  test('FT-05: Delete a task', async ({ page }) => {
    await page.fill('#task-input', 'Delete me');
    await page.press('#task-input', 'Enter');
    
    const taskItem = page.locator('.task-item').first();
    await taskItem.hover();
    await page.click('.task-delete');
    
    await expect(page.locator('.task-item')).toHaveCount(0);
  });

  test('BC-01 & BC-02: Submit empty or whitespace task', async ({ page }) => {
    await page.click('button[aria-label="Add Task"]'); // Empty submit
    await expect(page.locator('#error-container')).toHaveText('Task cannot be empty!');
    
    await page.fill('#task-input', '   '); // Whitespace submit
    await page.press('#task-input', 'Enter');
    await expect(page.locator('#error-container')).toHaveText('Task cannot be empty!');
    
    await expect(page.locator('.task-item')).toHaveCount(0);
  });

  test('SEC-01 & SEC-02: XSS & HTML element Injection in task name', async ({ page }) => {
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('#task-input', xssPayload);
    await page.press('#task-input', 'Enter');
    
    // The text should exactly match the payload (sanitized textContent)
    await expect(page.locator('.task-text').first()).toHaveText(xssPayload);
    
    const htmlPayload = '<img src=x onerror=alert(1)>';
    await page.fill('#task-input', htmlPayload);
    await page.press('#task-input', 'Enter');
    
    await expect(page.locator('.task-text').first()).toHaveText(htmlPayload);
  });

  test('ST-01: Refresh retains tasks', async ({ page }) => {
    await page.fill('#task-input', 'Persistent Task');
    await page.press('#task-input', 'Enter');
    await page.locator('.task-checkbox').first().check();
    
    await page.reload();
    
    const taskItem = page.locator('.task-item').first();
    await expect(taskItem).toHaveClass(/completed/);
    await expect(page.locator('.task-text').first()).toHaveText('Persistent Task');
  });
});
