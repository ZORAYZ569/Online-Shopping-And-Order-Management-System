const $ = id => document.getElementById(id);
let currentUser = null;

function message(text, isError = false) {
  $("message").textContent = text;
  $("message").style.color = isError ? "#b91c1c" : "#166534";
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function show(section) {
  ["authSection", "catalogSection", "cartSection", "ordersSection", "adminSection"]
    .forEach(id => $(id).hidden = id !== section);
}
async function refreshUser() {
  const data = await api("/api/me");
  currentUser = data.user;
  $("authSection").hidden = !!currentUser;
  $("catalogNav").hidden = !currentUser;
  $("cartNav").hidden = !currentUser;
  $("ordersNav").hidden = !currentUser;
  $("adminNav").hidden = !currentUser || currentUser.role !== "admin";
  $("logoutBtn").hidden = !currentUser;
  if (currentUser) {
    show("catalogSection");
    await loadProducts();
  } else show("authSection");
}
async function loadProducts(query = "") {
  const products = await api("/api/products?q=" + encodeURIComponent(query));
  $("productList").innerHTML = products.map(p => `
    <article class="product">
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.description || "")}</p>
      <p class="price">₹${Number(p.price).toFixed(2)}</p>
      <p>Stock: ${p.stock}</p>
      <button data-add="${p.id}" ${p.stock < 1 ? "disabled" : ""}>Add to Cart</button>
    </article>`).join("") || "<p>No products found.</p>";
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await api("/api/login", { method: "POST", body: JSON.stringify({
      email: $("loginEmail").value, password: $("loginPassword").value
    }) });
    message("Login successful");
    await refreshUser();
  } catch (err) { message(err.message, true); }
});
$("registerForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await api("/api/register", { method: "POST", body: JSON.stringify({
      name: $("registerName").value, email: $("registerEmail").value,
      password: $("registerPassword").value
    }) });
    message("Registration successful");
    await refreshUser();
  } catch (err) { message(err.message, true); }
});
$("logoutBtn").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  message("Logged out");
  await refreshUser();
});
$("catalogNav").addEventListener("click", async () => { show("catalogSection"); await loadProducts(); });
$("cartNav").addEventListener("click", async () => { show("cartSection"); await loadCart(); });
$("ordersNav").addEventListener("click", async () => { show("ordersSection"); await loadOrders(); });
$("adminNav").addEventListener("click", () => show("adminSection"));
$("searchForm").addEventListener("submit", async e => {
  e.preventDefault();
  await loadProducts($("searchInput").value);
});
$("productList").addEventListener("click", async e => {
  const id = e.target.dataset.add;
  if (!id) return;
  try {
    await api("/api/cart", { method: "POST", body: JSON.stringify({ productId: Number(id), quantity: 1 }) });
    message("Product added to cart");
  } catch (err) { message(err.message, true); }
});
async function loadCart() {
  const data = await api("/api/cart");
  $("cartList").innerHTML = data.items.map(item => `
    <div class="cart-row">
      <span>${escapeHtml(item.name)} — ₹${Number(item.price).toFixed(2)}</span>
      <label>Qty <input type="number" min="1" max="${item.stock}" value="${item.quantity}" data-qty="${item.id}"></label>
      <span>Subtotal: ₹${Number(item.subtotal).toFixed(2)}</span>
    </div>`).join("") || "<p>Your cart is empty.</p>";
  $("cartList").insertAdjacentHTML("beforeend", `<h3 id="cartTotal">Total: ₹${Number(data.total).toFixed(2)}</h3>`);
}
$("cartList").addEventListener("change", async e => {
  const id = e.target.dataset.qty;
  if (!id) return;
  try {
    await api("/api/cart/" + id, { method: "PUT", body: JSON.stringify({ quantity: Number(e.target.value) }) });
    message("Cart quantity updated");
    await loadCart();
  } catch (err) { message(err.message, true); await loadCart(); }
});
$("checkoutBtn").addEventListener("click", async () => {
  try {
    const result = await api("/api/checkout", { method: "POST", body: JSON.stringify({}) });
    message(`Order #${result.orderId} placed successfully`);
    await loadCart();
  } catch (err) { message(err.message, true); }
});
async function loadOrders() {
  const orders = await api("/api/orders");
  $("ordersList").innerHTML = orders.map(o => `
    <article class="order-card">
      <h3>Order #${o.id}</h3><p>Date: ${escapeHtml(o.created_at)}</p>
      <p>Total: ₹${Number(o.total).toFixed(2)}</p>
      <ul>${o.items.map(i => `<li>${escapeHtml(i.product_name)} × ${i.quantity}</li>`).join("")}</ul>
    </article>`).join("") || "<p>No orders yet.</p>";
}
$("productForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await api("/api/admin/products", { method: "POST", body: JSON.stringify({
      name: $("productName").value, description: $("productDescription").value,
      price: Number($("productPrice").value), stock: Number($("productStock").value)
    }) });
    message("Product added successfully");
    e.target.reset();
    await loadProducts();
  } catch (err) { message(err.message, true); }
});
refreshUser().catch(err => message(err.message, true));
