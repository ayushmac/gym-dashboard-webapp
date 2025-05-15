import {
  database,
  ref,
  set,
  push,
  onValue,
  remove,
  update,
  get,
} from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const adminsTableBody = document.getElementById("admins-table-body");
  const noAdminsMsg = document.getElementById("admins-empty-msg");
  const addAdminBtn = document.getElementById("admins-add-btn");
  const adminModal = document.getElementById("admins-modal");
  const closeAdminModal = document.getElementById("admins-close-modal");
  const adminForm = document.getElementById("admins-form");
  const adminModalTitle = document.getElementById("admins-modal-title");
  const searchAdminsInput = document.getElementById("admins-search-input");
  const prevBtn = document.getElementById("admins-prev-btn");
  const nextBtn = document.getElementById("admins-next-btn");
  const toastContainer = document.getElementById("admins-toast-container");
  const adminsTableHead = document.getElementById("admins-table-head");
  const adminsPaginationContainer = document.getElementById(
    "admins-pagination-container"
  );
  const confirmDeleteModal = document.getElementById(
    "admins-confirm-delete-modal"
  );
  const confirmDeleteBtn = document.getElementById("admins-confirm-delete-btn");
  const cancelDeleteBtn = document.getElementById("admins-cancel-delete-btn");
  const passwordInput = document.getElementById("admins-password");
  const togglePasswordBtn = document.getElementById("admins-toggle-password");

  // State variables
  let admins = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let isEditing = false;
  let currentEditId = null;
  let adminToDelete = null;
  const adminsRef = ref(database, "admins");

  // Initialize
  setupEventListeners();
  loadAdmins();

  // Functions
  function setupEventListeners() {
    // Modal controls
    addAdminBtn.addEventListener("click", () => openAddAdminModal(false));
    closeAdminModal.addEventListener("click", closeAddAdminModal);

    // Delete confirmation modal
    confirmDeleteBtn.addEventListener("click", confirmDelete);
    cancelDeleteBtn.addEventListener("click", closeDeleteModal);

    // Form submission
    adminForm.addEventListener("submit", handleFormSubmit);

    // Search functionality
    searchAdminsInput.addEventListener("input", () => {
      currentPage = 1;
      renderAdminsTable();
    });

    // Pagination
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderAdminsTable();
      }
    });

    nextBtn.addEventListener("click", () => {
      const filteredAdmins = getFilteredAdmins();
      if (currentPage * itemsPerPage < filteredAdmins.length) {
        currentPage++;
        renderAdminsTable();
      }
    });

    // Password toggle
    togglePasswordBtn.addEventListener("click", togglePasswordVisibility);

    // Form validation listeners
    document
      .getElementById("admins-name")
      .addEventListener("input", validateName);
    document
      .getElementById("admins-email")
      .addEventListener("blur", validateEmail);
    document
      .getElementById("admins-phone")
      .addEventListener("input", validatePhone);
    document
      .getElementById("admins-username")
      .addEventListener("blur", checkUsernameExists);
    document
      .getElementById("admins-password")
      .addEventListener("blur", checkPasswordExists);
    document
      .getElementById("admins-username")
      .addEventListener("input", validateUsername);
    document
      .getElementById("admins-password")
      .addEventListener("input", validatePassword);
  }

  function togglePasswordVisibility() {
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    togglePasswordBtn.innerHTML =
      type === "password"
        ? '<i class="fas fa-eye"></i>'
        : '<i class="fas fa-eye-slash"></i>';
  }

  // Validation functions
  function validateName() {
    const input = document.getElementById("admins-name");
    const error = document.getElementById("admins-name-error");
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

  function validateEmail() {
    const input = document.getElementById("admins-email");
    const error = document.getElementById("admins-email-error");
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

  function validatePhone() {
    const input = document.getElementById("admins-phone");
    const error = document.getElementById("admins-phone-error");
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

  function validateUsername() {
    const input = document.getElementById("admins-username");
    const error = document.getElementById("admins-username-error");
    const isValid = input.value.trim().length >= 4;

    if (!isValid) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  function validatePassword() {
    const input = document.getElementById("admins-password");
    const error = document.getElementById("admins-password-error");
    const isValid = input.value.length >= 6;

    if (!isValid) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  async function checkUsernameExists() {
    const usernameInput = document.getElementById("admins-username");
    const username = usernameInput.value.trim();
    const error = document.getElementById("admins-username-exists-error");

    if (!username || username.length < 4) return false;

    // Skip check if we're editing the same admin
    if (isEditing && currentEditId) {
      const currentAdmin = admins.find((a) => a.id === currentEditId);
      if (currentAdmin && currentAdmin.username === username) {
        error.classList.add("hidden");
        return false;
      }
    }

    const exists = await checkFieldExists("username", username);

    if (exists) {
      error.classList.remove("hidden");
      usernameInput.classList.add("border-red-500");
      return true;
    } else {
      error.classList.add("hidden");
      usernameInput.classList.remove("border-red-500");
      return false;
    }
  }

  async function checkPasswordExists() {
    const passwordInput = document.getElementById("admins-password");
    const password = passwordInput.value;
    const error = document.getElementById("admins-password-exists-error");

    if (!password || password.length < 6) return false;

    // Skip check if we're editing the same admin
    if (isEditing && currentEditId) {
      const currentAdmin = admins.find((a) => a.id === currentEditId);
      if (currentAdmin && currentAdmin.password === password) {
        error.classList.add("hidden");
        return false;
      }
    }

    const exists = await checkFieldExists("password", password);

    if (exists) {
      error.classList.remove("hidden");
      passwordInput.classList.add("border-red-500");
      return true;
    } else {
      error.classList.add("hidden");
      passwordInput.classList.remove("border-red-500");
      return false;
    }
  }

  async function checkFieldExists(field, value) {
    if (!admins.length) return false;

    return admins.some((admin) => {
      // Skip the current admin being edited
      if (isEditing && currentEditId && admin.id === currentEditId) {
        return false;
      }
      return admin[field] === value;
    });
  }

  function validateForm() {
    let isValid = true;

    if (!validateName()) isValid = false;
    if (!validateEmail()) isValid = false;
    if (!validatePhone()) isValid = false;
    if (!validateUsername()) isValid = false;
    if (!validatePassword()) isValid = false;

    return isValid;
  }

  async function validateBeforeSubmit() {
    const basicValidation = validateForm();
    if (!basicValidation) return false;

    const usernameExists = await checkUsernameExists();
    const passwordExists = await checkPasswordExists();

    return !usernameExists && !passwordExists;
  }

  function loadAdmins() {
    onValue(adminsRef, (snapshot) => {
      const data = snapshot.val();
      admins = data
        ? Object.entries(data).map(([id, admin]) => ({ id, ...admin }))
        : [];
      renderAdminsTable();
      closeDeleteModal();
    });
  }

  function openAddAdminModal(editing, adminId = null) {
    isEditing = editing;
    currentEditId = adminId;

    if (editing && adminId) {
      adminModalTitle.textContent = "Edit Admin";
      const admin = admins.find((a) => a.id === adminId);
      if (admin) {
        document.getElementById("admins-name").value = admin.name;
        document.getElementById("admins-email").value = admin.email;
        document.getElementById("admins-phone").value = admin.phone;
        document.getElementById("admins-username").value = admin.username;
        document.getElementById("admins-password").value = admin.password;
      }
    } else {
      adminModalTitle.textContent = "Add Admin";
      adminForm.reset();
    }

    adminModal.classList.remove("hidden");
  }

  function closeAddAdminModal() {
    adminModal.classList.add("hidden");
    isEditing = false;
    currentEditId = null;
    adminForm.reset();
    passwordInput.setAttribute("type", "password");
    togglePasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
    document
      .querySelectorAll(".border-red-500")
      .forEach((el) => el.classList.remove("border-red-500"));
    document
      .querySelectorAll('[id$="-error"]')
      .forEach((el) => el.classList.add("hidden"));
  }

  function closeDeleteModal() {
    confirmDeleteModal.classList.add("hidden");
    adminToDelete = null;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const isValid = await validateBeforeSubmit();
    if (!isValid) {
      showToast("Please fix the form errors before submitting", "error");
      return;
    }

    const formData = {
      name: document.getElementById("admins-name").value.trim(),
      email: document.getElementById("admins-email").value.trim(),
      phone: document.getElementById("admins-phone").value.trim(),
      username: document.getElementById("admins-username").value.trim(),
      password: document.getElementById("admins-password").value,
      admin_uid: "", // Will be set below
    };

    try {
      if (isEditing && currentEditId) {
        formData.admin_uid = currentEditId;
        const adminRef = ref(database, `admins/${currentEditId}`);
        await update(adminRef, formData);
        showToast("Admin updated successfully", "success");
      } else {
        const newAdminRef = push(adminsRef);
        formData.admin_uid = newAdminRef.key;
        await set(newAdminRef, formData);
        showToast("Admin added successfully", "success");
      }

      closeAddAdminModal();
    } catch (error) {
      console.error("Error saving admin:", error);
      showToast("Failed to save admin", "error");
    }
  }

  function showDeleteConfirmation(adminId) {
    adminToDelete = adminId;
    confirmDeleteModal.classList.remove("hidden");
  }

  async function confirmDelete() {
    if (!adminToDelete) return;

    try {
      const adminRef = ref(database, `admins/${adminToDelete}`);
      await remove(adminRef);
      showToast("Admin deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting admin:", error);
      showToast("Failed to delete admin", "error");
    }

    closeDeleteModal();
  }

  function getFilteredAdmins() {
    const searchTerm = searchAdminsInput.value.toLowerCase();
    if (!searchTerm) return admins;

    return admins.filter(
      (admin) =>
        admin.name.toLowerCase().includes(searchTerm) ||
        admin.email.toLowerCase().includes(searchTerm) ||
        admin.username.toLowerCase().includes(searchTerm)
    );
  }

  function renderAdminsTable() {
    const filteredAdmins = getFilteredAdmins();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAdmins = filteredAdmins.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    adminsTableBody.innerHTML = "";

    if (filteredAdmins.length === 0) {
      noAdminsMsg.classList.remove("hidden");
      adminsTableHead.classList.add("hidden");
      adminsPaginationContainer.classList.add("hidden");
    } else {
      noAdminsMsg.classList.add("hidden");
      adminsTableHead.classList.remove("hidden");
      adminsPaginationContainer.classList.remove("hidden");

      paginatedAdmins.forEach((admin) => {
        const row = document.createElement("tr");
        row.className = "border-b border-gray-700 hover:bg-gray-700";
        row.innerHTML = `
          <td class="px-3 py-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                ${admin.name.charAt(0).toUpperCase()}
              </div>
              <span>${admin.name}</span>
            </div>
          </td>
          <td class="px-3 py-3">${admin.email}</td>
          <td class="px-3 py-3">${admin.phone}</td>
          <td class="px-3 py-3">${admin.username}</td>
          <td class="px-3 py-3">
            <div class="flex items-center gap-2">
              <span class="password-display">${"•".repeat(
                admin.password.length
              )}</span>
              <button class="toggle-password-btn text-indigo-400 hover:text-indigo-300" data-password="${
                admin.password
              }">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </td>
          <td class="px-3 py-3">
            <div class="flex gap-2">
              <button class="edit-btn p-1 text-blue-400 hover:text-blue-300" data-id="${
                admin.id
              }">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-btn p-1 text-red-400 hover:text-red-300" data-id="${
                admin.id
              }">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        adminsTableBody.appendChild(row);
      });

      // Add event listeners for password toggle buttons
      document.querySelectorAll(".toggle-password-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const passwordDisplay = this.previousElementSibling;
          const password = this.dataset.password;

          if (passwordDisplay.textContent === "•".repeat(password.length)) {
            passwordDisplay.textContent = password;
            this.innerHTML = '<i class="fas fa-eye-slash"></i>';
          } else {
            passwordDisplay.textContent = "•".repeat(password.length);
            this.innerHTML = '<i class="fas fa-eye"></i>';
          }
        });
      });

      // Add event listeners for edit buttons
      document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          openAddAdminModal(true, e.target.closest("button").dataset.id)
        );
      });

      // Add event listeners for delete buttons
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          showDeleteConfirmation(e.target.closest("button").dataset.id)
        );
      });
    }

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage * itemsPerPage >= filteredAdmins.length;
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast p-4 rounded-lg shadow-lg text-white flex items-center justify-between ${
      type === "success"
        ? "bg-green-600"
        : type === "error"
        ? "bg-red-600"
        : type === "warning"
        ? "bg-yellow-600"
        : "bg-blue-600"
    }`;
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <i class="${
          type === "success"
            ? "fas fa-check-circle"
            : type === "error"
            ? "fas fa-exclamation-circle"
            : type === "warning"
            ? "fas fa-exclamation-triangle"
            : "fas fa-info-circle"
        }"></i>
        <span>${message}</span>
      </div>
      <button class="toast-close ml-4">
        <i class="fas fa-times"></i>
      </button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => toast.remove(), 300);
    }, 5000);

    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => toast.remove(), 300);
    });
  }
});
