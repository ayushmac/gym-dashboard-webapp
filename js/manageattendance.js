import {
  database,
  ref,
  set,
  push,
  onValue,
  remove,
  update,
  get,
  child,
} from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const attendanceTableBody = document.getElementById("attendance-table-body");
  const attendanceEmptyMsg = document.getElementById("attendance-empty-msg");
  const attendanceAddBtn = document.getElementById("attendance-add-btn");
  const attendanceModal = document.getElementById("attendance-modal");
  const attendanceCloseModal = document.getElementById(
    "attendance-close-modal"
  );
  const attendanceForm = document.getElementById("attendance-form");
  const attendanceModalTitle = document.getElementById(
    "attendance-modal-title"
  );
  const attendanceSearchInput = document.getElementById(
    "attendance-search-input"
  );
  const attendanceViewModal = document.getElementById("attendance-view-modal");
  const attendanceCloseView = document.getElementById("attendance-close-view");
  const attendanceViewContent = document.getElementById(
    "attendance-view-content"
  );
  const attendancePrevBtn = document.getElementById("attendance-prev-page");
  const attendanceNextBtn = document.getElementById("attendance-next-page");
  const attendanceToastContainer = document.getElementById(
    "attendance-toast-container"
  );
  const attendanceTableHead = document.getElementById("attendance-table-head");
  const attendancePagination = document.getElementById("attendance-pagination");
  const attendanceConfirmDelete = document.getElementById(
    "attendance-confirm-delete"
  );
  const attendanceConfirmDeleteBtn = document.getElementById(
    "attendance-confirm-delete-btn"
  );
  const attendanceCancelDelete = document.getElementById(
    "attendance-cancel-delete"
  );
  const attendanceMonthFilter = document.getElementById(
    "attendance-month-filter"
  );
  const attendanceYearFilter = document.getElementById(
    "attendance-year-filter"
  );

  // State variables
  let attendanceRecords = [];
  let allMembers = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let isEditing = false;
  let currentEditId = null;
  let recordToDelete = null;
  const attendanceRef = ref(database, "attendance");
  const membersRef = ref(database, "members");

  // Initialize
  setupEventListeners();
  loadAttendanceRecords();
  loadMembers();

  // Functions
  function setupEventListeners() {
    // Modal controls
    attendanceAddBtn.addEventListener("click", () =>
      openAttendanceModal(false)
    );
    attendanceCloseModal.addEventListener("click", closeAttendanceModal);
    attendanceCloseView.addEventListener("click", () =>
      attendanceViewModal.classList.add("hidden")
    );

    // Delete confirmation modal
    attendanceConfirmDeleteBtn.addEventListener("click", confirmDelete);
    attendanceCancelDelete.addEventListener("click", () =>
      attendanceConfirmDelete.classList.add("hidden")
    );

    // Form submission
    attendanceForm.addEventListener("submit", handleFormSubmit);

    // Search functionality
    attendanceSearchInput.addEventListener("input", () => {
      currentPage = 1;
      renderAttendanceTable();
    });

    // Month/Year filter
    attendanceMonthFilter.addEventListener("change", () => {
      currentPage = 1;
      renderAttendanceTable();
    });

    attendanceYearFilter.addEventListener("change", () => {
      currentPage = 1;
      renderAttendanceTable();
    });

    // Pagination
    attendancePrevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderAttendanceTable();
      }
    });

    attendanceNextBtn.addEventListener("click", () => {
      const filteredRecords = getFilteredRecords();
      if (currentPage * itemsPerPage < filteredRecords.length) {
        currentPage++;
        renderAttendanceTable();
      }
    });
  }

  function loadMembers() {
    onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      allMembers = data
        ? Object.entries(data).map(([id, member]) => ({ id, ...member }))
        : [];

      // Update member dropdown if modal is open
      if (!attendanceModal.classList.contains("hidden")) {
        updateMemberDropdown();
      }
    });
  }

  function updateMemberDropdown() {
    const memberSelect = document.getElementById("attendance-member-select");
    memberSelect.innerHTML = '<option value="">Select a member</option>';

    allMembers.forEach((member) => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = member.full_name;
      memberSelect.appendChild(option);
    });
  }

  function loadAttendanceRecords() {
    onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      attendanceRecords = data
        ? Object.entries(data).map(([id, record]) => ({ id, ...record }))
        : [];
      renderAttendanceTable();
    });
  }

  function openAttendanceModal(editing, recordId = null) {
    isEditing = editing;
    currentEditId = recordId;

    // Update member dropdown
    updateMemberDropdown();

    if (editing && recordId) {
      attendanceModalTitle.textContent = "Edit Attendance Record";
      const record = attendanceRecords.find((r) => r.id === recordId);
      if (record) {
        document.getElementById("attendance-member-select").value =
          record.member_uid;
        document.getElementById("attendance-status-select").value =
          record.attendance_status;
        document.getElementById("attendance-date-input").value =
          record.date_marked;
      }
    } else {
      attendanceModalTitle.textContent = "Add Attendance Record";
      attendanceForm.reset();
      // Set default status to present
      document.getElementById("attendance-status-select").value = "present";
      // Set default date to today
      const today = new Date().toISOString().split("T")[0];
      document.getElementById("attendance-date-input").value = today;
    }

    attendanceModal.classList.remove("hidden");
  }

  function closeAttendanceModal() {
    attendanceModal.classList.add("hidden");
    isEditing = false;
    currentEditId = null;
    attendanceForm.reset();
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const memberSelect = document.getElementById("attendance-member-select");
    const statusSelect = document.getElementById("attendance-status-select");
    const dateInput = document.getElementById("attendance-date-input");

    // Validate form
    if (!memberSelect.value) {
      showToast("Please select a member", "error");
      return;
    }

    if (!dateInput.value) {
      showToast("Please select a date", "error");
      return;
    }

    const selectedMember = allMembers.find((m) => m.id === memberSelect.value);
    if (!selectedMember) {
      showToast("Invalid member selected", "error");
      return;
    }

    const formData = {
      member_uid: memberSelect.value,
      member_name: selectedMember.full_name,
      attendance_status: statusSelect.value,
      date_marked: dateInput.value,
      attendance_uid: "", // Will be set below
    };

    try {
      if (isEditing && currentEditId) {
        // Update existing record
        formData.attendance_uid = currentEditId;
        const recordRef = ref(database, `attendance/${currentEditId}`);
        await update(recordRef, formData);
        showToast("Attendance record updated successfully", "success");
      } else {
        // Add new record
        const newRecordRef = push(attendanceRef);
        formData.attendance_uid = newRecordRef.key;
        await set(newRecordRef, formData);
        showToast("Attendance record added successfully", "success");
      }

      closeAttendanceModal();
    } catch (error) {
      console.error("Error saving attendance record:", error);
      showToast("Failed to save attendance record", "error");
    }
  }

  function showDeleteConfirmation(recordId) {
    recordToDelete = recordId;
    attendanceConfirmDelete.classList.remove("hidden");
  }

  async function confirmDelete() {
    if (!recordToDelete) return;

    attendanceConfirmDelete.classList.add("hidden");

    try {
      const recordRef = ref(database, `attendance/${recordToDelete}`);
      await remove(recordRef);
      showToast("Attendance record deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting attendance record:", error);
      showToast("Failed to delete attendance record", "error");
    }

    recordToDelete = null;
  }

  function getFilteredRecords() {
    const searchTerm = attendanceSearchInput.value.toLowerCase();
    const monthFilter = attendanceMonthFilter.value;
    const yearFilter = attendanceYearFilter.value;

    return attendanceRecords.filter((record) => {
      // Search filter
      const matchesSearch = searchTerm
        ? record.member_name.toLowerCase().includes(searchTerm)
        : true;

      // Month filter
      const matchesMonth = monthFilter
        ? new Date(record.date_marked).getMonth() + 1 === parseInt(monthFilter)
        : true;

      // Year filter
      const matchesYear = yearFilter
        ? new Date(record.date_marked).getFullYear() === parseInt(yearFilter)
        : true;

      return matchesSearch && matchesMonth && matchesYear;
    });
  }

  function renderAttendanceTable() {
    const filteredRecords = getFilteredRecords();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRecords = filteredRecords.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    attendanceTableBody.innerHTML = "";

    if (filteredRecords.length === 0) {
      attendanceEmptyMsg.classList.remove("hidden");
      attendanceTableHead.classList.add("hidden");
      attendancePagination.classList.add("hidden");
    } else {
      attendanceEmptyMsg.classList.add("hidden");
      attendanceTableHead.classList.remove("hidden");
      attendancePagination.classList.remove("hidden");

      paginatedRecords.forEach((record) => {
        const row = document.createElement("tr");
        row.className = "border-b border-gray-700 hover:bg-gray-700";

        // Format date for display
        const formattedDate = record.date_marked
          ? new Date(record.date_marked).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "--";

        // Status badge color
        const statusClass =
          record.attendance_status === "present"
            ? "bg-green-500"
            : "bg-red-500";

        row.innerHTML = `
          <td class="px-3 py-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                ${record.member_name.charAt(0).toUpperCase()}
              </div>
              <span>${record.member_name}</span>
            </div>
          </td>
          <td class="px-3 py-3">
            <span class="px-2 py-1 rounded-full text-xs ${statusClass}">${
          record.attendance_status
        }</span>
          </td>
          <td class="px-3 py-3">${formattedDate}</td>
          <td class="px-3 py-3">
            <div class="flex gap-2">
              <button class="attendance-view-btn p-1 text-indigo-400 hover:text-indigo-300" data-id="${
                record.id
              }">
                <i class="fas fa-eye"></i>
              </button>
              <button class="attendance-edit-btn p-1 text-blue-400 hover:text-blue-300" data-id="${
                record.id
              }">
                <i class="fas fa-edit"></i>
              </button>
              <button class="attendance-delete-btn p-1 text-red-400 hover:text-red-300" data-id="${
                record.id
              }">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        attendanceTableBody.appendChild(row);
      });

      // Add event listeners to the buttons
      document.querySelectorAll(".attendance-view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          viewRecord(e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".attendance-edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          openAttendanceModal(true, e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".attendance-delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          showDeleteConfirmation(e.target.closest("button").dataset.id)
        );
      });
    }

    // Update pagination buttons
    attendancePrevBtn.disabled = currentPage === 1;
    attendanceNextBtn.disabled =
      currentPage * itemsPerPage >= filteredRecords.length;
  }

  function viewRecord(recordId) {
    const record = attendanceRecords.find((r) => r.id === recordId);
    if (!record) return;

    // Format date for display
    const formattedDate = record.date_marked
      ? new Date(record.date_marked).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "--";

    // Status badge color
    const statusClass =
      record.attendance_status === "present" ? "bg-green-500" : "bg-red-500";

    attendanceViewContent.innerHTML = `
      <div class="flex justify-center mb-4">
        <div class="w-32 h-32 rounded-full bg-indigo-500 flex items-center justify-center text-white text-4xl">
          ${record.member_name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div class="space-y-4">
        <div>
          <p class="text-gray-400">Record ID</p>
          <p class="font-medium">${record.id}</p>
        </div>
        <div>
          <p class="text-gray-400">Member Name</p>
          <p class="font-medium">${record.member_name}</p>
        </div>
        <div>
          <p class="text-gray-400">Member ID</p>
          <p class="font-medium">${record.member_uid}</p>
        </div>
        <div>
          <p class="text-gray-400">Attendance Status</p>
          <p class="font-medium"><span class="px-3 py-1 rounded-full text-sm ${statusClass}">${
      record.attendance_status
    }</span></p>
        </div>
        <div>
          <p class="text-gray-400">Date</p>
          <p class="font-medium">${formattedDate}</p>
        </div>
      </div>
    `;

    attendanceViewModal.classList.remove("hidden");
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

    attendanceToastContainer.appendChild(toast);

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

  // Initialize month and year dropdowns
  function initializeFilters() {
    // Month dropdown
    const months = [
      { value: "", text: "All Months" },
      { value: "1", text: "January" },
      { value: "2", text: "February" },
      { value: "3", text: "March" },
      { value: "4", text: "April" },
      { value: "5", text: "May" },
      { value: "6", text: "June" },
      { value: "7", text: "July" },
      { value: "8", text: "August" },
      { value: "9", text: "September" },
      { value: "10", text: "October" },
      { value: "11", text: "November" },
      { value: "12", text: "December" },
    ];

    months.forEach((month) => {
      const option = document.createElement("option");
      option.value = month.value;
      option.textContent = month.text;
      attendanceMonthFilter.appendChild(option);
    });

    // Year dropdown (current year and 5 years before/after)
    const currentYear = new Date().getFullYear();
    attendanceYearFilter.innerHTML = '<option value="">All Years</option>';

    for (let year = currentYear - 5; year <= currentYear + 5; year++) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      if (year === currentYear) option.selected = true;
      attendanceYearFilter.appendChild(option);
    }
  }

  // Initialize filters when page loads
  initializeFilters();
});
