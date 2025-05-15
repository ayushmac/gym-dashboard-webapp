import { database, ref, get, push, set } from "./firebase-config.js";

// DOM Elements
const adminForm = document.getElementById("admin-form");
const togglePasswordBtn = document.getElementById("toggle-password");
const passwordInput = document.getElementById("admin-password");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loader-text");
const registerBtn = document.getElementById("register-admin-btn");
const registerModal = document.getElementById("register-modal");
const registerCloseBtn = document.getElementById("register-close-btn");
const registerForm = document.getElementById("register-form");
const toggleRegisterPasswordBtn = document.getElementById(
  "toggle-register-password"
);
const registerPasswordInput = document.getElementById("register-password");

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  // Check if already logged in
  if (localStorage.getItem("isAdminAuth") === "true") {
    window.location.href = "/dashboard/admindashboard.html";
  }

  // Setup event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Toggle password visibility in login form
  togglePasswordBtn.addEventListener("click", () => {
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);

    // Toggle eye icon
    const eyeIcon = togglePasswordBtn.querySelector("i");
    eyeIcon.classList.toggle("fa-eye");
    eyeIcon.classList.toggle("fa-eye-slash");
  });

  // Toggle password visibility in register form
  toggleRegisterPasswordBtn.addEventListener("click", () => {
    const type =
      registerPasswordInput.getAttribute("type") === "password"
        ? "text"
        : "password";
    registerPasswordInput.setAttribute("type", type);

    // Toggle eye icon
    const eyeIcon = toggleRegisterPasswordBtn.querySelector("i");
    eyeIcon.classList.toggle("fa-eye");
    eyeIcon.classList.toggle("fa-eye-slash");
  });

  // Registration modal
  registerBtn.addEventListener("click", () =>
    registerModal.classList.remove("hidden")
  );
  registerCloseBtn.addEventListener("click", () => {
    registerModal.classList.add("hidden");
    registerForm.reset();
    clearRegisterErrors();
  });

  // Registration form validation
  document
    .getElementById("register-name")
    .addEventListener("input", validateRegisterName);
  document
    .getElementById("register-username")
    .addEventListener("input", validateRegisterUsername);
  document
    .getElementById("register-password")
    .addEventListener("input", validateRegisterPassword);
  document
    .getElementById("register-email")
    .addEventListener("blur", validateRegisterEmail);
  document
    .getElementById("register-phone")
    .addEventListener("input", validateRegisterPhone);

  // Login form validation
  document
    .getElementById("admin-username")
    .addEventListener("input", validateLoginUsername);
  document
    .getElementById("admin-password")
    .addEventListener("input", validateLoginPassword);

  // Form submissions
  adminForm.addEventListener("submit", handleAdminLogin);
  registerForm.addEventListener("submit", handleAdminRegistration);
}

function clearRegisterErrors() {
  document.querySelectorAll("[id$='-error']").forEach((el) => {
    el.classList.add("hidden");
    const inputId = el.id.replace("-error", "");
    const input = document.getElementById(inputId);
    if (input) input.classList.remove("border-red-500");
  });
}

// Login form validation
function validateLoginUsername() {
  const input = document.getElementById("admin-username");
  const error = document.getElementById("login-username-error");
  const isValid = input.value.trim().length > 0;

  if (!isValid) {
    error.classList.remove("hidden");
    input.classList.add("border-red-500");
  } else {
    error.classList.add("hidden");
    input.classList.remove("border-red-500");
  }
  return isValid;
}

function validateLoginPassword() {
  const input = document.getElementById("admin-password");
  const error = document.getElementById("login-password-error");
  const isValid = input.value.trim().length > 0;

  if (!isValid) {
    error.classList.remove("hidden");
    input.classList.add("border-red-500");
  } else {
    error.classList.add("hidden");
    input.classList.remove("border-red-500");
  }
  return isValid;
}

// Validation functions for registration form
function validateRegisterName() {
  const input = document.getElementById("register-name");
  const error = document.getElementById("register-name-error");
  const isValid =
    input.value.trim().length > 0 && /^[A-Za-z ]+$/.test(input.value.trim());

  if (!isValid) {
    error.classList.remove("hidden");
    input.classList.add("border-red-500");
  } else {
    error.classList.add("hidden");
    input.classList.remove("border-red-500");
  }
  return isValid;
}

function validateRegisterUsername() {
  const input = document.getElementById("register-username");
  const error = document.getElementById("register-username-error");
  const existsError = document.getElementById("register-username-exists-error");
  const isValid = input.value.trim().length >= 4;

  if (!isValid) {
    error.classList.remove("hidden");
    existsError.classList.add("hidden");
    input.classList.add("border-red-500");
  } else {
    error.classList.add("hidden");
    existsError.classList.add("hidden");
    input.classList.remove("border-red-500");
  }
  return isValid;
}

function validateRegisterPassword() {
  const input = document.getElementById("register-password");
  const error = document.getElementById("register-password-error");
  const existsError = document.getElementById("register-password-exists-error");
  const isValid = input.value.trim().length >= 6;

  if (!isValid) {
    error.classList.remove("hidden");
    existsError.classList.add("hidden");
    input.classList.add("border-red-500");
  } else {
    error.classList.add("hidden");
    existsError.classList.add("hidden");
    input.classList.remove("border-red-500");
  }
  return isValid;
}

function validateRegisterEmail() {
  const input = document.getElementById("register-email");
  const error = document.getElementById("register-email-error");
  const email = input.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    error.classList.remove("hidden");
    input.classList.add("border-red-500");
    return false;
  } else {
    error.classList.add("hidden");
    input.classList.remove("border-red-500");
    return true;
  }
}

function validateRegisterPhone() {
  const input = document.getElementById("register-phone");
  const error = document.getElementById("register-phone-error");
  const phone = input.value.trim();
  const phoneRegex = /^[0-9]{10}$/;

  if (!phoneRegex.test(phone)) {
    error.classList.remove("hidden");
    input.classList.add("border-red-500");
    return false;
  } else {
    error.classList.add("hidden");
    input.classList.remove("border-red-500");
    return true;
  }
}

function validateRegisterForm() {
  let isValid = true;

  if (!validateRegisterName()) isValid = false;
  if (!validateRegisterUsername()) isValid = false;
  if (!validateRegisterPassword()) isValid = false;
  if (!validateRegisterEmail()) isValid = false;
  if (!validateRegisterPhone()) isValid = false;

  return isValid;
}

function validateLoginForm() {
  let isValid = true;

  if (!validateLoginUsername()) isValid = false;
  if (!validateLoginPassword()) isValid = false;

  return isValid;
}

// Show toast notification
function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast p-4 rounded-lg shadow-lg text-white flex items-center justify-between ${getToastClass(
    type
  )}`;
  toast.innerHTML = `
    <div class="flex items-center gap-4">
      <i class="${getToastIcon(type)}"></i>
      <span class="text-sm"> ${message}</span>
    </div>
    <button class="cursor-pointer toast-close ml-4">
      <i class="fas fa-times"></i>
    </button>
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
}

function getToastClass(type) {
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
}

function getToastIcon(type) {
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
}

// Toggle loader
function toggleLoader(show, text = "Processing...") {
  loaderText.textContent = text;
  loader.classList.toggle("hidden", !show);
  document.body.style.overflow = show ? "hidden" : "";
}

// Handle admin login
async function handleAdminLogin(e) {
  e.preventDefault();

  if (!validateLoginForm()) {
    showToast("Please fix the form errors before submitting", "error");
    return;
  }

  const username = document.getElementById("admin-username").value.trim();
  const password = document.getElementById("admin-password").value.trim();

  toggleLoader(true, "Authenticating...");
  await validateAdminLogin(username, password);
}

// Validate admin login
async function validateAdminLogin(username, password) {
  try {
    const adminsRef = ref(database, "admins");
    const snapshot = await get(adminsRef);
    toggleLoader(false);

    if (snapshot.exists()) {
      const admins = snapshot.val();
      let authenticated = false;
      let adminId = null;

      // Check each admin for matching credentials
      Object.entries(admins).forEach(([id, admin]) => {
        if (admin.username === username && admin.password === password) {
          authenticated = true;
          adminId = id;
        }
      });

      if (authenticated) {
        localStorage.setItem("isAdminAuth", "true");
        localStorage.setItem("admin_uid", adminId);
        showToast("Login successful! Redirecting...", "success");
        setTimeout(() => {
          window.location.href = "/dashboard/admindashboard.html";
        }, 1500);
      } else {
        showToast("Invalid username or password", "error");
      }
    } else {
      showToast("No admin accounts found", "error");
    }
  } catch (error) {
    toggleLoader(false);
    console.error("Login error:", error);
    showToast("An error occurred. Please try again.", "error");
  }
}

// Handle admin registration
async function handleAdminRegistration(e) {
  e.preventDefault();

  if (!validateRegisterForm()) {
    return;
  }

  const name = document.getElementById("register-name").value.trim();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const phone = document.getElementById("register-phone").value.trim();

  toggleLoader(true, "Creating your account...");

  try {
    // Check if username already exists
    const adminsRef = ref(database, "admins");
    const snapshot = await get(adminsRef);

    if (snapshot.exists()) {
      const admins = snapshot.val();

      // Check for existing username
      const usernameExists = Object.values(admins).some(
        (admin) => admin.username === username
      );

      if (usernameExists) {
        document
          .getElementById("register-username-exists-error")
          .classList.remove("hidden");
        document
          .getElementById("register-username")
          .classList.add("border-red-500");
        toggleLoader(false);
        return;
      }

      // Check for existing password (optional)
      const passwordExists = Object.values(admins).some(
        (admin) => admin.password === password
      );

      if (passwordExists) {
        document
          .getElementById("register-password-exists-error")
          .classList.remove("hidden");
        document
          .getElementById("register-password")
          .classList.add("border-red-500");
        toggleLoader(false);
        return;
      }
    }

    // Create admin data
    const adminData = {
      name,
      username,
      password,
      email,
      phone,
    };

    // Save to database
    const newAdminRef = push(adminsRef);
    await set(newAdminRef, adminData);

    // Store the UID
    const adminUid = newAdminRef.key;
    await set(ref(database, `admins/${adminUid}/admin_uid`), adminUid);

    toggleLoader(false);
    registerModal.classList.add("hidden");
    showToast("Account created successfully! You can now login.", "success");
    registerForm.reset();
  } catch (error) {
    toggleLoader(false);
    console.error("Registration error:", error);
    showToast("Failed to create account. Please try again.", "error");
  }
}
