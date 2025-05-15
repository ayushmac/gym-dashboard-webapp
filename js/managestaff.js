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
  const staffPrevBtn = document.getElementById("staff-prev-btn");
  const staffNextBtn = document.getElementById("staff-next-btn");
  const staffToastContainer = document.getElementById("staff-toast-container");
  const staffTableHead = document.getElementById("staff-table-head");
  const staffPaginationContainer = document.getElementById(
    "staff-pagination-container"
  );
  const staffConfirmDeleteModal = document.getElementById(
    "staff-confirm-delete-modal"
  );
  const staffConfirmDeleteBtn = document.getElementById(
    "staff-confirm-delete-btn"
  );
  const staffCancelDeleteBtn = document.getElementById(
    "staff-cancel-delete-btn"
  );

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

    // Delete confirmation
    staffConfirmDeleteBtn.addEventListener("click", confirmDelete);
    staffCancelDeleteBtn.addEventListener("click", () => closeDeleteModal());

    // Form submission
    staffForm.addEventListener("submit", handleFormSubmit);

    // Search
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

    // Validation listeners
    document
      .getElementById("staff-name")
      .addEventListener("input", validateName);
    document
      .getElementById("staff-dob")
      .addEventListener("change", validateDOB);
    document
      .getElementById("staff-phone")
      .addEventListener("input", validatePhone);
    document
      .getElementById("staff-email")
      .addEventListener("blur", validateEmail);
    document
      .getElementById("staff-address")
      .addEventListener("input", validateAddress);
    document
      .getElementById("staff-role")
      .addEventListener("input", validateRole);
    document
      .getElementById("staff-salary")
      .addEventListener("input", validateSalary);
    document
      .getElementById("staff-joined")
      .addEventListener("change", validateJoinedDate);
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
    const input = document.getElementById("staff-name");
    const error = document.getElementById("staff-name-error");
    const isValid =
      input.value.trim().length > 0 && /^[A-Za-z ]+$/.test(input.value.trim());
    toggleError(input, error, isValid);
    return isValid;
  }

  function validateDOB() {
    const input = document.getElementById("staff-dob");
    const error = document.getElementById("staff-dob-error");
    const isValid = input.value && calculateAge(input.value) >= 18;
    toggleError(input, error, isValid, "Staff must be at least 18 years old");
    return isValid;
  }

  function validatePhone() {
    const input = document.getElementById("staff-phone");
    const error = document.getElementById("staff-phone-error");
    const isValid = /^[0-9]{10}$/.test(input.value.trim());
    toggleError(input, error, isValid);
    return isValid;
  }

  function validateEmail() {
    const input = document.getElementById("staff-email");
    const error = document.getElementById("staff-email-error");
    const value = input.value.trim();
    const isValid = value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    toggleError(input, error, isValid);
    return isValid;
  }

  function validateAddress() {
    const input = document.getElementById("staff-address");
    const error = document.getElementById("staff-address-error");
    const isValid = input.value.trim().length > 0;
    toggleError(input, error, isValid);
    return isValid;
  }

  function validateRole() {
    const input = document.getElementById("staff-role");
    const error = document.getElementById("staff-role-error");
    const isValid = input.value.trim().length > 0;
    toggleError(input, error, isValid);
    return isValid;
  }

  function validateSalary() {
    const input = document.getElementById("staff-salary");
    const error = document.getElementById("staff-salary-error");
    const isValid =
      input.value.trim().length > 0 && parseFloat(input.value) >= 0;
    toggleError(input, error, isValid);
    return isValid;
  }

  function validateJoinedDate() {
    const input = document.getElementById("staff-joined");
    const error = document.getElementById("staff-joined-error");
    const isValid = input.value.trim().length > 0;
    toggleError(input, error, isValid);
    return isValid;
  }

  function toggleError(input, error, isValid, message = "") {
    if (!isValid) {
      error.textContent = message || error.textContent;
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
  }

  function validateForm() {
    let isValid = true;
    if (!validateName()) isValid = false;
    if (!validateDOB()) isValid = false;
    if (!validatePhone()) isValid = false;
    if (!validateAddress()) isValid = false;
    if (!validateRole()) isValid = false;
    if (!validateSalary()) isValid = false;
    if (!validateJoinedDate()) isValid = false;
    if (!validateEmail()) isValid = false;
    return isValid;
  }

  function loadStaff() {
    onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      staff = data
        ? Object.entries(data).map(([id, staff]) => ({ id, ...staff }))
        : [];
      renderStaffTable();
      // Ensure delete modal is hidden when data reloads
      closeDeleteModal();
    });
  }

  function openStaffModal(editing, staffId = null) {
    isEditing = editing;
    currentEditId = staffId;

    if (editing && staffId) {
      staffModalTitle.textContent = "Edit Staff";
      const staffMember = staff.find((s) => s.id === staffId);
      if (staffMember) {
        document.getElementById("staff-name").value = staffMember.name;
        document.querySelector(
          `input[name="staff-gender"][value="${staffMember.gender}"]`
        ).checked = true;
        document.getElementById("staff-dob").value = staffMember.dateOfBirth;
        document.getElementById("staff-phone").value = staffMember.phoneNumber;
        document.getElementById("staff-email").value = staffMember.email || "";
        document.getElementById("staff-address").value = staffMember.address;
        document.getElementById("staff-shift").value = staffMember.shift;
        document.getElementById("staff-role").value = staffMember.role;
        document.getElementById("staff-salary").value = staffMember.salary;
        document.getElementById("staff-joined").value = staffMember.joinedDate;
      }
    } else {
      staffModalTitle.textContent = "Add Staff";
      staffForm.reset();
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
    document
      .querySelectorAll(".border-red-500")
      .forEach((el) => el.classList.remove("border-red-500"));
    document
      .querySelectorAll('[id$="-error"]')
      .forEach((el) => el.classList.add("hidden"));
  }

  function closeDeleteModal() {
    staffConfirmDeleteModal.classList.add("hidden");
    staffToDelete = null;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Please fix the form errors before submitting", "error");
      return;
    }

    const formData = {
      name: document.getElementById("staff-name").value.trim(),
      gender: document.querySelector('input[name="staff-gender"]:checked')
        .value,
      dateOfBirth: document.getElementById("staff-dob").value,
      phoneNumber: document.getElementById("staff-phone").value.trim(),
      email: document.getElementById("staff-email").value.trim() || "",
      address: document.getElementById("staff-address").value.trim(),
      shift: document.getElementById("staff-shift").value,
      role: document.getElementById("staff-role").value.trim(),
      salary: document.getElementById("staff-salary").value,
      joinedDate: document.getElementById("staff-joined").value,
      staff_uid: "",
    };

    try {
      if (isEditing && currentEditId) {
        formData.staff_uid = currentEditId;
        await update(ref(database, `staff/${currentEditId}`), formData);
        showToast("Staff updated successfully", "success");
      } else {
        const newStaffRef = push(staffRef);
        formData.staff_uid = newStaffRef.key;
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
    staffConfirmDeleteModal.classList.remove("hidden");
  }

  async function confirmDelete() {
    if (!staffToDelete) return;

    try {
      await remove(ref(database, `staff/${staffToDelete}`));
      showToast("Staff deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting staff:", error);
      showToast("Failed to delete staff", "error");
    }

    closeDeleteModal();
  }

  function getFilteredStaff() {
    const searchTerm = staffSearchInput.value.toLowerCase();
    return searchTerm
      ? staff.filter(
          (s) =>
            s.name.toLowerCase().includes(searchTerm) ||
            (s.email && s.email.toLowerCase().includes(searchTerm)) ||
            s.phoneNumber.includes(searchTerm)
        )
      : staff;
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
      staffPaginationContainer.classList.add("hidden");
    } else {
      staffEmptyMsg.classList.add("hidden");
      staffTableHead.classList.remove("hidden");
      staffPaginationContainer.classList.remove("hidden");

      paginatedStaff.forEach((staffMember) => {
        const row = document.createElement("tr");
        row.className = "border-b border-gray-700 hover:bg-gray-700";
        row.innerHTML = `
          <td class="px-3 py-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                ${staffMember.name.charAt(0).toUpperCase()}
              </div>
              <span>${staffMember.name}</span>
            </div>
          </td>
          <td class="px-3 py-3">${staffMember.role}</td>
          <td class="px-3 py-3">${staffMember.phoneNumber}</td>
          <td class="px-3 py-3">${staffMember.shift}</td>
          <td class="px-3 py-3">
            <div class="flex gap-2">
              <button class="view-btn p-1 text-indigo-400 hover:text-indigo-300" data-id="${
                staffMember.id
              }">
                <i class="fas fa-eye"></i>
              </button>
              <button class="edit-btn p-1 text-blue-400 hover:text-blue-300" data-id="${
                staffMember.id
              }">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-btn p-1 text-red-400 hover:text-red-300" data-id="${
                staffMember.id
              }">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        staffTableBody.appendChild(row);
      });

      // Add event listeners to buttons
      document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          viewStaff(e.target.closest("button").dataset.id)
        );
      });
      document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          openStaffModal(true, e.target.closest("button").dataset.id)
        );
      });
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          showDeleteConfirmation(e.target.closest("button").dataset.id)
        );
      });
    }

    // Update pagination buttons
    staffPrevBtn.disabled = currentPage === 1;
    staffNextBtn.disabled = currentPage * itemsPerPage >= filteredStaff.length;
  }

  function viewStaff(staffId) {
    const staffMember = staff.find((s) => s.id === staffId);
    if (!staffMember) return;

    const age = calculateAge(staffMember.dateOfBirth);

    staffViewContent.innerHTML = `
      <div class="flex justify-center mb-4">
        <div class="w-32 h-32 rounded-full bg-indigo-500 flex items-center justify-center text-white text-4xl">
          ${staffMember.name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div class="space-y-4">
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
          <p class="text-gray-400">Phone</p>
          <p class="font-medium">${staffMember.phoneNumber}</p>
        </div>
        <div>
          <p class="text-gray-400">Email</p>
          <p class="font-medium">${staffMember.email || "Not provided"}</p>
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
          <p class="text-gray-400">Role</p>
          <p class="font-medium">${staffMember.role}</p>
        </div>
        <div>
          <p class="text-gray-400">Salary</p>
          <p class="font-medium">₹${staffMember.salary}</p>
        </div>
        <div>
          <p class="text-gray-400">Joined Date</p>
          <p class="font-medium">${staffMember.joinedDate}</p>
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
