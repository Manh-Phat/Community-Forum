// js/api.js
// API_BASE ưu tiên: window.API_BASE (set trong HTML) -> localStorage -> mặc định localhost
// Deploy frontend riêng: localStorage.setItem('API_BASE','https://community-forum-zzbo.onrender.com')
const API_BASE = (typeof window !== "undefined" && window.API_BASE)
  ? String(window.API_BASE)
  : (localStorage.getItem("API_BASE") || "http://127.0.0.1:8000");

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
function logout() {
  clearToken();
  location.href = "index.html";
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

// ===== NAV USER (SINGLE SOURCE OF TRUTH) =====
function renderNavUser() {
  const guestEl = document.getElementById("guest-actions");
  const userEl = document.getElementById("user-actions");
  const navName = document.getElementById("nav-username");
  const navAvatar = document.getElementById("nav-avatar");

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
  const role = (info?.role || jwtPayload()?.role || "user").toLowerCase();

  if (navName) {
    const badge = role === "admin"
      ? '<span class="badge admin">ADMIN</span>'
      : '<span class="badge user">USER</span>';
    navName.innerHTML = `${escapeHtml(name)} ${badge}`;
  }

  if (navAvatar) {
    const avatarUrl = info?.avatar_url || info?.avatar || "";
    navAvatar.src = avatarUrl ? avatarUrl : "images/default-avatar.png";
  }

  // Admin-only buttons/links
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.style.display = role === "admin" ? "inline-flex" : "none";
  });

  const adminLink = document.getElementById("nav-admin-link");
  if (adminLink) adminLink.style.display = role === "admin" ? "inline-flex" : "none";
}

async function loadMeToStorage() {
  if (!getToken()) return null;
  const me = await apiFetch("/users/me", { method: "GET" });
  localStorage.setItem("user_info", JSON.stringify(me));
  return me;
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavUser();
});
