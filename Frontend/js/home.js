// js/home.js
document.addEventListener("DOMContentLoaded", () => {
  renderNavUser();
  initSortButtons();
  bindSearch();
  loadFeed("latest");
});

let CURRENT_SORT = "latest";
let CURRENT_PAGE = 1;
const LIMIT = 10;
let CURRENT_QUERY = "";

function initSortButtons() {
  const titleEl = document.getElementById("feed-title");
  if (!titleEl) return;
  if (document.getElementById("btn-sort-latest")) return;

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.gap = "8px";
  wrap.style.flexWrap = "wrap";
  wrap.style.marginTop = "10px";

  wrap.innerHTML = `
    <button id="btn-sort-latest" class="btn">Mới nhất</button>
    <button id="btn-sort-top" class="btn">Top vote</button>
    <button id="btn-sort-trending" class="btn">Trending</button>
  `;
  titleEl.appendChild(wrap);

  document.getElementById("btn-sort-latest").onclick = () => loadFeed("latest", 1);
  document.getElementById("btn-sort-top").onclick = () => loadFeed("top", 1);
  document.getElementById("btn-sort-trending").onclick = () => loadFeed("trending", 1);
}

function bindSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      CURRENT_QUERY = input.value.trim();
      loadFeed(CURRENT_SORT, 1);
    }
  });
}

async function loadFeed(sort, page = 1) {
  CURRENT_SORT = sort;
  CURRENT_PAGE = page;

  const listEl = document.getElementById("post-container");
  if (listEl) listEl.innerHTML = "<p>Đang tải...</p>";

  try {
    let data;
    if (sort === "trending") {
      data = await apiFetch(`/threads/trending?page=${page}&limit=${LIMIT}`, { method: "GET" });
    } else {
      const q = encodeURIComponent(CURRENT_QUERY || "");
      data = await apiFetch(`/threads?q=${q}&sort=${sort}&page=${page}&limit=${LIMIT}`, { method: "GET" });
    }

    renderThreads(data.items || []);
    renderPagination(data.total || 0, page);
  } catch (err) {
    if (listEl) listEl.innerHTML = `<p style="color:#d00">Lỗi tải bài viết: ${escapeHtml(err.message)}</p>`;
  }
}

function renderThreads(items) {
  const listEl = document.getElementById("post-container");
  if (!listEl) return;

  if (!items.length) {
    listEl.innerHTML = "<p>Chưa có bài viết.</p>";
    return;
  }

  listEl.innerHTML = items
    .map((t) => {
      const cat = t.category ? `<span class="tag">#${escapeHtml(t.category)}</span>` : "";
      const tags = (t.tags || []).map((x) => `<span class="tag">#${escapeHtml(x)}</span>`).join(" ");

      const excerpt = escapeHtml((t.content || "").slice(0, 180)) + (t.content?.length > 180 ? "..." : "");

      return `
      <div class="post-card">
        <h3 class="post-title">
          <a href="thread.html?id=${t.id}">${escapeHtml(t.title)}</a>
        </h3>

        <div class="post-meta">
          <span><i class="fa-regular fa-clock"></i> ${fmtDate(t.created_at)}</span>
          <span><i class="fa-regular fa-eye"></i> ${t.views}</span>
          <span><i class="fa-solid fa-arrow-up"></i> ${t.vote_score}</span>
        </div>

        <p class="post-excerpt">${excerpt}</p>

        <div class="post-tags">${cat} ${tags}</div>

        <div class="post-actions" style="margin-top:10px">
          <a href="thread.html?id=${t.id}" class="btn-view" style="color:#2563eb;font-weight:600;text-decoration:none">
            Xem thêm →
          </a>
        </div>
      </div>`;
    })
    .join("");
}

function renderPagination(total, page) {
  const el = document.getElementById("pagination");
  if (!el) return;

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const prevDisabled = page <= 1 ? "disabled" : "";
  const nextDisabled = page >= totalPages ? "disabled" : "";

  el.innerHTML = `
    <button class="btn" ${prevDisabled} id="btn-prev">Prev</button>
    <span style="margin:0 10px">Trang ${page}/${totalPages}</span>
    <button class="btn" ${nextDisabled} id="btn-next">Next</button>
  `;

  const prev = document.getElementById("btn-prev");
  const next = document.getElementById("btn-next");
  if (prev) prev.onclick = () => loadFeed(CURRENT_SORT, Math.max(1, page - 1));
  if (next) next.onclick = () => loadFeed(CURRENT_SORT, Math.min(totalPages, page + 1));
}
