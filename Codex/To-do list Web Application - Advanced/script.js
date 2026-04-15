const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const errorMsg = document.getElementById("errorMsg");

const STORAGE_KEY = "todo.tasks.v1";

const loadTasks = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveTasks = (tasks) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

let tasks = loadTasks();

const clearError = () => {
  errorMsg.textContent = "";
};

const showError = (message) => {
  errorMsg.textContent = message;
};

const createTaskElement = (task, index) => {
  const li = document.createElement("li");
  li.className = `task${task.completed ? " completed" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task__checkbox";
  checkbox.checked = task.completed;
  checkbox.addEventListener("change", () => {
    tasks[index].completed = checkbox.checked;
    renderTasks();
    saveTasks(tasks);
  });

  const text = document.createElement("span");
  text.className = "task__text";
  text.textContent = task.text;

  const delBtn = document.createElement("button");
  delBtn.className = "task__delete";
  delBtn.type = "button";
  delBtn.setAttribute("aria-label", "Delete task");
  delBtn.textContent = "🗑";
  delBtn.addEventListener("click", () => {
    tasks.splice(index, 1);
    renderTasks();
    saveTasks(tasks);
  });

  li.appendChild(checkbox);
  li.appendChild(text);
  li.appendChild(delBtn);
  return li;
};

const renderTasks = () => {
  taskList.innerHTML = "";
  tasks.forEach((task, index) => {
    taskList.appendChild(createTaskElement(task, index));
  });
};

const addTask = () => {
  const value = taskInput.value.trim();
  if (!value) {
    showError("Please enter the task");
    return;
  }
  clearError();
  tasks.push({ text: value, completed: false });
  taskInput.value = "";
  renderTasks();
  saveTasks(tasks);
};

addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTask();
  }
});
taskInput.addEventListener("input", clearError);

renderTasks();
