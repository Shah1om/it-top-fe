// ToDo List — первое задание.
// В этой версии данные хранятся в state.todos.

const state = {
  todos: [
    { id: 1, text: 'Купить хлеб', completed: false },
    { id: 2, text: 'Изучить JavaScript', completed: true },
  ],
  filter: 'all',
  search: '',
  nextId: 3,
  isSaving: false,
};

const todoForm = document.querySelector('#todoForm');
const todoInput = document.querySelector('#todoInput');
const addButton = document.querySelector('#addButton');
const searchInput = document.querySelector('#searchInput');
const todoList = document.querySelector('#todoList');
const clearCompletedButton = document.querySelector('#clearCompleted');
const status = document.querySelector('#status');
const totalCount = document.querySelector('#totalCount');
const activeCount = document.querySelector('#activeCount');
const completedCount = document.querySelector('#completedCount');
const filterButtons = [...document.querySelectorAll('.filter')];

function createDeleteHandler(id) {
  // Замыкание: функция запоминает id конкретной задачи.
  return async function handleDelete() {
    await deleteTodo(id);
  };
}

function saveTodo(todo) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(todo), 500);
  });
}

function deleteDelay(id) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(id), 500);
  });
}

function setSaving(value, message = '') {
  state.isSaving = value;
  status.textContent = message;
  addButton.disabled = value;
  clearCompletedButton.disabled = value;
  todoInput.disabled = value;
}

function getVisibleTodos() {
  const normalizedSearch = state.search.trim().toLowerCase();

  return state.todos
    .filter((todo) => {
      if (state.filter === 'active') return !todo.completed;
      if (state.filter === 'completed') return todo.completed;
      return true;
    })
    .filter((todo) => todo.text.toLowerCase().includes(normalizedSearch));
}

function updateCounters() {
  const total = state.todos.length;
  const completed = state.todos.filter((todo) => todo.completed).length;
  const active = total - completed;

  totalCount.textContent = total;
  activeCount.textContent = active;
  completedCount.textContent = completed;
}

function renderTodos() {
  updateCounters();
  todoList.innerHTML = '';

  const visibleTodos = getVisibleTodos();

  if (visibleTodos.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = state.todos.length === 0
      ? 'Задач пока нет.'
      : 'По выбранным условиям задачи не найдены.';
    todoList.appendChild(empty);
    return;
  }

  visibleTodos.forEach((todo) => {
    const item = document.createElement('li');
    item.className = 'todo-item';
    if (todo.completed) item.classList.add('completed');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', `Отметить задачу: ${todo.text}`);
    checkbox.addEventListener('change', () => {
      toggleTodo(todo.id);
    });

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Удалить';
    deleteButton.disabled = state.isSaving;
    deleteButton.addEventListener('click', createDeleteHandler(todo.id));

    item.append(checkbox, text, deleteButton);
    todoList.appendChild(item);
  });
}

async function addTodo(text) {
  const trimmedText = text.trim();
  if (!trimmedText || state.isSaving) return;

  const newTodo = {
    id: state.nextId,
    text: trimmedText,
    completed: false,
  };

  setSaving(true, 'Сохраняем...');

  try {
    const savedTodo = await saveTodo(newTodo);
    state.todos.push(savedTodo);
    state.nextId += 1;
    todoInput.value = '';
    renderTodos();
  } finally {
    setSaving(false, '');
    renderTodos();
  }
}

async function deleteTodo(id) {
  if (state.isSaving) return;

  setSaving(true, 'Удаляем...');

  try {
    await deleteDelay(id);
    state.todos = state.todos.filter((todo) => todo.id !== id);
  } finally {
    setSaving(false, '');
    renderTodos();
  }
}

function toggleTodo(id) {
  if (state.isSaving) return;

  state.todos = state.todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo,
  );

  renderTodos();
}

async function clearCompleted() {
  if (state.isSaving) return;

  const completedTodos = state.todos.filter((todo) => todo.completed);
  if (completedTodos.length === 0) return;

  setSaving(true, 'Удаляем выполненные...');

  try {
    await Promise.all(completedTodos.map((todo) => deleteDelay(todo.id)));
    state.todos = state.todos.filter((todo) => !todo.completed);
  } finally {
    setSaving(false, '');
    renderTodos();
  }
}

todoForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addTodo(todoInput.value);
});

searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  renderTodos();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderTodos();
  });
});

clearCompletedButton.addEventListener('click', clearCompleted);

renderTodos();
