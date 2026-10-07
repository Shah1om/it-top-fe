/* ============================================================
 * 1. API-слой. Только запросы, без работы с DOM.
 * ============================================================ */

const API_URL = 'http://212.193.11.210:3000';
const STUDENT_ID = 7; // <-- замените на свой номер от 1 до 15

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Student-Id': String(STUDENT_ID),
});

async function handleResponse(response) {
  if (!response.ok) {
    let message = `Ошибка ${response.status}`;
    try {
      const data = await response.json();
      if (data && data.message) message = data.message;
    } catch (_) { /* ignore */ }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function getTodos() {
  const response = await fetch(`${API_URL}/todos`, { headers: headers() });
  return handleResponse(response);
}

async function createTodo(title) {
  const response = await fetch(`${API_URL}/todos`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ title }),
  });
  return handleResponse(response);
}

async function updateTodo(id, data) {
  const response = await fetch(`${API_URL}/todos/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

async function deleteTodo(id) {
  const response = await fetch(`${API_URL}/todos/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handleResponse(response);
}

async function deleteCompletedTodos() {
  // Загружаем список, удаляем выполненные по одному.
  // Если сервер поддерживает массовое удаление — замените на один запрос.
  const todos = await getTodos();
  const completed = todos.filter((t) => t.completed);
  await Promise.all(completed.map((t) => deleteTodo(t.id)));
  return completed.length;
}

/* ============================================================
 * 2. Состояние и DOM-ссылки
 * ============================================================ */

const state = {
  todos: [],
  filter: 'all',
  search: '',
  loading: false,
};

const els = {
  form: document.getElementById('todo-form'),
  input: document.getElementById('todo-input'),
  addBtn: document.getElementById('add-btn'),
  search: document.getElementById('search-input'),
  filters: document.querySelectorAll('.filter-btn'),
  list: document.getElementById('todo-list'),
  empty: document.getElementById('empty-state'),
  status: document.getElementById('status'),
  countAll: document.getElementById('count-all'),
  countActive: document.getElementById('count-active'),
  countCompleted: document.getElementById('count-completed'),
  clearCompletedBtn: document.getElementById('clear-completed-btn'),
};

/* ============================================================
 * 3. Утилиты UI
 * ============================================================ */

function setStatus(text, isError = false) {
  els.status.textContent = text || '';
  els.status.classList.toggle('is-error', Boolean(isError));
}

function getVisibleTodos() {
  const search = state.search.trim().toLowerCase();
  return state.todos.filter((todo) => {
    if (state.filter === 'active' && todo.completed) return false;
    if (state.filter === 'completed' && !todo.completed) return false;
    if (search && !todo.title.toLowerCase().includes(search)) return false;
    return true;
  });
}

function updateCounters() {
  const all = state.todos.length;
  const completed = state.todos.filter((t) => t.completed).length;
  els.countAll.textContent = String(all);
  els.countActive.textContent = String(all - completed);
  els.countCompleted.textContent = String(completed);
  els.clearCompletedBtn.disabled = completed === 0;
}

function render() {
  const visible = getVisibleTodos();
  els.list.innerHTML = '';

  if (visible.length === 0) {
    els.empty.hidden = false;
    els.empty.textContent = state.todos.length === 0
      ? 'Задач пока нет'
      : 'Ничего не найдено';
  } else {
    els.empty.hidden = true;
  }

  const fragment = document.createDocumentFragment();

  visible.forEach((todo) => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' is-completed' : '');
    li.dataset.id = String(todo.id);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => onToggle(todo, checkbox));

    const title = document.createElement('span');
    title.className = 'todo-title';
    title.textContent = todo.title;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.title = 'Удалить';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => onDelete(todo, removeBtn));

    li.append(checkbox, title, removeBtn);
    fragment.appendChild(li);
  });

  els.list.appendChild(fragment);
  updateCounters();
}

/* ============================================================
 * 4. Обработчики
 * ============================================================ */

async function loadTodos() {
  state.loading = true;
  els.addBtn.disabled = true;
  setStatus('Загрузка...');

  try {
    const todos = await getTodos();
    state.todos = Array.isArray(todos) ? todos : [];
    render();
    setStatus('');
  } catch (error) {
    setStatus(`Не удалось загрузить задачи: ${error.message}`, true);
  } finally {
    state.loading = false;
    els.addBtn.disabled = false;
  }
}

async function onAdd(event) {
  event.preventDefault();

  const title = els.input.value.trim();
  if (!title) {
    setStatus('Введите текст задачи', true);
    return;
  }

  els.addBtn.disabled = true;
  els.input.disabled = true;
  setStatus('Сохраняем...');

  try {
    const created = await createTodo(title);
    state.todos.push(created);
    els.input.value = '';
    render();
    setStatus('');
  } catch (error) {
    setStatus(`Не удалось добавить задачу: ${error.message}`, true);
  } finally {
    els.addBtn.disabled = false;
    els.input.disabled = false;
    els.input.focus();
  }
}

async function onToggle(todo, checkbox) {
  const nextCompleted = checkbox.checked;
  checkbox.disabled = true;
  setStatus('Сохраняем...');

  try {
    const updated = await updateTodo(todo.id, { completed: nextCompleted });
    const index = state.todos.findIndex((t) => t.id === todo.id);
    if (index !== -1) state.todos[index] = updated;
    render();
    setStatus('');
  } catch (error) {
    checkbox.checked = todo.completed; // откат
    setStatus(`Не удалось обновить задачу: ${error.message}`, true);
  } finally {
    checkbox.disabled = false;
  }
}

async function onDelete(todo, button) {
  button.disabled = true;
  setStatus('Удаляем...');

  try {
    await deleteTodo(todo.id);
    state.todos = state.todos.filter((t) => t.id !== todo.id);
    render();
    setStatus('');
  } catch (error) {
    button.disabled = false;
    setStatus(`Не удалось удалить задачу: ${error.message}`, true);
  }
}

async function onClearCompleted() {
  const completedCount = state.todos.filter((t) => t.completed).length;
  if (completedCount === 0) return;

  els.clearCompletedBtn.disabled = true;
  setStatus('Удаляем выполненные...');

  try {
    await deleteCompletedTodos();
    state.todos = state.todos.filter((t) => !t.completed);
    render();
    setStatus('');
  } catch (error) {
    setStatus(`Не удалось удалить выполненные: ${error.message}`, true);
  } finally {
    updateCounters();
  }
}

function onFilterClick(event) {
  const button = event.currentTarget;
  state.filter = button.dataset.filter;
  els.filters.forEach((b) => b.classList.toggle('is-active', b === button));
  render();
}

function onSearch(event) {
  state.search = event.target.value;
  render();
}

/* ============================================================
 * 5. Инициализация
 * ============================================================ */

function bindEvents() {
  els.form.addEventListener('submit', onAdd);
  els.search.addEventListener('input', onSearch);
  els.filters.forEach((btn) => btn.addEventListener('click', onFilterClick));
  els.clearCompletedBtn.addEventListener('click', onClearCompleted);
}

bindEvents();
loadTodos();