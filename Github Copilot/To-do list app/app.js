const STORAGE_KEY = "todo_items_v1";
const COMPLETE_FADE_MS = 240;

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");

let tasks = loadTasks();

renderTasks();

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text) {
    return;
  }

  const task = {
    id: crypto.randomUUID(),
    text,
    completed: false,
  };

  tasks.unshift(task);
  saveTasks();
  renderTasks();

  taskInput.value = "";
  taskInput.focus();
});

taskList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const listItem = target.closest(".task-item");
  if (!listItem) {
    return;
  }

  const taskId = listItem.dataset.id;
  if (!taskId) {
    return;
  }

  if (target.matches(".delete-btn")) {
    tasks = tasks.filter((task) => task.id !== taskId);
    saveTasks();
    renderTasks();
  }
});

taskList.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (!target.matches(".task-toggle")) {
    return;
  }

  const listItem = target.closest(".task-item");
  const taskId = listItem?.dataset.id;
  if (!taskId) {
    return;
  }

  if (!target.checked) {
    return;
  }

  if (listItem.classList.contains("is-removing")) {
    return;
  }

  listItem.classList.add("is-removing");
  target.disabled = true;

  const deleteButton = listItem.querySelector(".delete-btn");
  if (deleteButton instanceof HTMLButtonElement) {
    deleteButton.disabled = true;
  }

  setTimeout(() => {
    tasks = tasks.filter((task) => task.id !== taskId);
    saveTasks();
    renderTasks();
  }, COMPLETE_FADE_MS);
});

function renderTasks() {
  taskList.innerHTML = "";

  for (const task of tasks) {
    const item = document.createElement("li");
    item.className = "task-item";
    item.dataset.id = task.id;

    item.innerHTML = `
      <input
        type="checkbox"
        class="task-toggle"
        aria-label="Mark task complete"
      />
      <span class="task-text"></span>
      <button type="button" class="delete-btn" aria-label="Delete task">Delete</button>
    `;

    const textNode = item.querySelector(".task-text");
    if (textNode) {
      textNode.textContent = task.text;
    }

    taskList.appendChild(item);
  }

  const hasTasks = tasks.length > 0;
  emptyState.style.display = hasTasks ? "none" : "block";
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isValidTask)
      .filter((task) => !task.completed)
      .map((task) => ({
        id: task.id,
        text: task.text,
        completed: false,
      }));
  } catch {
    return [];
  }
}

function isValidTask(task) {
  return (
    task &&
    typeof task.id === "string" &&
    typeof task.text === "string" &&
    typeof task.completed === "boolean"
  );
}
