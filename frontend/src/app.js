const backendStatus = document.getElementById('backend-status');
const backendText = document.getElementById('backend-text');
const todoList = document.getElementById('todo-list');
const addForm = document.getElementById('add-form');
const todoInput = document.getElementById('todo-input');
const taskCounter = document.getElementById('task-counter');
const uptimeVal = document.getElementById('uptime-val');

// Check backend health
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    backendStatus.className = 'status-badge online';
    backendText.textContent = `Backend Online (${data.service})`;
    uptimeVal.textContent = `${data.uptime}s`;
  } catch (err) {
    backendStatus.className = 'status-badge offline';
    backendText.textContent = 'Backend Offline';
    uptimeVal.textContent = 'Unavailable';
    console.error('Health check failed:', err);
  }
}

// Fetch and render todos
async function loadTodos() {
  try {
    const res = await fetch('/api/todos');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const payload = await res.json();
    const todos = payload.data || [];
    renderTodos(todos);
  } catch (err) {
    todoList.innerHTML = `<li class="loading" style="color: #ef4444;">Failed to load tasks from /api/todos. Ensure backend is running.</li>`;
    console.error('Load todos failed:', err);
  }
}

function renderTodos(todos) {
  todoList.innerHTML = '';
  taskCounter.textContent = `${todos.length} ${todos.length === 1 ? 'task' : 'tasks'}`;

  if (todos.length === 0) {
    todoList.innerHTML = `<li class="loading">No tasks yet. Add one above!</li>`;
    return;
  }

  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!todo.completed;
    checkbox.addEventListener('change', () => toggleTodo(todo.id, checkbox.checked));

    const span = document.createElement('span');
    span.textContent = todo.title;

    li.appendChild(checkbox);
    li.appendChild(span);
    todoList.appendChild(li);
  });
}

// Add new todo
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;

  try {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });

    if (!res.ok) throw new Error('Failed to create todo');
    todoInput.value = '';
    await loadTodos();
  } catch (err) {
    alert('Error adding task: ' + err.message);
  }
});

// Toggle todo completion
async function toggleTodo(id, completed) {
  try {
    await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
    await loadTodos();
  } catch (err) {
    console.error('Failed to toggle todo:', err);
  }
}

// Initial bootstrap
checkHealth();
loadTodos();
// Periodic health check every 10 seconds
setInterval(checkHealth, 10000);
