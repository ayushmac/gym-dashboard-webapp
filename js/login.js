import { database, ref, get } from "./firebase-config.js";

// On page load, set admin tab
document.addEventListener("DOMContentLoaded", () => switchTab("admin"));

// Tab switching
window.switchTab = function (tab) {
  document
    .querySelectorAll(".login-form")
    .forEach((form) => form.classList.add("hidden"));
  document.querySelectorAll('[id$="-tab"]').forEach((el) => {
    el.classList.remove("border-blue-500", "text-blue-400");
    el.classList.add("border-transparent", "text-gray-400");
  });

  document.getElementById(`${tab}-form`).classList.remove("hidden");
  const tabEl = document.getElementById(`${tab}-tab`);
  tabEl.classList.add("border-blue-500", "text-blue-400");
  tabEl.classList.remove("border-transparent", "text-gray-400");
};

// Toast utility
window.showToast = function (message, type = "info") {
  const toast = document.getElementById("toast");
  const toastBox = document.getElementById("toast-box");
  const toastIcon = document.getElementById("toast-icon");
  const toastMessage = document.getElementById("toast-message");

  toastMessage.textContent = message;

  // Styling
  if (type === "error") {
    toastBox.classList.replace("border-l-4", "border-l-4");
    toastBox.classList.add("border-red-500");
    toastIcon.className = "fas fa-exclamation-circle text-red-500 mt-1 mr-2";
  } else if (type === "success") {
    toastBox.classList.replace("border-l-4", "border-l-4");
    toastBox.classList.add("border-green-500");
    toastIcon.className = "fas fa-check-circle text-green-500 mt-1 mr-2";
  } else {
    toastBox.classList.replace("border-l-4", "border-l-4");
    toastBox.classList.add("border-blue-500");
    toastIcon.className = "fas fa-info-circle text-blue-500 mt-1 mr-2";
  }

  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 4000);
};

window.hideToast = () =>
  document.getElementById("toast").classList.add("hidden");

function toggleLoader(show) {
  document.getElementById("loader").classList.toggle("hidden", !show);
}

// Admin Login
document.getElementById("admin-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-password").value;
  toggleLoader(true);
  validateAdminLogin(email, password);
});

function validateAdminLogin(email, password) {
  const loginRef = ref(database, "/admin/login");

  get(loginRef)
    .then((snapshot) => {
      toggleLoader(false);

      if (snapshot.exists()) {
        const credentials = snapshot.val();
        if (credentials.email === email && credentials.password === password) {
          // 🔹 remember auth
          localStorage.setItem("isAdminAuth", "true");
          showToast("Login successful! Redirecting...", "success");
          setTimeout(() => {
            window.location.href = "/dashboard/admindashboard.html";
          }, 1500);
        } else {
          showToast("Invalid credentials. Please try again.", "error");
        }
      } else {
        showToast("No admin credentials found in database.", "error");
      }
    })
    .catch((error) => {
      toggleLoader(false);
      console.error(error);
      showToast("An error occurred. Please try again later.", "error");
    });
}

// Placeholder for member/trainer
document.getElementById("member-form").addEventListener("submit", (e) => {
  e.preventDefault();
  showToast("Member login functionality coming soon!", "info");
});
document.getElementById("trainer-form").addEventListener("submit", (e) => {
  e.preventDefault();
  showToast("Trainer login functionality coming soon!", "info");
});
