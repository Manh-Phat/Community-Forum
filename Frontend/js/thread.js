// js/thread.js
document.addEventListener("DOMContentLoaded", async () => {
  renderNavUser();

  const threadId = getThreadId();
  if (!threadId) {
    alert("Thiếu id bài viết!");
    location.href = "index.html";
    return;
  }

  // comments.js sẽ dùng
  window.__THREAD_ID__ = threadId;

  await loadThread(threadId);
  await initVoting(threadId);
});

function getThreadId() {
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  return id ? Number(id) : null;
}

async function loadThread(id) {
  try {
    const t = await apiFetch(`/threads/${id}`, { method: "GET" });

    setText("display-title", t.title);
    setText("crumb-title", t.title);
    setText("display-time", fmtDate(t.created_at));
    setText("display-views", String(t.views ?? 0));
    setText("display-votes", String(t.vote_score ?? 0));
    setHtml("display-content", escapeHtml(t.content || "").replaceAll("\n", "<br/>"));

    const catEl = document.getElementById("crumb-category");
    if (catEl) catEl.textContent = t.category ? `#${t.category}` : "Chủ đề";

    const tagEl = document.getElementById("display-tag");
    if (tagEl) {
      const tags = (t.tags || []).map((x) => `#${x}`).join(" ");
      tagEl.textContent = tags || "";
    }

    // ===== AUTHOR + AVATAR =====
    setText("display-author", t.author?.username || t.username || "User");

    const avatarEl = document.getElementById("display-avatar");
    if (avatarEl) {
      avatarEl.src = t.author?.avatar || t.author?.avatar_url || "images/default-avatar.png";
    }

  } catch (err) {
    alert("Không tải được bài viết: " + err.message);
    location.href = "index.html";
  }
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v ?? "";
}
function setHtml(id, v) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = v ?? "";
}

async function initVoting(threadId) {
  const upBtn = document.querySelector(".vote-btn.upvote");
  const downBtn = document.querySelector(".vote-btn.downvote");
  if (!upBtn || !downBtn) return;

  let my = null;
  if (getToken()) {
    try {
      const r = await apiFetch(`/threads/${threadId}/vote/my`, { method: "GET" });
      my = r.value; // 1|-1|null
    } catch {}
  }

  function paint() {
    upBtn.classList.toggle("active", my === 1);
    downBtn.classList.toggle("active", my === -1);
  }
  paint();

  async function doVote(value) {
    if (!getToken()) {
      alert("Bạn cần đăng nhập để vote!");
      location.href = "login.html";
      return;
    }
    try {
      if (my === value) {
        const r = await apiFetch(`/threads/${threadId}/vote`, { method: "DELETE" });
        my = null;
        setText("display-votes", String(r.vote_score ?? 0));
      } else {
        const r = await apiFetch(`/threads/${threadId}/vote`, {
          method: "POST",
          body: JSON.stringify({ value }),
        });
        my = value;
        setText("display-votes", String(r.vote_score ?? 0));
      }
      paint();
    } catch (err) {
      alert("Vote lỗi: " + err.message);
    }
  }

  upBtn.addEventListener("click", () => doVote(1));
  downBtn.addEventListener("click", () => doVote(-1));
}
