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
  const staffTableBody = document.getElementById("staff-table-body");
  const staffEmptyMsg = document.getElementById("staff-empty-msg");
  const staffAddBtn = document.getElementById("staff-add-btn");
  const staffModal = document.getElementById("staff-modal");
  const staffCloseModal = document.getElementById("staff-close-modal");
  const staffForm = document.getElementById("staff-form");
  const staffModalTitle = document.getElementById("staff-modal-title");
  const staffSearchInput = document.getElementById("staff-search-input");
  const staffViewModal = document.getElementById("staff-view-modal");
  const staffCloseView = document.getElementById("staff-close-view");
  const staffViewContent = document.getElementById("staff-view-content");
  const staffPrevBtn = document.getElementById("staff-prev-page");
  const staffNextBtn = document.getElementById("staff-next-page");
  const staffToastContainer = document.getElementById("staff-toast-container");
  const staffTableHead = document.getElementById("staff-table-head");
  const staffPagination = document.getElementById("staff-pagination");
  const staffConfirmDelete = document.getElementById("staff-confirm-delete");
  const staffConfirmDeleteBtn = document.getElementById(
    "staff-confirm-delete-btn"
  );
  const staffCancelDelete = document.getElementById("staff-cancel-delete");

  // State variables
  let staff = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let isEditing = false;
  let currentEditId = null;
  let staffToDelete = null;
  const staffRef = ref(database, "staff");

  // Initialize
  setupEventListeners();
  loadStaff();

  // Functions
  function setupEventListeners() {
    // Modal controls
    staffAddBtn.addEventListener("click", () => openStaffModal(false));
    staffCloseModal.addEventListener("click", closeStaffModal);
    staffCloseView.addEventListener("click", () =>
      staffViewModal.classList.add("hidden")
    );

    // Delete confirmation modal
    staffConfirmDeleteBtn.addEventListener("click", confirmDelete);
    staffCancelDelete.addEventListener("click", () =>
      staffConfirmDelete.classList.add("hidden")
    );

    // Form submission
    staffForm.addEventListener("submit", handleFormSubmit);

    // Search functionality
    staffSearchInput.addEventListener("input", () => {
      currentPage = 1;
      renderStaffTable();
    });

    // Pagination
    staffPrevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderStaffTable();
      }
    });

    staffNextBtn.addEventListener("click", () => {
      const filteredStaff = getFilteredStaff();
      if (currentPage * itemsPerPage < filteredStaff.length) {
        currentPage++;
        renderStaffTable();
      }
    });

    // Add input validation listeners
    document
      .getElementById("staff-name-input")
      .addEventListener("input", validateName);
    document
      .getElementById("staff-phone-input")
      .addEventListener("input", validatePhone);
    document
      .getElementById("staff-guardian-input")
      .addEventListener("input", validateGuardian);
    document
      .getElementById("staff-emergency-input")
      .addEventListener("input", validateEmergency);
    document
      .getElementById("staff-medical-input")
      .addEventListener("input", validateMedical);
    document
      .getElementById("staff-email-input")
      .addEventListener("blur", validateEmail);
    document
      .getElementById("staff-address-input")
      .addEventListener("input", validateAddress);
    document
      .getElementById("staff-salary-input")
      .addEventListener("input", validateSalary);
    document
      .getElementById("staff-role-input")
      .addEventListener("input", validateRole);
    document
      .getElementById("staff-dob-input")
      .addEventListener("change", validateDOB);
    document
      .getElementById("staff-joined-input")
      .addEventListener("change", validateJoinedDate);
  }

  // Calculate age from DOB and validate (must be >=18)
  function validateDOB() {
    const input = document.getElementById("staff-dob-input");
    const error = document.getElementById("dob-error");
    const dob = new Date(input.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    const isValid = input.value.trim().length > 0 && age >= 18;

    if (!isValid) {
      error.textContent =
        age < 18
          ? "Staff must be at least 18 years old"
          : "Please select a valid date of birth";
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  // Validation functions
  function validateName() {
    const input = document.getElementById("staff-name-input");
    const error = document.getElementById("name-error");
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

  function validatePhone() {
    const input = document.getElementById("staff-phone-input");
    const error = document.getElementById("phone-error");
    const isValid = /^[0-9]{10}$/.test(input.value.trim());

    if (!isValid) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  function validateGuardian() {
    const input = document.getElementById("staff-guardian-input");
    const error = document.getElementById("guardian-error");
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

  function validateEmergency() {
    const input = document.getElementById("staff-emergency-input");
    const error = document.getElementById("emergency-error");
    const isValid = /^[0-9]{10}$/.test(input.value.trim());

    if (!isValid) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  function validateMedical() {
    const input = document.getElementById("staff-medical-input");
    const error = document.getElementById("medical-error");
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

  function validateEmail() {
    const input = document.getElementById("staff-email-input");
    const error = document.getElementById("email-error");
    const value = input.value.trim();
    const isValid = value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    if (!isValid) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  function validateAddress() {
    const input = document.getElementById("staff-address-input");
    const error = document.getElementById("address-error");
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

  function validateSalary() {
    const input = document.getElementById("staff-salary-input");
    const error = document.getElementById("salary-error");
    const isValid =
      input.value.trim().length > 0 && parseFloat(input.value) >= 0;

    if (!isValid) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  function validateRole() {
    const input = document.getElementById("staff-role-input");
    const error = document.getElementById("role-error");
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

  function validateJoinedDate() {
    const input = document.getElementById("staff-joined-input");
    const error = document.getElementById("joined-error");
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

  function validateForm() {
    let isValid = true;

    // Validate all required fields
    if (!validateName()) isValid = false;
    if (!validatePhone()) isValid = false;
    if (!validateGuardian()) isValid = false;
    if (!validateEmergency()) isValid = false;
    if (!validateMedical()) isValid = false;
    if (!validateAddress()) isValid = false;
    if (!validateSalary()) isValid = false;
    if (!validateRole()) isValid = false;
    if (!validateDOB()) isValid = false;
    if (!validateJoinedDate()) isValid = false;

    // Email is optional but must be valid if provided
    const emailInput = document.getElementById("staff-email-input");
    if (emailInput.value.trim() !== "" && !validateEmail()) {
      isValid = false;
    }

    return isValid;
  }

  function loadStaff() {
    onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      staff = data
        ? Object.entries(data).map(([id, staff]) => ({ id, ...staff }))
        : [];
      renderStaffTable();
    });
  }

  function openStaffModal(editing, staffId = null) {
    isEditing = editing;
    currentEditId = staffId;

    if (editing && staffId) {
      staffModalTitle.textContent = "Edit Staff";
      const staffMember = staff.find((s) => s.id === staffId);
      if (staffMember) {
        document.getElementById("staff-name-input").value = staffMember.name;
        document.querySelector(
          `input[name="staff-gender"][value="${staffMember.gender}"]`
        ).checked = true;
        document.getElementById("staff-dob-input").value =
          staffMember.dateOfBirth;
        document.getElementById("staff-phone-input").value =
          staffMember.phoneNumber;
        document.getElementById("staff-guardian-input").value =
          staffMember.guardianname;
        document.getElementById("staff-emergency-input").value =
          staffMember.emergencyContact;
        document.getElementById("staff-medical-input").value =
          staffMember.medicalConditions;
        document.getElementById("staff-email-input").value =
          staffMember.email || "";
        document.getElementById("staff-address-input").value =
          staffMember.address;
        document.getElementById("staff-shift-select").value = staffMember.shift;
        document.getElementById("staff-joined-input").value =
          staffMember.joinedDate;
        document.getElementById("staff-salary-input").value =
          staffMember.salary;
        document.getElementById("staff-role-input").value = staffMember.role;
      }
    } else {
      staffModalTitle.textContent = "Add Staff";
      staffForm.reset();
      // Set default gender to Male
      document.querySelector(
        'input[name="staff-gender"][value="Male"]'
      ).checked = true;
    }

    staffModal.classList.remove("hidden");
  }

  function closeStaffModal() {
    staffModal.classList.add("hidden");
    isEditing = false;
    currentEditId = null;
    staffForm.reset();
    // Clear all validation errors
    document
      .querySelectorAll(".border-red-500")
      .forEach((el) => el.classList.remove("border-red-500"));
    document
      .querySelectorAll('[id$="-error"]')
      .forEach((el) => el.classList.add("hidden"));
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      showToast("Please fix the form errors before submitting", "error");
      return;
    }

    const formData = {
      name: document.getElementById("staff-name-input").value.trim(),
      gender: document.querySelector('input[name="staff-gender"]:checked')
        .value,
      dateOfBirth: document.getElementById("staff-dob-input").value,
      phoneNumber: document.getElementById("staff-phone-input").value.trim(),
      guardianname: document
        .getElementById("staff-guardian-input")
        .value.trim(),
      emergencyContact: document
        .getElementById("staff-emergency-input")
        .value.trim(),
      medicalConditions: document
        .getElementById("staff-medical-input")
        .value.trim(),
      email: document.getElementById("staff-email-input").value.trim() || "",
      address: document.getElementById("staff-address-input").value.trim(),
      shift: document.getElementById("staff-shift-select").value,
      joinedDate: document.getElementById("staff-joined-input").value,
      salary: document.getElementById("staff-salary-input").value,
      role: document.getElementById("staff-role-input").value.trim(),
      uid: "", // Will be set below
    };

    try {
      if (isEditing && currentEditId) {
        // Update existing staff
        formData.uid = currentEditId;
        const staffRef = ref(database, `staff/${currentEditId}`);
        await update(staffRef, formData);
        showToast("Staff updated successfully", "success");
      } else {
        // Add new staff
        const newStaffRef = push(staffRef);
        formData.uid = newStaffRef.key;
        await set(newStaffRef, formData);
        showToast("Staff added successfully", "success");
      }

      closeStaffModal();
    } catch (error) {
      console.error("Error saving staff:", error);
      showToast("Failed to save staff", "error");
    }
  }

  function showDeleteConfirmation(staffId) {
    staffToDelete = staffId;
    staffConfirmDelete.classList.remove("hidden");
  }

  async function confirmDelete() {
    if (!staffToDelete) return;

    staffConfirmDelete.classList.add("hidden");

    try {
      const staffRef = ref(database, `staff/${staffToDelete}`);
      await remove(staffRef);
      showToast("Staff deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting staff:", error);
      showToast("Failed to delete staff", "error");
    }

    staffToDelete = null;
  }

  function getFilteredStaff() {
    const searchTerm = staffSearchInput.value.toLowerCase();
    if (!searchTerm) return staff;

    return staff.filter(
      (staff) =>
        staff.name.toLowerCase().includes(searchTerm) ||
        (staff.email && staff.email.toLowerCase().includes(searchTerm)) ||
        staff.phoneNumber.toLowerCase().includes(searchTerm)
    );
  }

  function renderStaffTable() {
    const filteredStaff = getFilteredStaff();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStaff = filteredStaff.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    staffTableBody.innerHTML = "";

    if (filteredStaff.length === 0) {
      staffEmptyMsg.classList.remove("hidden");
      staffTableHead.classList.add("hidden");
      staffPagination.classList.add("hidden");
    } else {
      staffEmptyMsg.classList.add("hidden");
      staffTableHead.classList.remove("hidden");
      staffPagination.classList.remove("hidden");

      paginatedStaff.forEach((staff) => {
        const row = document.createElement("tr");
        row.className = "border-b border-gray-700 hover:bg-gray-700";
        row.innerHTML = `
          <td class="px-3 py-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                ${staff.name.charAt(0).toUpperCase()}
              </div>
              <span>${staff.name}</span>
            </div>
          </td>
          <td class="px-3 py-3">${staff.role}</td>
          <td class="px-3 py-3">${staff.phoneNumber}</td>
          <td class="px-3 py-3">${staff.shift}</td>
          <td class="px-3 py-3">
            <div class="flex gap-2">
              <button class="staff-view-btn p-1 text-indigo-400 hover:text-indigo-300" data-id="${
                staff.id
              }">
                <i class="fas fa-eye"></i>
              </button>
              <button class="staff-edit-btn p-1 text-blue-400 hover:text-blue-300" data-id="${
                staff.id
              }">
                <i class="fas fa-edit"></i>
              </button>
              <button class="staff-delete-btn p-1 text-red-400 hover:text-red-300" data-id="${
                staff.id
              }">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        staffTableBody.appendChild(row);
      });

      document.querySelectorAll(".staff-view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          viewStaff(e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".staff-edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          openStaffModal(true, e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".staff-delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          showDeleteConfirmation(e.target.closest("button").dataset.id)
        );
      });
    }

    staffPrevBtn.disabled = currentPage === 1;
    staffNextBtn.disabled = currentPage * itemsPerPage >= filteredStaff.length;
  }

  function viewStaff(staffId) {
    const staffMember = staff.find((s) => s.id === staffId);
    if (!staffMember) return;

    // Calculate age from DOB
    const dob = new Date(staffMember.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    staffViewContent.innerHTML = `
      <div class="flex justify-center mb-4">
        <div class="w-32 h-32 rounded-full bg-indigo-500 flex items-center justify-center text-white text-4xl">
          ${staffMember.name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-gray-400">Staff ID</p>
            <p class="font-medium">${staffMember.id}</p>
          </div>
          <div>
            <p class="text-gray-400">Name</p>
            <p class="font-medium">${staffMember.name}</p>
          </div>
          <div>
            <p class="text-gray-400">Gender</p>
            <p class="font-medium">${staffMember.gender}</p>
          </div>
          <div>
            <p class="text-gray-400">Date of Birth</p>
            <p class="font-medium">${staffMember.dateOfBirth} (${age} years)</p>
          </div>
          <div>
            <p class="text-gray-400">Phone Number</p>
            <p class="font-medium">${staffMember.phoneNumber}</p>
          </div>
          <div>
            <p class="text-gray-400">Guardian Name</p>
            <p class="font-medium">${staffMember.guardianname}</p>
          </div>
          <div>
            <p class="text-gray-400">Emergency Contact</p>
            <p class="font-medium">${staffMember.emergencyContact}</p>
          </div>
          <div>
            <p class="text-gray-400">Medical Conditions</p>
            <p class="font-medium">${
              staffMember.medicalConditions || "None"
            }</p>
          </div>
          <div>
            <p class="text-gray-400">Email</p>
            <p class="font-medium">${staffMember.email || "Not specified"}</p>
          </div>
          <div>
            <p class="text-gray-400">Address</p>
            <p class="font-medium">${staffMember.address}</p>
          </div>
          <div>
            <p class="text-gray-400">Shift</p>
            <p class="font-medium">${staffMember.shift}</p>
          </div>
          <div>
            <p class="text-gray-400">Joined Date</p>
            <p class="font-medium">${staffMember.joinedDate}</p>
          </div>
          <div>
            <p class="text-gray-400">Salary</p>
            <p class="font-medium">${staffMember.salary}</p>
          </div>
          <div>
            <p class="text-gray-400">Role</p>
            <p class="font-medium">${staffMember.role}</p>
          </div>
        </div>
      </div>
    `;

    staffViewModal.classList.remove("hidden");
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

    staffToastContainer.appendChild(toast);

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      toast.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => toast.remove(), 300);
    }, 5000);

    // Manual close button
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
