/* ═══════════════════════════════════════════════
   NEIGHBOR TRADE — CLIENT CORE
   app.js  |  shared across all pages
═══════════════════════════════════════════════ */

const API_BASE = "http://localhost:5000/api";

// ── Auth Utilities ────────────────────────────────────────────────────────────
const auth = {
  getToken : () => localStorage.getItem("token"),
  getUser  : () => {
    const raw = localStorage.getItem("user");
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  isLoggedIn  : () => !!localStorage.getItem("token"),
  setSession  : (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user",  JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
  logout: () => {
    auth.clearSession();
    window.location.href = "login.html";
  },
  /** Redirect to login if not authenticated */
  requireAuth: () => {
    if (!auth.isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Date Formatting ───────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}

// ── Navbar: show auth or user links based on session ─────────────────────────
function updateNavbar() {
  const user   = auth.getUser();
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
function buildItemCard(item, showDelete = false) {
  const card = document.createElement("div");
  card.className = "item-card";
  card.innerHTML = `
    <div class="item-card-header">
      <h3>${escapeHtml(item.title)}</h3>
      <span class="item-badge">${escapeHtml(item.category)}</span>
    </div>
    ${item.description
      ? `<p class="item-description">${escapeHtml(item.description)}</p>`
      : ""}
    <div class="item-exchange-tag">🔄&nbsp; Wants: ${escapeHtml(item.exchangeFor)}</div>
    <div class="item-card-footer">
      ${showDelete
        ? `<span class="item-date">${formatDate(item.createdAt)}</span>
           <button class="btn btn-danger btn-sm" onclick="deleteItem('${item._id}')">Delete</button>`
        : `<div class="owner-info">
             By <span class="owner-name">${escapeHtml(item.owner?.name || "Unknown")}</span>
             ${item.owner?.suburb ? `&nbsp;·&nbsp;${escapeHtml(item.owner.suburb)}` : ""}
           </div>
           <span class="item-date">${formatDate(item.createdAt)}</span>`
      }
    </div>
  `;
  return card;
}

// ── Load Public Marketplace Items ─────────────────────────────────────────────
async function loadItems(containerId = "itemsContainer") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading listings…</p>
    </div>`;

  try {
    const res = await fetch(`${API_BASE}/items/all`);
    if (!res.ok) throw new Error("Request failed");
    const items = await res.json();

    if (!items.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3>No listings yet</h3>
          <p>Be the first to post something for trade!</p>
        </div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "items-grid";
    items.forEach(item => grid.appendChild(buildItemCard(item)));
    container.innerHTML = "";
    container.appendChild(grid);

  } catch {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load listings</h3>
        <p>Please check your connection and try again.</p>
      </div>`;
  }
}

// ── Load Current User's Listings (Dashboard) ──────────────────────────────────
async function loadMyItems(containerId = "myItemsContainer") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading your listings…</p>
    </div>`;

  try {
    const res = await fetch(`${API_BASE}/items/my`, {
      headers: { Authorization: `Bearer ${auth.getToken()}` }
    });
    if (!res.ok) throw new Error("Request failed");
    const items = await res.json();

    // Update stat counter
    const countEl = document.getElementById("myItemsCount");
    if (countEl) countEl.textContent = items.length;

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
    items.forEach(item => grid.appendChild(buildItemCard(item, true /* showDelete */)));
    container.innerHTML = "";
    container.appendChild(grid);

  } catch {
    container.innerHTML = `<p style="color:var(--clr-danger);padding:20px">Error loading your listings.</p>`;
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

  // Wire logout button (present on any page)
  document.getElementById("logoutBtn")?.addEventListener("click", auth.logout);

  // Auto-load items based on which container exists on the page
  if (document.getElementById("itemsContainer"))   loadItems();
  if (document.getElementById("myItemsContainer")) {
    if (auth.requireAuth()) loadMyItems();
  }
});
