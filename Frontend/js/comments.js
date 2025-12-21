// js/comments.js
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("sendCommentBtn");
  if (btn) btn.addEventListener("click", () => submitRootComment());

  // load when thread.js sets global; fallback parse from URL
  const id =
    window.__THREAD_ID__ ||
    (new URL(location.href).searchParams.get("id")
      ? Number(new URL(location.href).searchParams.get("id"))
      : null);

  if (id) loadComments(id);
});

function getMe() {
  try {
    return JSON.parse(localStorage.getItem("user_info") || "null");
  } catch {
    return null;
  }
}

function canDeleteComment(c) {
  if (!getToken()) return false;
  const me = getMe();
  const role = (me?.role || "").toLowerCase();
  if (role === "admin") return true;
  if (me?.id && c?.author_id && Number(me.id) === Number(c.author_id)) return true;
  return false;
}

async function loadComments(threadId) {
  const container = document.getElementById("comment-list-container");
  if (!container) return;
  container.innerHTML = "<p>Đang tải bình luận...</p>";

  try {
    const data = await apiFetch(`/threads/${threadId}/comments`, { method: "GET" });
    renderCommentTree(data, container, threadId);
    const count = countComments(data);
    const header = document.getElementById("comment-count-header");
    if (header) header.textContent = `${count} bình luận`;

    // cập nhật UI role/admin-only trong comment
    renderNavUser();
  } catch (err) {
    container.innerHTML = `<p style="color:#d00">Lỗi tải bình luận: ${escapeHtml(err.message)}</p>`;
  }
}

function countComments(nodes) {
  let n = 0;
  const walk = (arr) => {
    for (const c of arr || []) {
      n += 1;
      walk(c.children || []);
    }
  };
  walk(nodes);
  return n;
}

function authorName(c) {
  return c.author?.username || c.user?.username || (c.author_id ? `User #${c.author_id}` : "User");
}

function renderCommentTree(nodes, container, threadId) {
  if (!nodes || !nodes.length) {
    container.innerHTML = "<p>Chưa có bình luận nào.</p>";
    return;
  }
  container.innerHTML = "";
  const ul = document.createElement("div");
  ul.className = "comment-tree";
  nodes.forEach((n) => ul.appendChild(renderCommentNode(n, threadId, 0)));
  container.appendChild(ul);
}

function renderCommentNode(c, threadId, depth) {
  const wrap = document.createElement("div");
  wrap.className = "comment-item";
  wrap.style.marginLeft = `${Math.min(depth * 18, 72)}px`;

  const showDel = canDeleteComment(c) ? "inline-flex" : "none";

  wrap.innerHTML = `
    <div class="comment-content">
      <div class="comment-meta">
        <span class="comment-author">${escapeHtml(authorName(c))}</span>
        <span class="comment-time">${escapeHtml(fmtDate(c.created_at))}</span>
      </div>
      <div class="comment-text">${escapeHtml(c.content || "").replaceAll("\n","<br/>")}</div>
      <div class="comment-actions">
        <button class="btn btn-reply">Trả lời</button>
        <button class="btn btn-del" style="display:${showDel}">Xóa</button>
      </div>
    </div>
    <div class="reply-box" style="display:none;margin-top:8px">
      <textarea class="reply-input" rows="2" placeholder="Nhập trả lời..."></textarea>
      <div style="margin-top:6px;display:flex;gap:8px">
        <button class="btn btn-send-reply">Gửi</button>
        <button class="btn btn-cancel-reply">Hủy</button>
      </div>
    </div>
    <div class="children"></div>
  `;

  const btnReply = wrap.querySelector(".btn-reply");
  const btnDel = wrap.querySelector(".btn-del");
  const replyBox = wrap.querySelector(".reply-box");
  const replyInput = wrap.querySelector(".reply-input");
  const btnSend = wrap.querySelector(".btn-send-reply");
  const btnCancel = wrap.querySelector(".btn-cancel-reply");
  const children = wrap.querySelector(".children");

  btnReply?.addEventListener("click", () => {
    if (!getToken()) {
      alert("Bạn cần đăng nhập để bình luận!");
      location.href = "login.html";
      return;
    }
    replyBox.style.display = "block";
    replyInput.focus();
  });

  btnCancel?.addEventListener("click", () => {
    replyBox.style.display = "none";
    replyInput.value = "";
  });

  btnSend?.addEventListener("click", async () => {
    const content = (replyInput.value || "").trim();
    if (!content) return alert("Nhập nội dung trả lời!");
    try {
      await apiFetch(`/threads/${threadId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parent_id: c.id }),
      });
      replyInput.value = "";
      replyBox.style.display = "none";
      await loadComments(threadId);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        clearToken();
        location.href = "login.html";
        return;
      }
      alert("Gửi reply lỗi: " + err.message);
    }
  });

  btnDel?.addEventListener("click", async () => {
    if (!confirm("Xóa bình luận này?")) return;
    try {
      await apiFetch(`/comments/${c.id}`, { method: "DELETE" });
      await loadComments(threadId);
    } catch (err) {
      alert("Xóa bình luận lỗi: " + err.message);
    }
  });

  (c.children || []).forEach((ch) => {
    children.appendChild(renderCommentNode(ch, threadId, depth + 1));
  });

  return wrap;
}

async function submitRootComment() {
  const threadId =
    window.__THREAD_ID__ ||
    (new URL(location.href).searchParams.get("id")
      ? Number(new URL(location.href).searchParams.get("id"))
      : null);
  if (!threadId) return;

  if (!getToken()) {
    alert("Bạn cần đăng nhập để bình luận!");
    location.href = "login.html";
    return;
  }

  const input = document.getElementById("comment-input");
  const content = (input?.value || "").trim();
  if (!content) return alert("Vui lòng nhập bình luận!");

  try {
    await apiFetch(`/threads/${threadId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    if (input) input.value = "";
    await loadComments(threadId);
  } catch (err) {
    if (err.message === "UNAUTHORIZED") {
      clearToken();
      location.href = "login.html";
      return;
    }
    alert("Gửi bình luận lỗi: " + err.message);
  }
}
