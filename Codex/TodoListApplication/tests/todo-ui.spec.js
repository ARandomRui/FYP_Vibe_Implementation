const { test, expect } = require("@playwright/test");

const storageKey = "minimal-todo-items";

const seedApp = async (page, storedValue = null) => {
  await page.goto("/");
  await page.evaluate(({ key, value }) => {
    localStorage.clear();
    if (value !== null) {
      localStorage.setItem(key, value);
    }
  }, { key: storageKey, value: storedValue });
  await page.reload();
};

const addTask = async (page, text) => {
  await page.getByLabel("Add a task").fill(text);
  await page.getByRole("button", { name: "Add" }).click();
};

test("shows the empty state and blocks blank task submissions", async ({ page }) => {
  await seedApp(page);

  const emptyState = page.locator("#empty-state");
  const listItems = page.locator("#todo-list .item");

  await expect(emptyState).toBeVisible();
  await addTask(page, "   ");
  await expect(listItems).toHaveCount(0);
  await expect(emptyState).toBeVisible();

  const storedValue = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expect(storedValue).toBeNull();
});

test("adds trimmed tasks in newest-first order and persists them after reload", async ({ page }) => {
  await seedApp(page);

  await addTask(page, "  Buy groceries  ");
  await addTask(page, "Read book");

  const taskTexts = page.locator("#todo-list .text");
  await expect(taskTexts).toHaveText(["Read book", "Buy groceries"]);
  await expect(page.locator("#empty-state")).toBeHidden();

  await page.reload();
  await expect(taskTexts).toHaveText(["Read book", "Buy groceries"]);

  const storedItems = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(storedItems.map((item) => item.text)).toEqual(["Read book", "Buy groceries"]);
});

test("keeps the input cleared and focused after adding a task", async ({ page }) => {
  await seedApp(page);

  const input = page.getByLabel("Add a task");
  await input.fill("Refocus test");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
});

test("enforces the input maxlength when adding a long task", async ({ page }) => {
  await seedApp(page);

  const longText = "a".repeat(140);
  const input = page.getByLabel("Add a task");
  await input.fill(longText);

  await expect(input).toHaveValue("a".repeat(120));
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator("#todo-list .text")).toHaveText(["a".repeat(120)]);

  const storedItems = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(storedItems[0].text).toHaveLength(120);
});

test("allows duplicate task names and keeps them as separate entries", async ({ page }) => {
  await seedApp(page);

  await addTask(page, "Repeat me");
  await addTask(page, "Repeat me");

  await expect(page.locator("#todo-list .item")).toHaveCount(2);
  await expect(page.locator("#todo-list .text")).toHaveText(["Repeat me", "Repeat me"]);

  const storedItems = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(storedItems).toHaveLength(2);
  expect(new Set(storedItems.map((item) => item.id)).size).toBe(2);
});

test("renders special characters as plain task text and persists them", async ({ page }) => {
  await seedApp(page);

  const specialText = '<milk> & "bread"';
  await addTask(page, specialText);

  await expect(page.locator("#todo-list .text")).toHaveText([specialText]);

  const storedItems = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(storedItems[0].text).toBe(specialText);
});

test("marks tasks complete and keeps the completed state after reload", async ({ page }) => {
  await seedApp(page);

  await addTask(page, "Finish report");

  const firstItem = page.locator("#todo-list .item").first();
  const checkbox = firstItem.getByRole("checkbox");

  await checkbox.check();
  await expect(firstItem).toHaveClass(/completed/);
  await expect(checkbox).toBeChecked();

  await page.reload();
  await expect(firstItem).toHaveClass(/completed/);
  await expect(firstItem.getByRole("checkbox")).toBeChecked();
});

test("can toggle a task on and back off without corrupting stored state", async ({ page }) => {
  await seedApp(page);

  await addTask(page, "Toggle twice");

  const firstItem = page.locator("#todo-list .item").first();
  const checkbox = firstItem.getByRole("checkbox");

  await checkbox.check();
  await checkbox.uncheck();

  await expect(firstItem).not.toHaveClass(/completed/);
  await expect(checkbox).not.toBeChecked();

  const storedItems = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(storedItems[0].completed).toBe(false);
});

test("deletes only the selected task and restores the empty state when all tasks are removed", async ({ page }) => {
  await seedApp(page);

  await addTask(page, "Task one");
  await addTask(page, "Task two");

  await page.locator("#todo-list .item").nth(1).getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("#todo-list .text")).toHaveText(["Task two"]);

  let storedItems = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(storedItems.map((item) => item.text)).toEqual(["Task two"]);

  await page.locator("#todo-list .item").first().getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("#todo-list .item")).toHaveCount(0);
  await expect(page.locator("#empty-state")).toBeVisible();

  storedItems = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(storedItems).toEqual([]);
});

test("keeps newest-first ordering when several tasks are added quickly", async ({ page }) => {
  await seedApp(page);

  for (const label of ["One", "Two", "Three", "Four", "Five"]) {
    await addTask(page, label);
  }

  await expect(page.locator("#todo-list .text")).toHaveText(["Five", "Four", "Three", "Two", "One"]);
});

test("loads pre-seeded tasks from localStorage into the UI", async ({ page }) => {
  const seededItems = JSON.stringify([
    { id: "1", text: "Seeded complete", completed: true },
    { id: "2", text: "Seeded active", completed: false },
  ]);

  await seedApp(page, seededItems);

  const items = page.locator("#todo-list .item");
  await expect(page.locator("#todo-list .text")).toHaveText(["Seeded complete", "Seeded active"]);
  await expect(items.first()).toHaveClass(/completed/);
  await expect(items.nth(1)).not.toHaveClass(/completed/);
});

test("falls back to an empty list when localStorage contains invalid JSON", async ({ page }) => {
  await seedApp(page, "{broken json");

  await expect(page.locator("#todo-list .item")).toHaveCount(0);
  await expect(page.locator("#empty-state")).toBeVisible();
});

test("falls back to an empty list when localStorage contains valid non-array JSON", async ({ page }) => {
  await seedApp(page, JSON.stringify({ text: "not-an-array" }));

  await expect(page.locator("#todo-list .item")).toHaveCount(0);
  await expect(page.locator("#empty-state")).toBeVisible();
});
