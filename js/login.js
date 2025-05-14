import { database, ref, get } from "./firebase-config.js";

// DOM Elements
const adminForm = document.getElementById("admin-form");
const togglePasswordBtn = document.getElementById("toggle-password");
const passwordInput = document.getElementById("admin-password");
const loader = document.getElementById("loader");

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  // Check if already logged in
  if (localStorage.getItem("isAdminAuth") === "true") {
    window.location.href = "/dashboard/admindashboard.html";
  }
});

// Toggle password visibility
togglePasswordBtn.addEventListener("click", () => {
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);

  // Toggle eye icon
  const eyeIcon = togglePasswordBtn.querySelector("i");
  eyeIcon.classList.toggle("fa-eye");
  eyeIcon.classList.toggle("fa-eye-slash");
});

// Show toast notification
const showToast = (message, type = "info") => {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast p-4 rounded-lg shadow-lg text-white flex items-center justify-between  ${getToastClass(
    type
  )}`;
  toast.innerHTML = `
    <div class="flex items-center gap-4">
      <i class="${getToastIcon(type)}"></i>
      <span class="text-sm"> ${message}</span>
   
    <button class="toast-close ml-4">
      <i class="fas fa-times"></i>
    </button> </div>
  `;

  toastContainer.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.classList.add("opacity-0", "transition-opacity", "duration-300");
    setTimeout(() => toast.remove(), 300);
  }, 5000);

  // Close button
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.classList.add("opacity-0", "transition-opacity", "duration-300");
    setTimeout(() => toast.remove(), 300);
  });
};

const getToastClass = (type) => {
  switch (type) {
    case "success":
      return "bg-green-600";
    case "error":
      return "bg-red-600";
    case "warning":
      return "bg-yellow-600";
    default:
      return "bg-indigo-600";
  }
};

const getToastIcon = (type) => {
  switch (type) {
    case "success":
      return "fas fa-check-circle";
    case "error":
      return "fas fa-exclamation-circle";
    case "warning":
      return "fas fa-exclamation-triangle";
    default:
      return "fas fa-info-circle";
  }
};

// Toggle loader
const toggleLoader = (show) => {
  loader.classList.toggle("hidden", !show);
  document.body.style.overflow = show ? "hidden" : "";
};

// Form submission
adminForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value.trim();

  if (!email || !password) {
    showToast("Please fill in all fields", "error");
    return;
  }

  toggleLoader(true);
  await validateAdminLogin(email, password);
});

// Validate admin login
async function validateAdminLogin(email, password) {
  try {
    const snapshot = await get(ref(database, "/admin/login"));
    toggleLoader(false);

    if (snapshot.exists()) {
      const credentials = snapshot.val();
      if (credentials.email === email && credentials.password === password) {
        localStorage.setItem("isAdminAuth", "true");
        showToast("Login successful! Redirecting...", "success");
        setTimeout(() => {
          window.location.href = "/dashboard/admindashboard.html";
        }, 1500);
      } else {
        showToast(" Invalid email or password", "error");
      }
    } else {
      showToast(" Admin credentials not found", "error");
    }
  } catch (error) {
    toggleLoader(false);
    console.error(" Login error:", error);
    showToast(" An error occurred. Please try again.", "error");
  }
}
