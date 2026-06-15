const test = require("node:test");
const assert = require("node:assert/strict");

const {
  storageKey,
  parseItems,
  loadItems,
  saveItems,
  createItem,
  addItem,
  toggleItem,
  deleteItem,
} = require("../todo-core.js");

const createStorage = (seed = {}) => {
  const data = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
};

test("parseItems returns an empty list for missing data", () => {
  assert.deepEqual(parseItems(null), []);
});

test("parseItems returns an empty list for invalid JSON", () => {
  assert.deepEqual(parseItems("{bad json"), []);
});

test("parseItems returns an empty list for valid non-array JSON", () => {
  assert.deepEqual(parseItems(JSON.stringify({ text: "not-an-array" })), []);
});

test("loadItems returns parsed items from storage", () => {
  const expected = [{ id: "1", text: "Write tests", completed: false }];
  const storage = createStorage({
    [storageKey]: JSON.stringify(expected),
  });

  assert.deepEqual(loadItems(storage), expected);
});

test("saveItems writes items to storage", () => {
  const storage = createStorage();
  const items = [{ id: "1", text: "Ship feature", completed: true }];

  saveItems(storage, items);

  assert.equal(storage.getItem(storageKey), JSON.stringify(items));
});

test("createItem trims task text and marks it incomplete", () => {
  const item = createItem("  Buy milk  ", () => "abc123");

  assert.deepEqual(item, {
    id: "abc123",
    text: "Buy milk",
    completed: false,
  });
});

test("createItem preserves special characters as text", () => {
  const item = createItem("  <milk> & \"bread\"  ", () => "chars");

  assert.deepEqual(item, {
    id: "chars",
    text: "<milk> & \"bread\"",
    completed: false,
  });
});

test("createItem rejects blank task text", () => {
  assert.equal(createItem("   ", () => "ignored"), null);
});

test("addItem prepends a new task", () => {
  const items = [{ id: "older", text: "Older task", completed: false }];

  const nextItems = addItem(items, "New task", () => "new");

  assert.deepEqual(nextItems, [
    { id: "new", text: "New task", completed: false },
    { id: "older", text: "Older task", completed: false },
  ]);
});

test("addItem allows duplicate task names as separate items", () => {
  const items = [{ id: "1", text: "Repeat", completed: false }];

  const nextItems = addItem(items, "Repeat", () => "2");

  assert.deepEqual(nextItems, [
    { id: "2", text: "Repeat", completed: false },
    { id: "1", text: "Repeat", completed: false },
  ]);
});

test("addItem leaves the list unchanged for blank input", () => {
  const items = [{ id: "1", text: "Keep me", completed: false }];

  assert.equal(addItem(items, "   ", () => "unused"), items);
});

test("toggleItem updates only the matching task", () => {
  const items = [
    { id: "1", text: "One", completed: false },
    { id: "2", text: "Two", completed: false },
  ];

  assert.deepEqual(toggleItem(items, "2", true), [
    { id: "1", text: "One", completed: false },
    { id: "2", text: "Two", completed: true },
  ]);
});

test("toggleItem leaves tasks unchanged when the id is missing", () => {
  const items = [
    { id: "1", text: "One", completed: false },
    { id: "2", text: "Two", completed: true },
  ];

  assert.deepEqual(toggleItem(items, "missing", false), items);
});

test("deleteItem removes only the matching task", () => {
  const items = [
    { id: "1", text: "One", completed: false },
    { id: "2", text: "Two", completed: true },
  ];

  assert.deepEqual(deleteItem(items, "1"), [
    { id: "2", text: "Two", completed: true },
  ]);
});

test("deleteItem leaves the list unchanged when the id is missing", () => {
  const items = [
    { id: "1", text: "One", completed: false },
    { id: "2", text: "Two", completed: true },
  ];

  assert.deepEqual(deleteItem(items, "missing"), items);
});
