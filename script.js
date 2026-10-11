const todoForm = document.querySelector("#todo-form");
const todoInput = document.querySelector("#todo-input");
const todoList = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyDescription = document.querySelector("#empty-description");
const filterBar = document.querySelector(".filters");
const clearCompletedButton = document.querySelector("#clear-completed");
const toast = document.querySelector("#toast");

const totalCount = document.querySelector("#total-count");
const activeCount = document.querySelector("#active-count");
const completedCount = document.querySelector("#completed-count");
const remainingCount = document.querySelector("#remaining-count");
const progressLabel = document.querySelector("#progress-label");

const STORAGE_KEY = "taskly-todos";
let todos = loadTodos();
let currentFilter = "all";
let toastTimer;

// Read saved state safely.
function loadTodos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.text === "string" &&
      typeof task.completed === "boolean"
    );
  } catch (error) {
    console.error("Unable to load tasks:", error);
    return [];
  }
}

// Persist state after every change.
function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    return true;
  } catch (error) {
    console.error("Unable to save tasks:", error);
    showToast("Couldn't save changes. Check browser storage.");
    return false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

// CREATE
function addTodo(text) {
  todos.unshift({
    id: createId(),
    text,
    completed: false,
    createdAt: Date.now()
  });
  saveTodos();
  renderTodos();
  showToast("Task added successfully");
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// UPDATE: edit task text
function editTodo(id) {
  const task = todos.find(item => item.id === id);
  if (!task) return;

  const updated = prompt("Edit your task:", task.text);
  if (updated === null) return;

  const text = updated.trim();
  if (!text) {
    showToast("Task cannot be empty");
    return;
  }

  task.text = text.slice(0, 200);
  saveTodos();
  renderTodos();
  showToast("Task updated");
}

// UPDATE: completion status
function toggleTodo(id) {
  const task = todos.find(item => item.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTodos();
  renderTodos();
  showToast(task.completed ? "Task completed ✓" : "Task marked active");
}

// DELETE
function deleteTodo(id) {
  const task = todos.find(item => item.id === id);
  if (!task) return;

  todos = todos.filter(item => item.id !== id);
  saveTodos();
  renderTodos();
  showToast("Task deleted");
}

function getVisibleTodos() {
  if (currentFilter === "active") return todos.filter(task => !task.completed);
  if (currentFilter === "completed") return todos.filter(task => task.completed);
  return todos;
}

// READ: Build the list using DOM methods (no unsafe HTML injection).
function renderTodos() {
  todoList.replaceChildren();

  const visibleTodos = getVisibleTodos();

  visibleTodos.forEach(task => {
    const item = document.createElement("li");
    item.className = `todo-item${task.completed ? " completed" : ""}`;
    item.dataset.id = task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";
    checkbox.setAttribute("aria-label", `Mark "${task.text}" as ${task.completed ? "active" : "completed"}`);

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = task.text;

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "action-btn edit-btn";
    editButton.dataset.action = "edit";
    editButton.textContent = "✎";
    editButton.title = "Edit task";
    editButton.setAttribute("aria-label", `Edit "${task.text}"`);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "action-btn delete-btn";
    deleteButton.dataset.action = "delete";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete task";
    deleteButton.setAttribute("aria-label", `Delete "${task.text}"`);

    actions.append(editButton, deleteButton);
    item.append(checkbox, text, actions);
    todoList.append(item);
  });

  emptyState.hidden = visibleTodos.length !== 0;
  if (visibleTodos.length === 0) {
    if (todos.length === 0) {
      emptyTitle.textContent = "A fresh start";
      emptyDescription.textContent = "Add your first task above and make it happen.";
    } else if (currentFilter === "active") {
      emptyTitle.textContent = "All caught up!";
      emptyDescription.textContent = "You don't have any active tasks.";
    } else if (currentFilter === "completed") {
      emptyTitle.textContent = "Nothing completed yet";
      emptyDescription.textContent = "Finish a task and it will show up here.";
    }
  }

  updateStats();
}

function updateStats() {
  const completed = todos.filter(task => task.completed).length;
  const active = todos.length - completed;

  totalCount.textContent = todos.length;
  activeCount.textContent = active;
  completedCount.textContent = completed;
  remainingCount.textContent = `${active} task${active === 1 ? "" : "s"} left`;
  progressLabel.textContent = todos.length === 0
    ? "Let's get started"
    : completed === todos.length
      ? "Everything complete 🎉"
      : `${Math.round((completed / todos.length) * 100)}% complete`;

  clearCompletedButton.disabled = completed === 0;
}

// CREATE: Add a task from the form.
todoForm.addEventListener("submit", event => {
  event.preventDefault();
  const text = todoInput.value.trim();
  if (!text) {
    showToast("Please enter a task first");
    todoInput.focus();
    return;
  }

  addTodo(text.slice(0, 200));
  todoInput.value = "";
  todoInput.focus();
});

// Event delegation: one listener handles all dynamic task controls.
todoList.addEventListener("click", event => {
  const control = event.target.closest("[data-action]");
  if (!control || !todoList.contains(control)) return;

  const item = control.closest(".todo-item");
  if (!item) return;

  const { id } = item.dataset;
  const { action } = control.dataset;

  if (action === "toggle") toggleTodo(id);
  if (action === "edit") editTodo(id);
  if (action === "delete") deleteTodo(id);
});

// FILTER
filterBar.addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  currentFilter = button.dataset.filter;
  filterBar.querySelectorAll("[data-filter]").forEach(filterButton => {
    const selected = filterButton === button;
    filterButton.classList.toggle("active", selected);
    filterButton.setAttribute("aria-pressed", String(selected));
  });

  renderTodos();
});

// Delete all completed tasks.
clearCompletedButton.addEventListener("click", () => {
  const completedCount = todos.filter(task => task.completed).length;
  if (!completedCount) return;

  todos = todos.filter(task => !task.completed);
  saveTodos();
  renderTodos();
  showToast(`${completedCount} completed task${completedCount === 1 ? "" : "s"} cleared`);
});

// Initial page render.
renderTodos();
