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
  const membersTableBody = document.getElementById("members-table-body");
  const membersEmptyMsg = document.getElementById("members-empty-msg");
  const membersAddBtn = document.getElementById("members-add-btn");
  const membersModal = document.getElementById("members-modal");
  const membersCloseModal = document.getElementById("members-close-modal");
  const membersForm = document.getElementById("members-form");
  const membersModalTitle = document.getElementById("members-modal-title");
  const membersSearchInput = document.getElementById("members-search-input");
  const membersViewModal = document.getElementById("members-view-modal");
  const membersCloseView = document.getElementById("members-close-view");
  const membersViewContent = document.getElementById("members-view-content");
  const membersPrevBtn = document.getElementById("members-prev-page");
  const membersNextBtn = document.getElementById("members-next-page");
  const membersToastContainer = document.getElementById(
    "members-toast-container"
  );
  const membersTableHead = document.getElementById("members-table-head");
  const membersPagination = document.getElementById("members-pagination");
  const membersConfirmDelete = document.getElementById(
    "members-confirm-delete"
  );
  const membersConfirmDeleteBtn = document.getElementById(
    "members-confirm-delete-btn"
  );
  const membersCancelDelete = document.getElementById("members-cancel-delete");
  const membersPasswordInput = document.getElementById(
    "members-password-input"
  );
  const membersTogglePassword = document.getElementById(
    "members-toggle-password"
  );

  // State variables
  let members = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let isEditing = false;
  let currentEditId = null;
  let memberToDelete = null;
  const membersRef = ref(database, "members");

  // Initialize
  setupEventListeners();
  loadMembers();

  // Functions
  function setupEventListeners() {
    // Modal controls
    membersAddBtn.addEventListener("click", () => openMemberModal(false));
    membersCloseModal.addEventListener("click", closeMemberModal);
    membersCloseView.addEventListener("click", () =>
      membersViewModal.classList.add("hidden")
    );

    // Delete confirmation modal
    membersConfirmDeleteBtn.addEventListener("click", confirmDelete);
    membersCancelDelete.addEventListener("click", () =>
      membersConfirmDelete.classList.add("hidden")
    );

    // Form submission
    membersForm.addEventListener("submit", handleFormSubmit);

    // Search functionality
    membersSearchInput.addEventListener("input", () => {
      currentPage = 1;
      renderMembersTable();
    });

    // Pagination
    membersPrevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderMembersTable();
      }
    });

    membersNextBtn.addEventListener("click", () => {
      const filteredMembers = getFilteredMembers();
      if (currentPage * itemsPerPage < filteredMembers.length) {
        currentPage++;
        renderMembersTable();
      }
    });

    // Password toggle
    membersTogglePassword.addEventListener("click", togglePasswordVisibility);

    // Form validation listeners
    document
      .getElementById("members-name-input")
      .addEventListener("input", validateName);
    document
      .getElementById("members-dob-input")
      .addEventListener("change", validateDOB);
    document
      .getElementById("members-contact-input")
      .addEventListener("input", validateContact);
    document
      .getElementById("members-guardian-input")
      .addEventListener("input", validateGuardian);
    document
      .getElementById("members-emergency-input")
      .addEventListener("input", validateEmergencyContact);
    document
      .getElementById("members-email-input")
      .addEventListener("blur", validateEmail);
    document
      .getElementById("members-password-input")
      .addEventListener("input", validatePassword);
  }

  function togglePasswordVisibility() {
    const type =
      membersPasswordInput.getAttribute("type") === "password"
        ? "text"
        : "password";
    membersPasswordInput.setAttribute("type", type);
    membersTogglePassword.innerHTML =
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
    const input = document.getElementById("members-name-input");
    const error = document.getElementById("members-name-error");
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

  function validateDOB() {
    const input = document.getElementById("members-dob-input");
    const error = document.getElementById("members-dob-error");
    const dob = input.value;

    if (!dob) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
      return false;
    }

    const age = calculateAge(dob);
    const isValid = age >= 12;

    if (!isValid) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
    }
    return isValid;
  }

  function validateContact() {
    const input = document.getElementById("members-contact-input");
    const error = document.getElementById("members-contact-error");
    const contact = input.value.trim();
    const contactRegex = /^[0-9]{10}$/;

    if (!contactRegex.test(contact)) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
      return false;
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
      return true;
    }
  }

  function validateGuardian() {
    const input = document.getElementById("members-guardian-input");
    const error = document.getElementById("members-guardian-error");
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

  function validateEmergencyContact() {
    const input = document.getElementById("members-emergency-input");
    const error = document.getElementById("members-emergency-error");
    const contact = input.value.trim();
    const contactRegex = /^[0-9]{10}$/;

    if (!contactRegex.test(contact)) {
      error.classList.remove("hidden");
      input.classList.add("border-red-500");
      return false;
    } else {
      error.classList.add("hidden");
      input.classList.remove("border-red-500");
      return true;
    }
  }

  function validateEmail() {
    const input = document.getElementById("members-email-input");
    const error = document.getElementById("members-email-error");
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

  function validatePassword() {
    const input = document.getElementById("members-password-input");
    const error = document.getElementById("members-password-error");
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
    if (!validateDOB()) isValid = false;
    if (!validateContact()) isValid = false;
    if (!validateGuardian()) isValid = false;
    if (!validateEmergencyContact()) isValid = false;
    if (!validateEmail()) isValid = false;
    if (!validatePassword()) isValid = false;

    return isValid;
  }

  function loadMembers() {
    onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      members = data
        ? Object.entries(data).map(([id, member]) => ({ id, ...member }))
        : [];
      renderMembersTable();
    });
  }

  function openMemberModal(editing, memberId = null) {
    isEditing = editing;
    currentEditId = memberId;

    if (editing && memberId) {
      membersModalTitle.textContent = "Edit Member";
      const member = members.find((m) => m.id === memberId);
      if (member) {
        document.getElementById("members-name-input").value = member.full_name;
        document.querySelector(
          `input[name="members-gender"][value="${member.gender}"]`
        ).checked = true;
        document.getElementById("members-dob-input").value = member.dob;
        document.getElementById("members-address-input").value =
          member.address || "";
        document.getElementById("members-medical-input").value =
          member.medical_conditions || "";
        document.getElementById("members-contact-input").value =
          member.contact_no;
        document.getElementById("members-guardian-input").value =
          member.guardian_name;
        document.getElementById("members-emergency-input").value =
          member.emergency_contact_no;
        document.getElementById("members-email-input").value = member.email;
        document.getElementById("members-password-input").value =
          member.password;
      }
    } else {
      membersModalTitle.textContent = "Add Member";
      membersForm.reset();
      // Set default gender to Male
      document.querySelector(
        'input[name="members-gender"][value="Male"]'
      ).checked = true;
    }

    membersModal.classList.remove("hidden");
  }

  function closeMemberModal() {
    membersModal.classList.add("hidden");
    isEditing = false;
    currentEditId = null;
    membersForm.reset();
    // Reset password visibility
    membersPasswordInput.setAttribute("type", "password");
    membersTogglePassword.innerHTML = '<i class="fas fa-eye"></i>';
    // Clear validation errors
    document
      .querySelectorAll(".border-red-500")
      .forEach((el) => el.classList.remove("border-red-500"));
    document
      .querySelectorAll('[id$="-error"]')
      .forEach((el) => el.classList.add("hidden"));
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Please fix the form errors before submitting", "error");
      return;
    }

    const formData = {
      full_name: document.getElementById("members-name-input").value.trim(),
      gender: document.querySelector('input[name="members-gender"]:checked')
        .value,
      dob: document.getElementById("members-dob-input").value,
      address: document.getElementById("members-address-input").value.trim(),
      medical_conditions: document
        .getElementById("members-medical-input")
        .value.trim(),
      contact_no: document.getElementById("members-contact-input").value.trim(),
      guardian_name: document
        .getElementById("members-guardian-input")
        .value.trim(),
      emergency_contact_no: document
        .getElementById("members-emergency-input")
        .value.trim(),
      email: document.getElementById("members-email-input").value.trim(),
      password: document.getElementById("members-password-input").value,
      member_uid: "", // Will be set below
    };

    try {
      if (isEditing && currentEditId) {
        // Update existing member
        formData.member_uid = currentEditId;
        const memberRef = ref(database, `members/${currentEditId}`);
        await update(memberRef, formData);
        showToast("Member updated successfully", "success");
      } else {
        // Add new member
        const newMemberRef = push(membersRef);
        formData.member_uid = newMemberRef.key;
        await set(newMemberRef, formData);
        showToast("Member added successfully", "success");
      }

      closeMemberModal();
    } catch (error) {
      console.error("Error saving member:", error);
      showToast("Failed to save member", "error");
    }
  }

  function showDeleteConfirmation(memberId) {
    memberToDelete = memberId;
    membersConfirmDelete.classList.remove("hidden");
  }

  async function confirmDelete() {
    if (!memberToDelete) return;

    membersConfirmDelete.classList.add("hidden");

    try {
      const memberRef = ref(database, `members/${memberToDelete}`);
      await remove(memberRef);
      showToast("Member deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting member:", error);
      showToast("Failed to delete member", "error");
    }

    memberToDelete = null;
  }

  function getFilteredMembers() {
    const searchTerm = membersSearchInput.value.toLowerCase();
    if (!searchTerm) return members;

    return members.filter(
      (member) =>
        member.full_name.toLowerCase().includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm) ||
        member.contact_no.toLowerCase().includes(searchTerm)
    );
  }

  function renderMembersTable() {
    const filteredMembers = getFilteredMembers();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedMembers = filteredMembers.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    membersTableBody.innerHTML = "";

    if (filteredMembers.length === 0) {
      membersEmptyMsg.classList.remove("hidden");
      membersTableHead.classList.add("hidden");
      membersPagination.classList.add("hidden");
    } else {
      membersEmptyMsg.classList.add("hidden");
      membersTableHead.classList.remove("hidden");
      membersPagination.classList.remove("hidden");

      paginatedMembers.forEach((member) => {
        const row = document.createElement("tr");
        row.className = "border-b border-gray-700 hover:bg-gray-700";

        const age = member.dob ? calculateAge(member.dob) : "--";

        row.innerHTML = `
          <td class="px-3 py-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                ${member.full_name.charAt(0).toUpperCase()}
              </div>
              <span>${member.full_name}</span>
            </div>
          </td>
          <td class="px-3 py-3">${member.gender}</td>
          <td class="px-3 py-3">${age}</td>
          <td class="px-3 py-3">${member.contact_no}</td>
          <td class="px-3 py-3">
            <div class="flex gap-2">
              <button class="members-view-btn p-1 text-indigo-400 hover:text-indigo-300" data-id="${
                member.id
              }">
                <i class="fas fa-eye"></i>
              </button>
              <button class="members-edit-btn p-1 text-blue-400 hover:text-blue-300" data-id="${
                member.id
              }">
                <i class="fas fa-edit"></i>
              </button>
              <button class="members-delete-btn p-1 text-red-400 hover:text-red-300" data-id="${
                member.id
              }">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        membersTableBody.appendChild(row);
      });

      // Add event listeners to the buttons
      document.querySelectorAll(".members-view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          viewMember(e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".members-edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          openMemberModal(true, e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".members-delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          showDeleteConfirmation(e.target.closest("button").dataset.id)
        );
      });
    }

    // Update pagination buttons
    membersPrevBtn.disabled = currentPage === 1;
    membersNextBtn.disabled =
      currentPage * itemsPerPage >= filteredMembers.length;
  }

  function viewMember(memberId) {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const age = member.dob ? calculateAge(member.dob) : "--";
    let passwordVisible = false;

    membersViewContent.innerHTML = `
      <div class="flex justify-center mb-4">
        <div class="w-32 h-32 rounded-full bg-indigo-500 flex items-center justify-center text-white text-4xl">
          ${member.full_name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div class="space-y-4">
        <div>
          <p class="text-gray-400">Member ID</p>
          <p class="font-medium">${member.id}</p>
        </div>
        <div>
          <p class="text-gray-400">Full Name</p>
          <p class="font-medium">${member.full_name}</p>
        </div>
        <div>
          <p class="text-gray-400">Gender</p>
          <p class="font-medium">${member.gender}</p>
        </div>
        <div>
          <p class="text-gray-400">Date of Birth</p>
          <p class="font-medium">${member.dob || "--"} (${age} years)</p>
        </div>
        <div>
          <p class="text-gray-400">Address</p>
          <p class="font-medium">${member.address || "--"}</p>
        </div>
        <div>
          <p class="text-gray-400">Medical Conditions</p>
          <p class="font-medium">${member.medical_conditions || "None"}</p>
        </div>
        <div>
          <p class="text-gray-400">Contact Number</p>
          <p class="font-medium">${member.contact_no}</p>
        </div>
        <div>
          <p class="text-gray-400">Guardian Name</p>
          <p class="font-medium">${member.guardian_name}</p>
        </div>
        <div>
          <p class="text-gray-400">Emergency Contact</p>
          <p class="font-medium">${member.emergency_contact_no}</p>
        </div>
        <div>
          <p class="text-gray-400">Email</p>
          <p class="font-medium">${member.email}</p>
        </div>
        <div>
          <p class="text-gray-400">Password</p>
          <div class="flex items-center gap-2">
            <p class="font-medium" id="members-view-password">${"•".repeat(
              member.password.length
            )}</p>
            <button id="members-toggle-view-password" class="text-gray-400 hover:text-white">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Add event listener for the password toggle in the view modal
    document
      .getElementById("members-toggle-view-password")
      .addEventListener("click", function () {
        passwordVisible = !passwordVisible;
        const passwordElement = document.getElementById(
          "members-view-password"
        );
        passwordElement.textContent = passwordVisible
          ? member.password
          : "•".repeat(member.password.length);
        this.innerHTML = passwordVisible
          ? '<i class="fas fa-eye-slash"></i>'
          : '<i class="fas fa-eye"></i>';
      });

    membersViewModal.classList.remove("hidden");
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

    membersToastContainer.appendChild(toast);

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
