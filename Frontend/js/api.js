// js/api.js
const API_BASE = "http://127.0.0.1:8000";

// ===== TOKEN =====
function getToken() {
  return localStorage.getItem("access_token");
}
function setToken(token) {
  localStorage.setItem("access_token", token);
}
function clearToken() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_info");
}

// ===== JWT payload (đọc role nhanh để bật/tắt UI) =====
function jwtPayload() {
  const t = getToken();
  if (!t) return null;
  try {
    const part = t.split(".")[1];
    const json = atob(part.replaceAll("-", "+").replaceAll("_", "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function isAdmin() {
  const p = jwtPayload();
  return (p?.role || "").toLowerCase() === "admin";
}

// ===== FETCH WRAPPER =====
async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  if (!headers["Content-Type"] && options.body) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (res.status === 403) throw new Error("FORBIDDEN");

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) data = await res.json();
  else data = await res.text();

  if (!res.ok) {
    const msg = (data && data.detail) ? data.detail : (typeof data === "string" ? data : "Request failed");
    throw new Error(msg);
  }
  return data;
}

// ===== HELPERS =====
function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN");
  } catch {
    return iso || "";
  }
}
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===== NAV USER =====
function renderNavUser() {
  const guestEl = document.getElementById("guest-actions");
  const userEl = document.getElementById("user-actions");
  const navName = document.getElementById("nav-username");

  const t = getToken();
  if (!t) {
    if (guestEl) guestEl.style.display = "flex";
    if (userEl) userEl.style.display = "none";
    return;
  }
  if (guestEl) guestEl.style.display = "none";
  if (userEl) userEl.style.display = "flex";

  const infoRaw = localStorage.getItem("user_info");
  let info = null;
  try { info = infoRaw ? JSON.parse(infoRaw) : null; } catch {}

  const name = info?.display_name || info?.username || "User";
  if (navName) {
    const badge = (info?.role || jwtPayload()?.role || "user").toLowerCase() === "admin"
      ? '<span class="badge admin">ADMIN</span>'
      : '<span class="badge user">USER</span>';
    navName.innerHTML = `${escapeHtml(name)} ${badge}`;
  }

  const adminLink = document.getElementById("nav-admin-link");
  if (adminLink) adminLink.style.display = isAdmin() ? "inline-flex" : "none";
}

async function loadMeToStorage() {
  if (!getToken()) return null;
  const me = await apiFetch("/users/me", { method: "GET" });
  localStorage.setItem("user_info", JSON.stringify(me));
  return me;
}

document.addEventListener("DOMContentLoaded", () => {
  // auto refresh nav
  renderNavUser();
});
