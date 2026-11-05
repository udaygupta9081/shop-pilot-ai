const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory menu catalogue: the source of truth for this assignment.
let items = [
  { id: 1, name: 'Veg Burger', price: 60, available: true, category: 'Snacks' },
  { id: 2, name: 'Masala Dosa', price: 80, available: true, category: 'Main Course' },
  { id: 3, name: 'Cold Coffee', price: 50, available: true, category: 'Drinks' },
  { id: 4, name: 'Paneer Sandwich', price: 70, available: false, category: 'Snacks' }
];
let nextId = 5;

// GET /items — list all menu items
app.get('/items', (req, res) => {
  res.status(200).json(items);
});

// GET /items/:id — fetch one menu item
app.get('/items/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = items.find((entry) => entry.id === id);
  if (!item) return res.status(404).json({ error: 'Menu item not found' });
  return res.status(200).json(item);
});

// POST /items — create a menu item
app.post('/items', (req, res) => {
  const { name, price, available, category } = req.body || {};
  if (!name || price === undefined || price === null || price === '' || !category) {
    return res.status(422).json({ error: 'name, price and category are required' });
  }
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return res.status(422).json({ error: 'price must be a non-negative number' });
  }

  const newItem = {
    id: nextId++,
    name: String(name).trim(),
    price: numericPrice,
    available: available === undefined ? true : Boolean(available),
    category: String(category).trim()
  };
  items.push(newItem);
  return res.status(201).json(newItem);
});

// Friendly JSON error for malformed request bodies.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  return next(err);
});

app.listen(PORT, () => {
  console.log(`CampusEats Menu API running at http://localhost:${PORT}`);
});
