const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const emptyState = document.getElementById("empty-state");

const storageKey = "minimal-todo-items";

const loadItems = () => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const saveItems = (items) => {
  localStorage.setItem(storageKey, JSON.stringify(items));
};

let items = loadItems();

const render = () => {
  list.innerHTML = "";
  emptyState.hidden = items.length > 0;

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item" + (item.completed ? " completed" : "");

    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.completed;
    checkbox.addEventListener("change", () => {
      item.completed = checkbox.checked;
      saveItems(items);
      render();
    });

    const text = document.createElement("span");
    text.className = "text";
    text.textContent = item.text;

    label.appendChild(checkbox);
    label.appendChild(text);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      items = items.filter((entry) => entry.id !== item.id);
      saveItems(items);
      render();
    });

    li.appendChild(label);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
};

const addItem = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return;

  const newItem = {
    id: crypto.randomUUID(),
    text: trimmed,
    completed: false,
  };

  items.unshift(newItem);
  saveItems(items);
  render();
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addItem(input.value);
  input.value = "";
  input.focus();
});

render();
