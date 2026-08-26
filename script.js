const STORAGE_KEY = "todo-lizard:v1";
const SETTINGS_KEY = "todo-lizard:settings:v1";
const MAX_IMPORT_BYTES = 1_000_000;
const MAX_TASKS = 5000;
const appRelease = "20260826-1743";

const taskForm = document.querySelector("#taskForm");
const taskTitle = document.querySelector("#taskTitle");
const taskDueDate = document.querySelector("#taskDueDate");
const taskPriority = document.querySelector("#taskPriority");
const taskList = document.querySelector("#taskList");
const taskTemplate = document.querySelector("#taskTemplate");
const emptyState = document.querySelector("#emptyState");
const taskSearch = document.querySelector("#taskSearch");
const taskSort = document.querySelector("#taskSort");
const status = document.querySelector("#status");
const stats = document.querySelector("#stats");
const allCount = document.querySelector("#allCount");
const activeCount = document.querySelector("#activeCount");
const completedCount = document.querySelector("#completedCount");
const exportButton = document.querySelector("#exportButton");
const importButton = document.querySelector("#importButton");
const importInput = document.querySelector("#importInput");
const clearCompletedButton = document.querySelector("#clearCompletedButton");
const releaseStamp = document.querySelector("#releaseStamp");

let tasks = loadTasks();
let settings = loadSettings();
let currentFilter = settings.filter;
let editingTaskId = null;

taskSearch.value = settings.search;
taskSort.value = settings.sort;
renderReleaseStamp();
render();

taskForm.addEventListener("submit", addTask);
taskList.addEventListener("change", handleTaskChange);
taskList.addEventListener("click", handleTaskClick);
taskList.addEventListener("submit", saveTaskEdit);
taskSearch.addEventListener("input", handleViewChange);
taskSort.addEventListener("change", handleViewChange);
document.querySelectorAll(".filter-tab").forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});
exportButton.addEventListener("click", exportTasks);
importButton.addEventListener("click", () => importInput.click());
importInput.addEventListener("change", importTasks);
clearCompletedButton.addEventListener("click", clearCompletedTasks);
window.addEventListener("storage", handleStorageChange);

function addTask(event) {
  event.preventDefault();
  const title = taskTitle.value.trim();
  if (!title) {
    setStatus("Enter a task first.", "error");
    taskTitle.focus();
    return;
  }

  tasks.unshift({
    id: createId(),
    title,
    dueDate: normalizeDate(taskDueDate.value),
    priority: normalizePriority(taskPriority.value),
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  });

  saveTasks();
  taskForm.reset();
  taskPriority.value = "normal";
  currentFilter = "all";
  saveSettings();
  setStatus("Task added and saved.", "valid");
  render();
  taskTitle.focus();
}

function handleTaskChange(event) {
  if (!event.target.classList.contains("task-check")) {
    return;
  }
  const item = event.target.closest(".task-item");
  const task = tasks.find((entry) => entry.id === item.dataset.taskId);
  if (!task) {
    return;
  }

  task.completed = event.target.checked;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  saveTasks();
  setStatus(task.completed ? "Task completed." : "Task reopened.", "valid");
  render();
}

function handleTaskClick(event) {
  const item = event.target.closest(".task-item");
  if (!item) {
    return;
  }
  if (event.target.closest(".delete-task")) {
    deleteTask(item.dataset.taskId);
    return;
  }
  if (event.target.closest(".task-title")) {
    editingTaskId = item.dataset.taskId;
    render();
    const input = taskList.querySelector(`[data-task-id="${editingTaskId}"] .edit-title`);
    input?.focus();
    input?.select();
    return;
  }
  if (event.target.closest(".cancel-edit")) {
    editingTaskId = null;
    render();
  }
}

function saveTaskEdit(event) {
  if (!event.target.classList.contains("edit-form")) {
    return;
  }
  event.preventDefault();
  const item = event.target.closest(".task-item");
  const task = tasks.find((entry) => entry.id === item.dataset.taskId);
  const title = event.target.querySelector(".edit-title").value.trim();
  if (!task || !title) {
    setStatus("Task title cannot be empty.", "error");
    return;
  }

  task.title = title;
  task.dueDate = normalizeDate(event.target.querySelector(".edit-due-date").value);
  task.priority = normalizePriority(event.target.querySelector(".edit-priority").value);
  editingTaskId = null;
  saveTasks();
  setStatus("Task updated.", "valid");
  render();
}

function deleteTask(id) {
  const task = tasks.find((entry) => entry.id === id);
  if (!task) {
    return;
  }
  tasks = tasks.filter((entry) => entry.id !== id);
  editingTaskId = null;
  saveTasks();
  setStatus(`Deleted "${truncate(task.title, 45)}".`, "valid");
  render();
}

function clearCompletedTasks() {
  const completed = tasks.filter((task) => task.completed).length;
  if (!completed) {
    setStatus("There are no completed tasks to clear.", "error");
    return;
  }
  if (!window.confirm(`Delete ${completed} completed ${completed === 1 ? "task" : "tasks"}?`)) {
    return;
  }
  tasks = tasks.filter((task) => !task.completed);
  editingTaskId = null;
  saveTasks();
  setStatus(`Cleared ${completed} completed ${completed === 1 ? "task" : "tasks"}.`, "valid");
  render();
}

function handleViewChange() {
  settings.search = taskSearch.value;
  settings.sort = taskSort.value;
  saveSettings();
  render();
}

function setFilter(filter) {
  currentFilter = ["all", "active", "completed"].includes(filter) ? filter : "all";
  settings.filter = currentFilter;
  saveSettings();
  render();
}

function render() {
  const visibleTasks = getVisibleTasks();
  taskList.replaceChildren();
  visibleTasks.forEach((task) => taskList.append(renderTask(task)));

  const active = tasks.filter((task) => !task.completed).length;
  const completed = tasks.length - active;
  allCount.textContent = tasks.length.toLocaleString();
  activeCount.textContent = active.toLocaleString();
  completedCount.textContent = completed.toLocaleString();
  stats.textContent = `${active.toLocaleString()} active / ${completed.toLocaleString()} completed`;
  exportButton.disabled = !tasks.length;
  clearCompletedButton.disabled = !completed;

  document.querySelectorAll(".filter-tab").forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  emptyState.classList.toggle("hidden", visibleTasks.length > 0);
  if (!visibleTasks.length) {
    const [heading, detail] = getEmptyMessage();
    emptyState.querySelector("strong").textContent = heading;
    emptyState.querySelector("span").textContent = detail;
  }
}

function renderTask(task) {
  const fragment = taskTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".task-item");
  const checkbox = fragment.querySelector(".task-check");
  const title = fragment.querySelector(".task-title");
  const meta = fragment.querySelector(".task-meta");
  const editForm = fragment.querySelector(".edit-form");

  item.dataset.taskId = task.id;
  item.classList.toggle("is-completed", task.completed);
  item.classList.toggle("is-overdue", isOverdue(task));
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `${task.completed ? "Reopen" : "Complete"} ${task.title}`);
  title.textContent = task.title;
  title.setAttribute("aria-label", `Edit ${task.title}`);
  meta.replaceChildren(...renderTaskMeta(task));

  if (task.id === editingTaskId) {
    title.classList.add("hidden");
    meta.classList.add("hidden");
    editForm.classList.remove("hidden");
    editForm.querySelector(".edit-title").value = task.title;
    editForm.querySelector(".edit-due-date").value = task.dueDate || "";
    editForm.querySelector(".edit-priority").value = task.priority;
  }
  return fragment;
}

function renderTaskMeta(task) {
  const nodes = [];
  const priority = document.createElement("span");
  priority.className = `priority priority-${task.priority}`;
  priority.textContent = `${capitalize(task.priority)} priority`;
  nodes.push(priority);

  if (task.dueDate) {
    const due = document.createElement("span");
    due.className = "due-date";
    due.textContent = `${isOverdue(task) ? "Overdue" : "Due"} ${formatDate(task.dueDate)}`;
    nodes.push(due);
  }
  return nodes;
}

function getVisibleTasks() {
  const query = taskSearch.value.trim().toLocaleLowerCase();
  return [...tasks]
    .filter((task) => currentFilter === "all" || (currentFilter === "completed") === task.completed)
    .filter((task) => !query || task.title.toLocaleLowerCase().includes(query))
    .sort(getTaskSorter(taskSort.value));
}

function getTaskSorter(sort) {
  const created = (task) => Date.parse(task.createdAt) || 0;
  const priorityRank = { high: 0, normal: 1, low: 2 };
  if (sort === "created-asc") return (a, b) => created(a) - created(b);
  if (sort === "due") return (a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") || created(b) - created(a);
  if (sort === "priority") return (a, b) => priorityRank[a.priority] - priorityRank[b.priority] || created(b) - created(a);
  if (sort === "alphabetical") return (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  return (a, b) => created(b) - created(a);
}

function exportTasks() {
  if (!tasks.length) {
    setStatus("There are no tasks to export.", "error");
    return;
  }
  const data = JSON.stringify({ app: "To Do Lizard", version: 1, exportedAt: new Date().toISOString(), tasks }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `todo-lizard-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Backup exported.", "valid");
}

async function importTasks() {
  const [file] = importInput.files;
  importInput.value = "";
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) {
    setStatus("Backup files over 1 MB are not supported.", "error");
    return;
  }
  try {
    const parsed = JSON.parse(await file.text());
    const imported = validateImportedTasks(parsed);
    if (!window.confirm(`Replace this browser's list with ${imported.length} imported ${imported.length === 1 ? "task" : "tasks"}?`)) {
      return;
    }
    tasks = imported;
    editingTaskId = null;
    saveTasks();
    setStatus(`Imported ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}.`, "valid");
    render();
  } catch (error) {
    setStatus(error.message || "Could not import that backup.", "error");
  }
}

function validateImportedTasks(value) {
  const imported = Array.isArray(value) ? value : value?.tasks;
  if (!Array.isArray(imported)) throw new Error("That file is not a To Do Lizard backup.");
  if (imported.length > MAX_TASKS) throw new Error(`Backups are limited to ${MAX_TASKS.toLocaleString()} tasks.`);
  return imported.map(normalizeTask).filter(Boolean);
}

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.slice(0, MAX_TASKS).map(normalizeTask).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      filter: ["all", "active", "completed"].includes(stored.filter) ? stored.filter : "all",
      sort: ["created-desc", "created-asc", "due", "priority", "alphabetical"].includes(stored.sort) ? stored.sort : "created-desc",
      search: typeof stored.search === "string" ? stored.search.slice(0, 300) : ""
    };
  } catch {
    return { filter: "all", sort: "created-desc", search: "" };
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    setStatus("The browser could not save this list. Export a backup.", "error");
  }
}

function saveSettings() {
  settings.filter = currentFilter;
  settings.sort = taskSort.value;
  settings.search = taskSearch.value;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Task data remains usable even if view preferences cannot be saved.
  }
}

function handleStorageChange(event) {
  if (event.key !== STORAGE_KEY) return;
  tasks = loadTasks();
  editingTaskId = null;
  setStatus("List refreshed from another tab.", "valid");
  render();
}

function normalizeTask(value) {
  if (!value || typeof value.title !== "string" || !value.title.trim()) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id.slice(0, 100) : createId(),
    title: value.title.trim().slice(0, 300),
    dueDate: normalizeDate(value.dueDate),
    priority: normalizePriority(value.priority),
    completed: Boolean(value.completed),
    createdAt: isValidDateTime(value.createdAt) ? value.createdAt : new Date().toISOString(),
    completedAt: value.completed && isValidDateTime(value.completedAt) ? value.completedAt : null
  };
}

function normalizeDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function normalizePriority(value) {
  return ["low", "normal", "high"].includes(value) ? value : "normal";
}

function isValidDateTime(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return task.dueDate < localToday;
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}

function getEmptyMessage() {
  if (taskSearch.value.trim()) return ["No matching tasks.", "Try a different search."];
  if (currentFilter === "active") return ["Nothing active.", "Completed tasks are still available in the Completed view."];
  if (currentFilter === "completed") return ["Nothing completed.", "Finish a task and it will appear here."];
  return ["No tasks yet.", "Add one above and it will stay in this browser."];
}

function setStatus(message, type) {
  status.textContent = message;
  status.className = `status-pill status-${type}`;
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function truncate(value, length) {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function renderReleaseStamp() {
  releaseStamp.textContent = `Version: ${appRelease}`;
}
