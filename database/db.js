const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "shop.db"));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  )`);

  db.get("SELECT id FROM users WHERE email = ?", ["admin@shop.test"], (err, row) => {
    if (!row) {
      db.run(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        ["Shop Admin", "admin@shop.test", "admin123", "admin"]
      );
    }
  });

  db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
    if (!row || row.count === 0) {
      const stmt = db.prepare("INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)");
      [
        ["Notebook", "A ruled notebook", 60, 50],
        ["Pen Pack", "Pack of blue ball pens", 40, 100],
        ["Water Bottle", "Reusable 1 litre bottle", 180, 25],
        ["Backpack", "Everyday school backpack", 650, 12]
      ].forEach(p => stmt.run(p));
      stmt.finalize();
    }
  });
});

module.exports = db;
