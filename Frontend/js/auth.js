// js/auth.js
// Dùng chung các hàm trong api.js: apiFetch, getToken, setToken, clearToken, loadMeToStorage, renderNavUser

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const logoutBtn = document.querySelector("[data-logout]");

  // ===== NAVBAR STATE =====
  initNavbarAuthState();

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearToken();
      document.body.classList.remove("logged-in");
      alert("Đã đăng xuất!");
      location.href = "index.html";
    });
  }

  // ===== LOGIN =====
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = (document.getElementById("username")?.value || "").trim();
      const password = document.getElementById("password")?.value || "";

      if (!username) return alert("Vui lòng nhập username!");
      if (!password) return alert("Vui lòng nhập mật khẩu!");

      try {
        const data = await apiFetch("/auth/login-json", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });

        setToken(data.access_token);
        await loadMeToStorage();

        document.body.classList.add("logged-in");
        renderNavUser();

        alert("Đăng nhập thành công!");
        location.href = "index.html";
      } catch (err) {
        alert("Đăng nhập lỗi: " + (err.message || "Unknown"));
      }
    });
  }

  // ===== REGISTER =====
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username =
        (document.getElementById("reg-username")?.value ||
          document.getElementById("fullname")?.value ||
          document.getElementById("username")?.value ||
          "").trim();

      const email =
        (document.getElementById("reg-email")?.value ||
          document.getElementById("email")?.value ||
          "").trim();

      const password =
        document.getElementById("reg-password")?.value ||
        document.getElementById("password")?.value ||
        "";

      const confirm =
        document.getElementById("reg-confirm-pass")?.value ||
        document.getElementById("confirm-password")?.value ||
        password;

      if (!username) return alert("Vui lòng nhập tên đăng nhập!");
      if (!email) return alert("Vui lòng nhập email!");
      if (password.length < 6) return alert("Mật khẩu tối thiểu 6 ký tự!");
      if (password !== confirm) return alert("Mật khẩu nhập lại không khớp!");

      try {
        await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({ username, email, password }),
        });

        const data = await apiFetch("/auth/login-json", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });

        setToken(data.access_token);
        await loadMeToStorage();

        document.body.classList.add("logged-in");
        renderNavUser();

        alert("Đăng ký thành công!");
        location.href = "index.html";
      } catch (err) {
        alert("Đăng ký lỗi: " + (err.message || "Unknown"));
      }
    });
  }
});

// ===== INIT NAVBAR WHEN LOAD PAGE =====
function initNavbarAuthState() {
  const token = getToken();
  if (token) {
    document.body.classList.add("logged-in");
    renderNavUser();
  } else {
    document.body.classList.remove("logged-in");
  }
}
