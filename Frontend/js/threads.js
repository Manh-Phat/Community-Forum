// js/threads.js (create-post)
document.addEventListener("DOMContentLoaded", () => {
  renderNavUser();

  const form = document.getElementById("create-post-form");
  if (!form) return;

  if (!getToken()) {
    alert("Bạn chưa đăng nhập!");
    location.href = "login.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = (document.getElementById("post-title")?.value || "").trim();
    const content = (document.getElementById("post-content")?.value || "").trim();
    const category = (document.getElementById("post-category")?.value || "").trim();
    const tagsRaw = (document.getElementById("post-tags")?.value || "").trim();

    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 10)
      : [];

    if (!title) return alert("Vui lòng nhập tiêu đề!");
    if (!content) return alert("Vui lòng nhập nội dung!");

    try {
      const payload = { title, content, category: category || null, tags };
      await apiFetch("/threads", { method: "POST", body: JSON.stringify(payload) });

      alert("Đăng bài thành công! (Bài của USER cần admin duyệt nếu chưa phải admin)");
      location.href = "index.html";
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        clearToken();
        location.href = "login.html";
        return;
      }
      alert("Đăng bài lỗi: " + (err.message || "Unknown"));
    }
  });
});
