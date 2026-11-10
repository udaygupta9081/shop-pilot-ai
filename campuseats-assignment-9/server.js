// CampusEats Menu API -- Assignment 9: secured with JWT (authentication) and roles (authorization)
require('dotenv').config(); // loads JWT_SECRET from .env
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// The secret lives in .env (git-ignored), never in the code.
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and fill in a value.');
  process.exit(1);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // the web page itself is public; the API is not

// ---------- users: two roles, passwords stored only as bcrypt hashes ----------
const users = [
  { id: 1, email: 'asha@campus.edu',    role: 'customer',   hash: bcrypt.hashSync('customer123', 10) },
  { id: 2, email: 'mealhub@campus.edu', role: 'restaurant', hash: bcrypt.hashSync('resto123', 10) },
];

// ---------- in-memory menu catalogue (same data as Assignment 8) ----------
let items = [
  { id: 1, name: 'Veg Burger', price: 60, available: true, category: 'Snacks' },
  { id: 2, name: 'Masala Dosa', price: 80, available: true, category: 'Main Course' },
  { id: 3, name: 'Cold Coffee', price: 50, available: true, category: 'Drinks' },
  { id: 4, name: 'Paneer Sandwich', price: 70, available: false, category: 'Snacks' }
];
let nextId = 5;

// ---------- POST /login -- verify the password, hand back a JWT ----------
app.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = users.find((u) => u.email === email);
  if (!user || typeof password !== 'string' || !bcrypt.compareSync(password, user.hash)) {
    return res.status(401).json({ error: 'bad login' });
  }
  const token = jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '1h' });
  return res.status(200).json({ token });
});

// ---------- authentication: who are you? (401) ----------
function auth(req, res, next) {
  const token = (req.get('Authorization') || '').split(' ')[1]; // "Bearer <token>"
  try {
    req.user = jwt.verify(token, SECRET); // throws if missing, tampered or expired
    next();
  } catch {
    res.status(401).json({ error: 'invalid or missing token' });
  }
}

// ---------- authorization: may you? (403) ----------
function requireRole(...allowed) {
  return (req, res, next) =>
    allowed.includes(req.user.role) ? next() : res.status(403).json({ error: 'forbidden' });
}

// GET /items -- any authenticated user may read the menu
app.get('/items', auth, (req, res) => {
  res.status(200).json(items);
});

// GET /items/:id -- any authenticated user may read one item
app.get('/items/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  const item = items.find((entry) => entry.id === id);
  if (!item) return res.status(404).json({ error: 'Menu item not found' });
  return res.status(200).json(item);
});

// POST /items -- only a restaurant (or admin) may add a dish
app.post('/items', auth, requireRole('restaurant', 'admin'), (req, res) => {
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
  console.log(`CampusEats Secured Menu API running at http://localhost:${PORT}`);
});
