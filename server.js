const express = require("express");
const session = require("express-session");
const path = require("path");
const db = require("./database/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "demo-shopping-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax" }
}));
app.use(express.static(path.join(__dirname, "public")));

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Please log in first" });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (e, rows) => e ? reject(e) : resolve(rows)));
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (e, row) => e ? reject(e) : resolve(row)));
}
function run(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function(e) {
    e ? reject(e) : resolve({ id: this.lastID, changes: this.changes });
  }));
}

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });
    if (password.length < 4) return res.status(400).json({ error: "Password must be at least 4 characters" });
    const result = await run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'customer')",
      [name.trim(), email.trim().toLowerCase(), password]
    );
    req.session.user = { id: result.id, name: name.trim(), email: email.trim().toLowerCase(), role: "customer" };
    req.session.cart = [];
    res.json({ message: "Registration successful", user: req.session.user });
  } catch (e) {
    res.status(400).json({ error: e.message.includes("UNIQUE") ? "Email already registered" : "Registration failed" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await get("SELECT id, name, email, role FROM users WHERE email = ? AND password = ?", [
    (email || "").trim().toLowerCase(), password || ""
  ]);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  req.session.user = user;
  req.session.cart = [];
  res.json({ message: "Login successful", user });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out" }));
});

app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));

app.get("/api/products", async (req, res) => {
  const q = (req.query.q || "").trim();
  const products = q
    ? await all("SELECT * FROM products WHERE name LIKE ? OR description LIKE ? ORDER BY id DESC", [`%${q}%`, `%${q}%`])
    : await all("SELECT * FROM products ORDER BY id DESC");
  res.json(products);
});

app.post("/api/cart", requireLogin, async (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: "Invalid quantity" });
  const product = await get("SELECT * FROM products WHERE id = ?", [productId]);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (quantity > product.stock) return res.status(400).json({ error: "Not enough stock" });
  const cart = req.session.cart || [];
  const existing = cart.find(item => item.productId === productId);
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, product.stock);
  else cart.push({ productId, quantity });
  req.session.cart = cart;
  res.json({ message: "Product added to cart", cart });
});

app.get("/api/cart", requireLogin, async (req, res) => {
  const cart = req.session.cart || [];
  const items = [];
  for (const item of cart) {
    const product = await get("SELECT id, name, price, stock FROM products WHERE id = ?", [item.productId]);
    if (product) items.push({ ...product, quantity: item.quantity, subtotal: product.price * item.quantity });
  }
  res.json({ items, total: items.reduce((sum, item) => sum + item.subtotal, 0) });
});

app.put("/api/cart/:productId", requireLogin, async (req, res) => {
  const productId = Number(req.params.productId);
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: "Quantity must be at least 1" });
  const product = await get("SELECT stock FROM products WHERE id = ?", [productId]);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (quantity > product.stock) return res.status(400).json({ error: "Not enough stock" });
  const item = (req.session.cart || []).find(i => i.productId === productId);
  if (!item) return res.status(404).json({ error: "Item not in cart" });
  item.quantity = quantity;
  res.json({ message: "Cart quantity updated" });
});

app.post("/api/checkout", requireLogin, async (req, res) => {
  const cart = req.session.cart || [];
  if (!cart.length) return res.status(400).json({ error: "Cart is empty" });
  try {
    let total = 0;
    const orderLines = [];
    for (const item of cart) {
      const product = await get("SELECT * FROM products WHERE id = ?", [item.productId]);
      if (!product || product.stock < item.quantity) throw new Error("Insufficient stock for " + (product ? product.name : "product"));
      total += product.price * item.quantity;
      orderLines.push({ product, quantity: item.quantity });
    }
    const order = await run("INSERT INTO orders (user_id, total) VALUES (?, ?)", [req.session.user.id, total]);
    for (const line of orderLines) {
      await run(
        "INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)",
        [order.id, line.product.id, line.product.name, line.quantity, line.product.price]
      );
      await run("UPDATE products SET stock = stock - ? WHERE id = ?", [line.quantity, line.product.id]);
    }
    req.session.cart = [];
    res.json({ message: "Order placed successfully", orderId: order.id, total });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/orders", requireLogin, async (req, res) => {
  const orders = await all("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC", [req.session.user.id]);
  for (const order of orders) {
    order.items = await all("SELECT product_name, quantity, price FROM order_items WHERE order_id = ?", [order.id]);
  }
  res.json(orders);
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  const { name, description, price, stock } = req.body;
  if (!name || Number(price) < 0 || !Number.isFinite(Number(price)) || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
    return res.status(400).json({ error: "Enter valid product details" });
  }
  const result = await run(
    "INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)",
    [name.trim(), description || "", Number(price), Number(stock)]
  );
  res.json({ message: "Product added", productId: result.id });
});

app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const { name, description, price, stock } = req.body;
  const result = await run(
    "UPDATE products SET name = ?, description = ?, price = ?, stock = ? WHERE id = ?",
    [name, description || "", Number(price), Number(stock), Number(req.params.id)]
  );
  if (!result.changes) return res.status(404).json({ error: "Product not found" });
  res.json({ message: "Product updated" });
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const result = await run("DELETE FROM products WHERE id = ?", [Number(req.params.id)]);
  if (!result.changes) return res.status(404).json({ error: "Product not found" });
  res.json({ message: "Product deleted" });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Online Shopping System running at http://localhost:${PORT}`));
