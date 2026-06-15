(function (global) {
  const storageKey = "minimal-todo-items";

  const parseItems = (raw) => {
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const loadItems = (storage) => parseItems(storage.getItem(storageKey));

  const saveItems = (storage, items) => {
    storage.setItem(storageKey, JSON.stringify(items));
  };

  const createItem = (text, idFactory) => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    return {
      id: idFactory(),
      text: trimmed,
      completed: false,
    };
  };

  const addItem = (items, text, idFactory) => {
    const newItem = createItem(text, idFactory);
    return newItem ? [newItem, ...items] : items;
  };

  const toggleItem = (items, id, completed) =>
    items.map((item) =>
      item.id === id ? { ...item, completed } : item
    );

  const deleteItem = (items, id) =>
    items.filter((item) => item.id !== id);

  const api = {
    storageKey,
    parseItems,
    loadItems,
    saveItems,
    createItem,
    addItem,
    toggleItem,
    deleteItem,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.TodoCore = api;
})(typeof window !== "undefined" ? window : globalThis);
