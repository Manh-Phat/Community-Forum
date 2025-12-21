// js/profile.js
document.addEventListener("DOMContentLoaded", async () => {
  renderNavUser();

  if (!getToken()) {
    alert("Bạn chưa đăng nhập!");
    location.href = "login.html";
    return;
  }

  try {
    const me = await loadMeToStorage();
    fill(me);
  } catch (err) {
    if (err.message === "UNAUTHORIZED") {
      clearToken();
      location.href = "login.html";
      return;
    }
    alert("Không tải được profile: " + err.message);
  }

  const btn = document.getElementById("saveProfileBtn");
  if (btn) btn.addEventListener("click", save);
});

function fill(me) {
  setVal("inputName", me.display_name || "");
  setVal("inputJob", me.job_title || "");
  setVal("inputBio", me.bio || "");
  setVal("inputFacebook", me.facebook_url || "");
  setVal("inputAvatar", me.avatar_url || "");

  const img = document.getElementById("avatarImg");
  if (img) img.src = me.avatar_url || "https://i.pravatar.cc/150?img=3";
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? "";
}

async function save() {
  const payload = {
    display_name: (document.getElementById("inputName")?.value || "").trim() || null,
    job_title: (document.getElementById("inputJob")?.value || "").trim() || null,
    bio: (document.getElementById("inputBio")?.value || "").trim() || null,
    facebook_url: (document.getElementById("inputFacebook")?.value || "").trim() || null,
    avatar_url: (document.getElementById("inputAvatar")?.value || "").trim() || null,
  };

  try {
    const me = await apiFetch("/users/me", { method: "PUT", body: JSON.stringify(payload) });
    localStorage.setItem("user_info", JSON.stringify(me));
    renderNavUser();
    fill(me);
    alert("Lưu profile thành công!");
  } catch (err) {
    alert("Lưu profile lỗi: " + err.message);
  }
}
