import {
  database,
  ref,
  set,
  push,
  onValue,
  remove,
  update,
} from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const trainersTableBody = document.getElementById("trainers-table-body");
  const noTrainersMsg = document.getElementById("trainers-empty-msg");
  const addTrainerBtn = document.getElementById("trainers-add-btn");
  const addTrainerModal = document.getElementById("trainers-modal");
  const closeTrainerModal = document.getElementById("trainers-close-modal");
  const addTrainerForm = document.getElementById("trainers-form");
  const trainerModalTitle = document.getElementById("trainers-modal-title");
  const searchTrainersInput = document.getElementById("trainers-search-input");
  const viewTrainerModal = document.getElementById("trainers-view-modal");
  const closeViewTrainer = document.getElementById("trainers-close-view");
  const viewTrainerContent = document.getElementById("trainers-view-content");
  const prevBtn = document.getElementById("trainers-prev-btn");
  const nextBtn = document.getElementById("trainers-next-btn");
  const toastContainer = document.getElementById("trainers-toast-container");
  const trainersTableHead = document.getElementById("trainers-table-head");
  const trainersPaginationContainer = document.getElementById(
    "trainers-pagination-container"
  );
  const confirmDeleteModal = document.getElementById(
    "trainers-confirm-delete-modal"
  );
  const confirmDeleteBtn = document.getElementById(
    "trainers-confirm-delete-btn"
  );
  const cancelDeleteBtn = document.getElementById("trainers-cancel-delete-btn");
  const passwordInput = document.getElementById("trainers-password");
  const togglePasswordBtn = document.getElementById("trainers-toggle-password");
  const dobInput = document.getElementById("trainers-dob");

  // State variables
  let trainers = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let isEditing = false;
  let currentEditId = null;
  let trainerToDelete = null;
  const trainersRef = ref(database, "trainers");

  // Initialize
  setupEventListeners();
  loadTrainers();

  // Functions
  function setupEventListeners() {
    // Modal controls
    addTrainerBtn.addEventListener("click", () => openAddTrainerModal(false));
    closeTrainerModal.addEventListener("click", closeAddTrainerModal);
    closeViewTrainer.addEventListener("click", () =>
      viewTrainerModal.classList.add("hidden")
    );

    // Delete confirmation modal
    confirmDeleteBtn.addEventListener("click", confirmDelete);
    cancelDeleteBtn.addEventListener("click", closeDeleteModal);

    // Form submission
    addTrainerForm.addEventListener("submit", handleFormSubmit);

    // Search functionality
    searchTrainersInput.addEventListener("input", () => {
      currentPage = 1;
      renderTrainersTable();
    });

    // Pagination
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTrainersTable();
      }
    });

    nextBtn.addEventListener("click", () => {
      const filteredTrainers = getFilteredTrainers();
      if (currentPage * itemsPerPage < filteredTrainers.length) {
        currentPage++;
        renderTrainersTable();
      }
    });

    // Password toggle
    togglePasswordBtn.addEventListener("click", togglePasswordVisibility);

    // Date of Birth validation
    dobInput.addEventListener("change", validateDOB);

    // Form validation listeners
    document
      .getElementById("trainers-name")
      .addEventListener("input", validateName);
    document
      .getElementById("trainers-email")
      .addEventListener("blur", validateEmail);
    document
      .getElementById("trainers-mobile")
      .addEventListener("input", validateMobile);
    document
      .getElementById("trainers-experience")
      .addEventListener("input", validateExperience);
    document
      .getElementById("trainers-salary")
      .addEventListener("input", validateSalary);
    document
      .getElementById("trainers-joined")
      .addEventListener("change", validateJoinedDate);
    document
      .getElementById("trainers-password")
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

  function calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  // Validation functions
  function validateName() {
    const input = document.getElementById("trainers-name");
    const error = document.getElementById("trainers-name-error");
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
    const input = document.getElementById("trainers-email");
    const error = document.getElementById("trainers-email-error");
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

  function validateMobile() {
    const input = document.getElementById("trainers-mobile");
    const error = document.getElementById("trainers-mobile-error");
    const mobile = input.value.trim();
    const mobileRegex = /^[0-9]{10}$/;

    if (!mobileRegex.test(mobile)) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
      return false;
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
      return true;
    }
  }

  function validateDOB() {
    const input = document.getElementById("trainers-dob");
    const error = document.getElementById("trainers-dob-error");
    const dob = input.value;

    if (!dob) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
      return false;
    }

    const age = calculateAge(dob);
    const isValid = age >= 18;

    if (!isValid) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  function validateExperience() {
    const input = document.getElementById("trainers-experience");
    const error = document.getElementById("trainers-experience-error");
    const value = parseInt(input.value);
    const isValid = !isNaN(value) && value >= 0 && value <= 50;

    if (!isValid) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  function validateSalary() {
    const input = document.getElementById("trainers-salary");
    const error = document.getElementById("trainers-salary-error");
    const value = parseFloat(input.value);
    const isValid = !isNaN(value) && value >= 0;

    if (!isValid) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  function validateJoinedDate() {
    const input = document.getElementById("trainers-joined");
    const error = document.getElementById("trainers-joined-error");
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

  function validatePassword() {
    const input = document.getElementById("trainers-password");
    const error = document.getElementById("trainers-password-error");
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

  function validateForm() {
    let isValid = true;

    if (!validateName()) isValid = false;
    if (!validateEmail()) isValid = false;
    if (!validateMobile()) isValid = false;
    if (!validateDOB()) isValid = false;
    if (!validateExperience()) isValid = false;
    if (!validateSalary()) isValid = false;
    if (!validateJoinedDate()) isValid = false;
    if (!validatePassword()) isValid = false;

    return isValid;
  }

  function loadTrainers() {
    onValue(trainersRef, (snapshot) => {
      const data = snapshot.val();
      trainers = data
        ? Object.entries(data).map(([id, trainer]) => ({ id, ...trainer }))
        : [];
      renderTrainersTable();
      // Ensure delete modal is hidden when data reloads
      closeDeleteModal();
    });
  }

  function openAddTrainerModal(editing, trainerId = null) {
    isEditing = editing;
    currentEditId = trainerId;

    if (editing && trainerId) {
      trainerModalTitle.textContent = "Edit Trainer";
      const trainer = trainers.find((t) => t.id === trainerId);
      if (trainer) {
        document.getElementById("trainers-name").value = trainer.name;
        document.getElementById("trainers-email").value = trainer.email;
        document.getElementById("trainers-mobile").value = trainer.mobile;
        document.getElementById("trainers-address").value =
          trainer.address || "";
        document.getElementById("trainers-dob").value = trainer.dob;

        // Set gender radio button
        const genderRadios = document.getElementsByName("trainers-gender");
        for (const radio of genderRadios) {
          if (radio.value === trainer.gender) {
            radio.checked = true;
            break;
          }
        }

        document.getElementById("trainers-experience").value =
          trainer.experience;
        document.getElementById("trainers-salary").value = trainer.salary;
        document.getElementById("trainers-joined").value = trainer.joinedDate;
        document.getElementById("trainers-shift").value = trainer.shift;
        document.getElementById("trainers-password").value = trainer.password;
      }
    } else {
      trainerModalTitle.textContent = "Add Trainer";
      addTrainerForm.reset();
      // Set default gender to Male
      document.querySelector(
        'input[name="trainers-gender"][value="Male"]'
      ).checked = true;
    }

    addTrainerModal.classList.remove("hidden");
  }

  function closeAddTrainerModal() {
    addTrainerModal.classList.add("hidden");
    isEditing = false;
    currentEditId = null;
    addTrainerForm.reset();
    // Reset password visibility
    passwordInput.setAttribute("type", "password");
    togglePasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
    // Clear validation errors
    document
      .querySelectorAll(".border-red-500")
      .forEach((el) => el.classList.remove("border-red-500"));
    document
      .querySelectorAll('[id$="-error"]')
      .forEach((el) => el.classList.add("hidden"));
  }

  function closeDeleteModal() {
    confirmDeleteModal.classList.add("hidden");
    trainerToDelete = null;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Please fix the form errors before submitting", "error");
      return;
    }

    const formData = {
      name: document.getElementById("trainers-name").value.trim(),
      email: document.getElementById("trainers-email").value.trim(),
      mobile: document.getElementById("trainers-mobile").value.trim(),
      address: document.getElementById("trainers-address").value.trim(),
      dob: document.getElementById("trainers-dob").value,
      gender: document.querySelector('input[name="trainers-gender"]:checked')
        .value,
      experience: document.getElementById("trainers-experience").value,
      salary: document.getElementById("trainers-salary").value,
      joinedDate: document.getElementById("trainers-joined").value,
      shift: document.getElementById("trainers-shift").value,
      password: document.getElementById("trainers-password").value,
      trainers_uid: "", // Will be set below
    };

    try {
      if (isEditing && currentEditId) {
        formData.trainers_uid = currentEditId;
        const trainerRef = ref(database, `trainers/${currentEditId}`);
        await update(trainerRef, formData);
        showToast("Trainer updated successfully", "success");
      } else {
        const newTrainerRef = push(trainersRef);
        formData.trainers_uid = newTrainerRef.key;
        await set(newTrainerRef, formData);
        showToast("Trainer added successfully", "success");
      }

      closeAddTrainerModal();
    } catch (error) {
      console.error("Error saving trainer:", error);
      showToast("Failed to save trainer", "error");
    }
  }

  function showDeleteConfirmation(trainerId) {
    trainerToDelete = trainerId;
    confirmDeleteModal.classList.remove("hidden");
  }

  async function confirmDelete() {
    if (!trainerToDelete) return;

    try {
      const trainerRef = ref(database, `trainers/${trainerToDelete}`);
      await remove(trainerRef);
      showToast("Trainer deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting trainer:", error);
      showToast("Failed to delete trainer", "error");
    }

    closeDeleteModal();
  }

  function getFilteredTrainers() {
    const searchTerm = searchTrainersInput.value.toLowerCase();
    if (!searchTerm) return trainers;

    return trainers.filter(
      (trainer) =>
        trainer.name.toLowerCase().includes(searchTerm) ||
        trainer.email.toLowerCase().includes(searchTerm) ||
        trainer.mobile.toLowerCase().includes(searchTerm)
    );
  }

  function renderTrainersTable() {
    const filteredTrainers = getFilteredTrainers();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTrainers = filteredTrainers.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    trainersTableBody.innerHTML = "";

    if (filteredTrainers.length === 0) {
      noTrainersMsg.classList.remove("hidden");
      trainersTableHead.classList.add("hidden");
      trainersPaginationContainer.classList.add("hidden");
    } else {
      noTrainersMsg.classList.add("hidden");
      trainersTableHead.classList.remove("hidden");
      trainersPaginationContainer.classList.remove("hidden");

      paginatedTrainers.forEach((trainer) => {
        const row = document.createElement("tr");
        row.className = "border-b border-gray-700 hover:bg-gray-700";
        row.innerHTML = `
          <td class="px-3 py-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                ${trainer.name.charAt(0).toUpperCase()}
              </div>
              <span>${trainer.name}</span>
            </div>
          </td>
          <td class="px-3 py-3">${trainer.gender}</td>
          <td class="px-3 py-3">${trainer.experience} year/s</td>
          <td class="px-3 py-3">${trainer.mobile}</td>
          <td class="px-3 py-3">${trainer.shift}</td>
          <td class="px-3 py-3">
            <div class="flex gap-2">
              <button class="view-btn p-1 text-indigo-400 hover:text-indigo-300" data-id="${
                trainer.id
              }">
                <i class="fas fa-eye"></i>
              </button>
              <button class="edit-btn p-1 text-blue-400 hover:text-blue-300" data-id="${
                trainer.id
              }">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-btn p-1 text-red-400 hover:text-red-300" data-id="${
                trainer.id
              }">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        trainersTableBody.appendChild(row);
      });

      document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          viewTrainer(e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          openAddTrainerModal(true, e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          showDeleteConfirmation(e.target.closest("button").dataset.id)
        );
      });
    }

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage * itemsPerPage >= filteredTrainers.length;
  }

  function viewTrainer(trainerId) {
    const trainer = trainers.find((t) => t.id === trainerId);
    if (!trainer) return;

    let passwordVisible = false;

    viewTrainerContent.innerHTML = `
      <div class="flex justify-center mb-4">
        <div class="w-32 h-32 rounded-full bg-indigo-500 flex items-center justify-center text-white text-4xl">
          ${trainer.name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div class="space-y-4">
        <div>
          <p class="text-gray-400">Full Name</p>
          <p class="font-medium">${trainer.name}</p>
        </div>
        <div>
          <p class="text-gray-400">Email</p>
          <p class="font-medium">${trainer.email}</p>
        </div>
        <div>
          <p class="text-gray-400">Mobile</p>
          <p class="font-medium">${trainer.mobile}</p>
        </div>
        <div>
          <p class="text-gray-400">Address</p>
          <p class="font-medium">${trainer.address || "--"}</p>
        </div>
        <div>
          <p class="text-gray-400">Date of Birth</p>
          <p class="font-medium">${trainer.dob || "--"}</p>
        </div>
        <div>
          <p class="text-gray-400">Gender</p>
          <p class="font-medium">${trainer.gender}</p>
        </div>
        <div>
          <p class="text-gray-400">Experience</p>
          <p class="font-medium">${trainer.experience} year/s</p>
        </div>
        <div>
          <p class="text-gray-400">Salary</p>
          <p class="font-medium">₹${trainer.salary}</p>
        </div>
        <div>
          <p class="text-gray-400">Joined Date</p>
          <p class="font-medium">${new Date(
            trainer.joinedDate
          ).toLocaleDateString()}</p>
        </div>
        <div>
          <p class="text-gray-400">Shift</p>
          <p class="font-medium">${trainer.shift}</p>
        </div>
        <div>
          <p class="text-gray-400">Password</p>
          <div class="flex items-center gap-2">
            <p class="font-medium" id="view-password">${"•".repeat(
              trainer.password.length
            )}</p>
            <button id="toggle-view-password" class="text-gray-400 hover:text-white">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    document
      .getElementById("toggle-view-password")
      .addEventListener("click", function () {
        passwordVisible = !passwordVisible;
        const passwordElement = document.getElementById("view-password");
        passwordElement.textContent = passwordVisible
          ? trainer.password
          : "•".repeat(trainer.password.length);
        this.innerHTML = passwordVisible
          ? '<i class="fas fa-eye-slash"></i>'
          : '<i class="fas fa-eye"></i>';
      });

    viewTrainerModal.classList.remove("hidden");
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast p-4 rounded-lg shadow-lg text-white flex items-center justify-between ${getToastClass(
      type
    )}`;
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <i class="${getToastIcon(type)}"></i>
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

  function getToastClass(type) {
    switch (type) {
      case "success":
        return "bg-green-600";
      case "error":
        return "bg-red-600";
      case "warning":
        return "bg-yellow-600";
      case "info":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
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
      case "info":
        return "fas fa-info-circle";
      default:
        return "fas fa-bell";
    }
  }
});
