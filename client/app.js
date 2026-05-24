/* ═══════════════════════════════════════════════
   NEIGHBOR TRADE — CLIENT CORE
   app.js  |  shared across all pages
═══════════════════════════════════════════════ */

const API_BASE = "http://localhost:5000/api";

// ── Auth Utilities ────────────────────────────────────────────────────────────
const auth = {
  getToken  : () => localStorage.getItem("token"),
  getUser   : () => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } },
  isLoggedIn: () => !!localStorage.getItem("token"),
  setSession: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user",  JSON.stringify(user));
  },
  clearSession: () => { localStorage.removeItem("token"); localStorage.removeItem("user"); },
  logout: () => { auth.clearSession(); window.location.href = "login.html"; },
  requireAuth: () => { if (!auth.isLoggedIn()) { window.location.href = "login.html"; return false; } return true; }
};

// ── Toast Notification System ─────────────────────────────────────────────────
function showToast(message, type = "default") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const icons = { success: "✅", error: "❌", default: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] ?? icons.default}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut .3s ease forwards";
    setTimeout(() => toast.remove(), 320);
  }, 3200);
}

// ── XSS Protection ────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ── FEATURE 5: Relative Time — "2 days ago" ───────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000); // seconds
  if (diff < 60)                    return "just now";
  if (diff < 3600)                  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)                 return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 2)             return "yesterday";
  if (diff < 86400 * 7)             return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 86400 * 30)            return `${Math.floor(diff / 604800)} weeks ago`;
  if (diff < 86400 * 365)           return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} yr ago`;
}

// ── Navbar: show auth or user links based on session ─────────────────────────
function updateNavbar() {
  const user    = auth.getUser();
  const navAuth = document.getElementById("nav-auth");
  const navUser = document.getElementById("nav-user");
  if (navAuth && navUser) {
    if (auth.isLoggedIn() && user) {
      navAuth.style.display = "none";
      navUser.style.display = "flex";
      const nameEl = document.getElementById("nav-user-name");
      if (nameEl) nameEl.textContent = user.name;
    } else {
      navAuth.style.display = "flex";
      navUser.style.display = "none";
    }
  }
}

// ── Build a Single Item Card ──────────────────────────────────────────────────
function buildItemCard(item, showActions = false) {
  const card = document.createElement("div");
  card.className = "item-card" + (item.status === "traded" ? " item-card--traded" : "");

  const actionsHtml = showActions
    ? `<div class="card-actions">
         ${item.status !== "traded"
           ? `<button class="btn btn-sm btn-outline-green" onclick="openEditItem('${item._id}')">✏️ Edit</button>
              <button class="btn btn-sm btn-traded" onclick="markAsTraded('${item._id}')">✅ Traded</button>`
           : `<span class="traded-badge">✅ Traded</span>`}
         <button class="btn btn-danger btn-sm" onclick="deleteItem('${item._id}')">🗑 Delete</button>
       </div>`
    : `<div class="item-card-footer">
         <div class="owner-info">
           By <span class="owner-name">${escapeHtml(item.owner?.name || "Unknown")}</span>
           ${item.owner?.suburb ? `&nbsp;·&nbsp;${escapeHtml(item.owner.suburb)}` : ""}
         </div>
         <span class="item-date">${timeAgo(item.createdAt)}</span>
       </div>`;

  card.innerHTML = `
    <a href="item.html?id=${item._id}" class="card-link-wrap">
      <div class="item-card-header">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="item-badge">${escapeHtml(item.category)}</span>
      </div>
      ${item.description ? `<p class="item-description">${escapeHtml(item.description)}</p>` : ""}
      <div class="item-exchange-tag">🔄&nbsp; Wants: ${escapeHtml(item.exchangeFor)}</div>
    </a>
    ${actionsHtml}
  `;
  return card;
}

// ── ALL ITEMS stored in memory for client-side filtering ──────────────────────
let _allItems = [];

// ── FEATURE 1 & 2: Search + Category Filter ───────────────────────────────────
function applyFilters() {
  const query    = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const category = document.getElementById("activeCategoryFilter")?.value || "All";

  const filtered = _allItems.filter(item => {
    const matchCat  = category === "All" || item.category === category;
    const matchText = !query ||
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.exchangeFor.toLowerCase().includes(query);
    return matchCat && matchText;
  });

  renderItemGrid(filtered, "itemsContainer");

  // Update results count
  const countEl = document.getElementById("resultsCount");
  if (countEl) countEl.textContent = `${filtered.length} listing${filtered.length !== 1 ? "s" : ""}`;
}

function renderItemGrid(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No listings found</h3>
        <p>Try a different keyword or category.</p>
      </div>`;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "items-grid";
  items.forEach(item => grid.appendChild(buildItemCard(item)));
  container.innerHTML = "";
  container.appendChild(grid);
}

// ── Load Public Marketplace Items ─────────────────────────────────────────────
async function loadItems(containerId = "itemsContainer") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="loading-state"><div class="spinner"></div><p>Loading listings…</p></div>`;

  try {
    const res = await fetch(`${API_BASE}/items/all`);
    if (!res.ok) throw new Error("Request failed");
    _allItems = await res.json();

    // Update total count badge
    const countEl = document.getElementById("resultsCount");
    if (countEl) countEl.textContent = `${_allItems.length} listing${_allItems.length !== 1 ? "s" : ""}`;

    if (!_allItems.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3>No listings yet</h3>
          <p>Be the first to post something for trade!</p>
        </div>`;
      return;
    }

    // Build category pills from actual data
    buildCategoryPills(_allItems);

    renderItemGrid(_allItems, containerId);

  } catch {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load listings</h3>
        <p>Please check your connection and try again.</p>
      </div>`;
  }
}

// ── FEATURE 2: Build Category Pills dynamically ───────────────────────────────
function buildCategoryPills(items) {
  const pillsContainer = document.getElementById("categoryPills");
  if (!pillsContainer) return;

  const categories = ["All", ...new Set(items.map(i => i.category).filter(Boolean).sort())];

  pillsContainer.innerHTML = categories.map(cat =>
    `<button class="pill${cat === "All" ? " pill--active" : ""}"
             onclick="selectCategory('${escapeHtml(cat)}')">${escapeHtml(cat)}</button>`
  ).join("");

  // Hidden input to track active category
  if (!document.getElementById("activeCategoryFilter")) {
    const hidden = document.createElement("input");
    hidden.type = "hidden"; hidden.id = "activeCategoryFilter"; hidden.value = "All";
    pillsContainer.after(hidden);
  }
}

function selectCategory(category) {
  document.getElementById("activeCategoryFilter").value = category;
  document.querySelectorAll(".pill").forEach(p => {
    p.classList.toggle("pill--active", p.textContent === category);
  });
  applyFilters();
}

// ── Load My Items (Dashboard) ─────────────────────────────────────────────────
async function loadMyItems(containerId = "myItemsContainer") {
  const container = document.getElementById(containerId);
  if (!container) return;


  container.innerHTML = `
    <div class="loading-state"><div class="spinner"></div><p>Loading your listings…</p></div>`;

  try {
    const res = await fetch(`${API_BASE}/items/my`, {
      headers: { Authorization: `Bearer ${auth.getToken()}` }
    });
    if (!res.ok) throw new Error("Failed");
    const items = await res.json();

    const countEl = document.getElementById("myItemsCount");
    if (countEl) countEl.textContent = items.length;

    const tradedEl = document.getElementById("myTradedCount");
    if (tradedEl) tradedEl.textContent = items.filter(i => i.status === "traded").length;

    if (!items.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3>No listings posted yet</h3>
          <p>Start by adding an item you'd like to trade.</p>
          <a href="add-item.html" class="btn btn-primary" style="margin-top:16px">+ Post Item</a>
        </div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "items-grid";
    items.forEach(item => grid.appendChild(buildItemCard(item, true)));
    container.innerHTML = "";
    container.appendChild(grid);

  } catch {
    container.innerHTML = `<p style="color:var(--clr-danger);padding:20px">Error loading your listings.</p>`;
  }
}

// ── FEATURE 3: Open Edit Item ─────────────────────────────────────────────────
function openEditItem(itemId) {
  window.location.href = `edit-item.html?id=${itemId}`;
}

// ── FEATURE 4: Mark as Traded ─────────────────────────────────────────────────
async function markAsTraded(itemId) {
  if (!confirm("Mark this item as traded? It will be hidden from the public marketplace.")) return;

  try {
    const res = await fetch(`${API_BASE}/items/${itemId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.getToken()}`
      },
      body: JSON.stringify({ status: "traded" })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Item marked as traded! 🎉", "success");
      loadMyItems();
    } else {
      showToast(data.message || "Failed to update.", "error");
    }
  } catch {
    showToast("Network error. Please try again.", "error");
  }
}

// ── Delete a Listing ──────────────────────────────────────────────────────────
async function deleteItem(itemId) {
  if (!confirm("Are you sure you want to delete this listing?")) return;

  try {
    const res = await fetch(`${API_BASE}/items/${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.getToken()}` }
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Listing deleted.", "success");
      loadMyItems();
    } else {
      showToast(data.message || "Failed to delete.", "error");
    }
  } catch {
    showToast("Network error. Please try again.", "error");
  }
}

// ── Page Init ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateNavbar();
  document.getElementById("logoutBtn")?.addEventListener("click", auth.logout);

  // Search input — real-time filtering
  document.getElementById("searchInput")?.addEventListener("input", applyFilters);

  if (document.getElementById("itemsContainer"))   loadItems();
  if (document.getElementById("myItemsContainer")) {
    if (auth.requireAuth()) loadMyItems();
  }
});
