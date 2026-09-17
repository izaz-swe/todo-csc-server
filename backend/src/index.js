const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory demo data
let todos = [
  { id: 1, title: 'Connect GitHub Actions with Tailscale', completed: true },
  { id: 2, title: 'Deploy containerized Backend, Frontend & Nginx', completed: true },
  { id: 3, title: 'Verify health check endpoint via Reverse Proxy', completed: false }
];

// Single Health check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Single Todo list API
app.get('/api/todos', (req, res) => {
  res.json({
    success: true,
    data: todos
  });
});

app.post('/api/todos', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }
  const newTodo = {
    id: Date.now(),
    title: title.trim(),
    completed: false
  };
  todos.push(newTodo);
  res.status(201).json({ success: true, data: newTodo });
});

app.patch('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const todo = todos.find(t => t.id === id);
  if (!todo) {
    return res.status(404).json({ success: false, error: 'Todo not found' });
  }
  if (typeof req.body.completed === 'boolean') {
    todo.completed = req.body.completed;
  }
  res.json({ success: true, data: todo });
});

// Clean process signal handling (Docker Best Practice instead of PM2)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Backend] Service running on http://0.0.0.0:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[Backend] SIGTERM received. Closing gracefully...');
  server.close(() => {
    console.log('[Backend] Server closed. Exiting process.');
    process.exit(0);
  });
});
