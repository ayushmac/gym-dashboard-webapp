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
  const membersEmptyActive = document.getElementById("members-empty-active");
  const membersEmptyInactive = document.getElementById(
    "members-empty-inactive"
  );
  const membersEmptyExpired = document.getElementById("members-empty-expired");
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
  const membersStatusFilter = document.getElementById("members-status-filter");

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

    // Status filter
    membersStatusFilter.addEventListener("change", () => {
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
        document.getElementById("members-name-input").value = member.name;
        document.getElementById("members-dob-input").value = member.dob;
        document.getElementById("members-email-input").value = member.email;
        document.getElementById("members-contact-input").value =
          member.contact_no;
        document.getElementById("members-guardian-input").value =
          member.guardian_name;
        document.getElementById("members-emergency-input").value =
          member.emergency_contact_no;
        document.getElementById("members-medical-input").value =
          member.medical_conditions;
        document.getElementById("members-status-select").value =
          member.membership_status;
        document.getElementById("members-plan-start-input").value =
          member.plan_start_date;
        document.getElementById("members-plan-end-input").value =
          member.plan_end_date;
        document.getElementById("members-training-start-input").value =
          member.training_start_date;
        document.getElementById("members-training-end-input").value =
          member.training_end_date;
        document.getElementById("members-password-input").value =
          member.password;
      }
    } else {
      membersModalTitle.textContent = "Add Member";
      membersForm.reset();
      // Set default status to inactive
      document.getElementById("members-status-select").value = "inactive";
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
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
      name: document.getElementById("members-name-input").value,
      dob: document.getElementById("members-dob-input").value,
      email: document.getElementById("members-email-input").value,
      contact_no: document.getElementById("members-contact-input").value,
      guardian_name: document.getElementById("members-guardian-input").value,
      emergency_contact_no: document.getElementById("members-emergency-input")
        .value,
      medical_conditions: document.getElementById("members-medical-input")
        .value,
      membership_status: document.getElementById("members-status-select").value,
      plan_start_date: document.getElementById("members-plan-start-input")
        .value,
      plan_end_date: document.getElementById("members-plan-end-input").value,
      training_start_date: document.getElementById(
        "members-training-start-input"
      ).value,
      training_end_date: document.getElementById("members-training-end-input")
        .value,
      password: document.getElementById("members-password-input").value,
      uid: "", // Will be set below
      due: "",
      payment_id: "",
      plan_name: "",
      plan_description: "",
      assigned_trainer_name: "",
    };

    try {
      if (isEditing && currentEditId) {
        // Update existing member
        formData.uid = currentEditId;
        const memberRef = ref(database, `members/${currentEditId}`);
        await update(memberRef, formData);
        showToast("Member updated successfully", "success");
      } else {
        // Add new member
        const newMemberRef = push(membersRef);
        formData.uid = newMemberRef.key;
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
    const statusFilterValue = membersStatusFilter.value;

    let filtered = members;

    // Apply status filter
    if (statusFilterValue !== "all") {
      filtered = filtered.filter(
        (member) => member.membership_status === statusFilterValue
      );
    }

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(searchTerm) ||
          member.email.toLowerCase().includes(searchTerm) ||
          member.contact_no.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  function renderMembersTable() {
    const filteredMembers = getFilteredMembers();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedMembers = filteredMembers.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    // Hide all empty messages first
    membersEmptyMsg.classList.add("hidden");
    membersEmptyActive.classList.add("hidden");
    membersEmptyInactive.classList.add("hidden");
    membersEmptyExpired.classList.add("hidden");
    membersTableBody.innerHTML = "";

    if (filteredMembers.length === 0) {
      membersTableHead.classList.add("hidden");
      membersPagination.classList.add("hidden");

      // Show appropriate empty message based on filter
      const statusFilter = membersStatusFilter.value;
      if (statusFilter === "active") {
        membersEmptyActive.classList.remove("hidden");
      } else if (statusFilter === "inactive") {
        membersEmptyInactive.classList.remove("hidden");
      } else if (statusFilter === "expired") {
        membersEmptyExpired.classList.remove("hidden");
      } else {
        membersEmptyMsg.classList.remove("hidden");
      }
    } else {
      membersTableHead.classList.remove("hidden");
      membersPagination.classList.remove("hidden");

      paginatedMembers.forEach((member) => {
        const row = document.createElement("tr");
        row.className = "border-b border-gray-700 hover:bg-gray-700";

        // Determine status badge color
        let statusClass = "";
        switch (member.membership_status) {
          case "active":
            statusClass = "bg-green-500";
            break;
          case "inactive":
            statusClass = "bg-yellow-500";
            break;
          case "expired":
            statusClass = "bg-red-500";
            break;
          default:
            statusClass = "bg-gray-500";
        }

        row.innerHTML = `
          <td class="px-3 py-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                ${member.name.charAt(0).toUpperCase()}
              </div>
              <span>${member.name}</span>
            </div>
          </td>
          <td class="px-3 py-3">${member.contact_no}</td>
          <td class="px-3 py-3">
            <span class="px-2 py-1 rounded-full text-xs ${statusClass}">
              ${
                member.membership_status.charAt(0).toUpperCase() +
                member.membership_status.slice(1)
              }
            </span>
          </td>
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

    let passwordVisible = false;

    membersViewContent.innerHTML = `
      <div class="flex justify-center mb-4">
        <div class="w-32 h-32 rounded-full bg-indigo-500 flex items-center justify-center text-white text-4xl">
          ${member.name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-gray-400">Member ID</p>
            <p class="font-medium">${member.id}</p>
          </div>
          <div>
            <p class="text-gray-400">Name</p>
            <p class="font-medium">${member.name}</p>
          </div>
          <div>
            <p class="text-gray-400">Date of Birth</p>
            <p class="font-medium">${member.dob}</p>
          </div>
          <div>
            <p class="text-gray-400">Email</p>
            <p class="font-medium">${member.email}</p>
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
            <p class="text-gray-400">Medical Conditions</p>
            <p class="font-medium">${member.medical_conditions || "None"}</p>
          </div>
          <div>
            <p class="text-gray-400">Membership Status</p>
            <p class="font-medium">${
              member.membership_status.charAt(0).toUpperCase() +
              member.membership_status.slice(1)
            }</p>
          </div>
          <div>
            <p class="text-gray-400">Due Amount</p>
            <p class="font-medium">${member.due || "Not set"}</p>
          </div>
          <div>
            <p class="text-gray-400">Payment ID</p>
            <p class="font-medium">${member.payment_id || "Not set"}</p>
          </div>
          <div>
            <p class="text-gray-400">Plan Name</p>
            <p class="font-medium">${member.plan_name || "Not set"}</p>
          </div>
          <div>
            <p class="text-gray-400">Plan Description</p>
            <p class="font-medium">${member.plan_description || "Not set"}</p>
          </div>
          <div>
            <p class="text-gray-400">Plan Start Date</p>
            <p class="font-medium">${member.plan_start_date || "Not set"}</p>
          </div>
          <div>
            <p class="text-gray-400">Plan End Date</p>
            <p class="font-medium">${member.plan_end_date || "Not set"}</p>
          </div>
          <div>
            <p class="text-gray-400">Assigned Trainer</p>
            <p class="font-medium">${
              member.assigned_trainer_name || "Not assigned"
            }</p>
          </div>
          <div>
            <p class="text-gray-400">Training Start Date</p>
            <p class="font-medium">${
              member.training_start_date || "Not set"
            }</p>
          </div>
          <div>
            <p class="text-gray-400">Training End Date</p>
            <p class="font-medium">${member.training_end_date || "Not set"}</p>
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
