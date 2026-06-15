const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const emptyState = document.getElementById("empty-state");
const {
  loadItems,
  saveItems,
  addItem,
  toggleItem,
  deleteItem,
} = window.TodoCore;

let items = loadItems(localStorage);

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
      items = toggleItem(items, item.id, checkbox.checked);
      saveItems(localStorage, items);
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
      items = deleteItem(items, item.id);
      saveItems(localStorage, items);
      render();
    });

    li.appendChild(label);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextItems = addItem(items, input.value, () => crypto.randomUUID());
  if (nextItems === items) return;

  items = nextItems;
  saveItems(localStorage, items);
  render();
  input.value = "";
  input.focus();
});

render();
