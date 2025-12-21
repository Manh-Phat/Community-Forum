// js/admin.js
document.addEventListener("DOMContentLoaded", async () => {
  renderNavUser();

  if (!getToken() || !isAdmin()) {
    document.getElementById("error").textContent = "Bạn không có quyền admin!";
    setTimeout(() => (location.href = "index.html"), 800);
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearToken();
      location.href = "index.html";
    });
  }

  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) statusFilter.addEventListener("change", () => loadThreads(statusFilter.value));

  await loadThreads(statusFilter?.value || "pending");
  await loadUsers();
});

async function loadThreads(status) {
  const tbody = document.getElementById("threadsTbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7">Đang tải...</td></tr>`;

  try {
    const items = await apiFetch(`/admin/threads?status=${encodeURIComponent(status)}`, { method: "GET" });
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="7">Không có dữ liệu.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map((t) => {
      const tags = (t.tags || []).map((x) => `#${x}`).join(" ");
      return `
        <tr>
          <td>${t.id}</td>
          <td>${escapeHtml(t.title)}</td>
          <td>${escapeHtml(t.category || "")}</td>
          <td>${escapeHtml(tags)}</td>
          <td>${t.vote_score} / ${t.views}</td>
          <td>${t.is_approved ? "✅" : "⏳"} ${t.is_locked ? "🔒" : ""} ${t.is_deleted ? "🗑️" : ""}</td>
          <td style="white-space:nowrap">
            <button class="btn" onclick="adminApprove(${t.id})">Approve</button>
            <button class="btn" onclick="adminReject(${t.id})">Reject</button>
            <button class="btn" onclick="adminLock(${t.id})">Lock</button>
            <button class="btn" onclick="adminUnlock(${t.id})">Unlock</button>
            <button class="btn" onclick="adminRestore(${t.id})">Restore</button>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#d00">Lỗi: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function loadUsers() {
  const tbody = document.getElementById("usersTbody");
  if (!tbody) return;

  try {
    const users = await apiFetch("/users", { method: "GET" }); // admin only
    tbody.innerHTML = users.map((u) => {
      return `
        <tr>
          <td>${u.id}</td>
          <td>${escapeHtml(u.username)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.role)}</td>
          <td>
            <button class="btn" onclick="setRole(${u.id},'user')">Set USER</button>
            <button class="btn" onclick="setRole(${u.id},'admin')">Set ADMIN</button>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    // ignore if section missing
  }
}

async function adminApprove(id) {
  await apiFetch(`/admin/threads/${id}/approve`, { method: "POST" });
  const status = document.getElementById("statusFilter")?.value || "pending";
  await loadThreads(status);
}
async function adminReject(id) {
  if (!confirm("Reject (xóa) bài này?")) return;
  await apiFetch(`/admin/threads/${id}/reject`, { method: "POST" });
  const status = document.getElementById("statusFilter")?.value || "pending";
  await loadThreads(status);
}
async function adminLock(id) {
  await apiFetch(`/admin/threads/${id}/lock`, { method: "POST" });
  const status = document.getElementById("statusFilter")?.value || "pending";
  await loadThreads(status);
}
async function adminUnlock(id) {
  await apiFetch(`/admin/threads/${id}/unlock`, { method: "POST" });
  const status = document.getElementById("statusFilter")?.value || "pending";
  await loadThreads(status);
}
async function adminRestore(id) {
  await apiFetch(`/admin/threads/${id}/restore`, { method: "POST" });
  const status = document.getElementById("statusFilter")?.value || "pending";
  await loadThreads(status);
}
async function setRole(id, role) {
  await apiFetch(`/admin/users/${id}/role?role=${role}`, { method: "POST" });
  await loadUsers();
}
