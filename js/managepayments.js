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

// Import jsPDF for PDF generation
import "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
import "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js";

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const paymentsTableBody = document.getElementById("payments-table-body");
  const paymentsEmptyMsg = document.getElementById("payments-empty-msg");
  const paymentsAddBtn = document.getElementById("payments-add-btn");
  const paymentsModal = document.getElementById("payments-modal");
  const paymentsCloseModal = document.getElementById("payments-close-modal");
  const paymentsForm = document.getElementById("payments-form");
  const paymentsModalTitle = document.getElementById("payments-modal-title");
  const paymentsSearchInput = document.getElementById("payments-search-input");
  const paymentsViewModal = document.getElementById("payments-view-modal");
  const paymentsCloseView = document.getElementById("payments-close-view");
  const paymentsViewContent = document.getElementById("payments-view-content");
  const paymentsPrevBtn = document.getElementById("payments-prev-page");
  const paymentsNextBtn = document.getElementById("payments-next-page");
  const paymentsToastContainer = document.getElementById(
    "payments-toast-container"
  );
  const paymentsTableHead = document.getElementById("payments-table-head");
  const paymentsPagination = document.getElementById("payments-pagination");
  const paymentsConfirmDelete = document.getElementById(
    "payments-confirm-delete"
  );
  const paymentsConfirmDeleteBtn = document.getElementById(
    "payments-confirm-delete-btn"
  );
  const paymentsCancelDelete = document.getElementById(
    "payments-cancel-delete"
  );
  const paymentsStatusFilter = document.getElementById(
    "payments-status-filter"
  );
  const paymentsValidityFilter = document.getElementById(
    "payments-validity-filter"
  );
  const paymentsPlanTypeFilter = document.getElementById(
    "payments-plan-type-filter"
  );
  const paymentsGenerateBillBtn = document.getElementById(
    "payments-generate-bill"
  );

  // Form elements
  const paymentsMemberSelect = document.getElementById(
    "payments-member-select"
  );
  const paymentsPlanSelect = document.getElementById("payments-plan-select");
  const paymentsTrainerSelect = document.getElementById(
    "payments-trainer-select"
  );
  const paymentsTrainerContainer = document.getElementById(
    "payments-trainer-container"
  );
  const paymentsStartDate = document.getElementById("payments-start-date");
  const paymentsEndDate = document.getElementById("payments-end-date");
  const paymentsAmountPaid = document.getElementById(
    "payments-pre-booking-amount"
  );
  const paymentsTotalAmount = document.getElementById("payments-total-amount");
  const paymentsBalanceDue = document.getElementById("payments-balance-due");
  const paymentsDueStatus = document.getElementById("payments-due-status");
  const paymentsValidityStatus = document.getElementById(
    "payments-validity-status"
  );

  // State variables
  let paymentRecords = [];
  let allMembers = [];
  let allPlans = [];
  let allTrainers = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let isEditing = false;
  let currentEditId = null;
  let recordToDelete = null;
  const paymentsRef = ref(database, "member_payments");
  const membersRef = ref(database, "members");
  const plansRef = ref(database, "plans");
  const trainersRef = ref(database, "trainers");

  // Initialize
  setupEventListeners();
  loadPaymentRecords();
  loadMembers();
  loadPlans();
  loadTrainers();

  // Functions
  function setupEventListeners() {
    // Modal controls
    paymentsAddBtn.addEventListener("click", () => openPaymentModal(false));
    paymentsCloseModal.addEventListener("click", closePaymentModal);
    paymentsCloseView.addEventListener("click", () =>
      paymentsViewModal.classList.add("hidden")
    );

    // Delete confirmation modal
    paymentsConfirmDeleteBtn.addEventListener("click", confirmDelete);
    paymentsCancelDelete.addEventListener("click", () =>
      paymentsConfirmDelete.classList.add("hidden")
    );

    // Form submission
    paymentsForm.addEventListener("submit", handleFormSubmit);

    // Search functionality
    paymentsSearchInput.addEventListener("input", () => {
      currentPage = 1;
      renderPaymentsTable();
    });

    // Filters
    paymentsStatusFilter.addEventListener("change", () => {
      currentPage = 1;
      renderPaymentsTable();
    });

    paymentsValidityFilter.addEventListener("change", () => {
      currentPage = 1;
      renderPaymentsTable();
    });

    paymentsPlanTypeFilter.addEventListener("change", () => {
      currentPage = 1;
      renderPaymentsTable();
    });

    // Pagination
    paymentsPrevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderPaymentsTable();
      }
    });

    paymentsNextBtn.addEventListener("click", () => {
      const filteredRecords = getFilteredRecords();
      if (currentPage * itemsPerPage < filteredRecords.length) {
        currentPage++;
        renderPaymentsTable();
      }
    });

    // Generate bill
    paymentsGenerateBillBtn.addEventListener("click", generateBillPDF);

    // Member select change
    paymentsMemberSelect.addEventListener("change", function () {
      const selectedMember = allMembers.find((m) => m.id === this.value);
      if (selectedMember) {
        document.getElementById("payments-member-uid").textContent =
          selectedMember.id;
        document
          .getElementById("payments-member-uid-container")
          .classList.remove("hidden");
        document.getElementById("payments-received-from").value =
          selectedMember.full_name;
      } else {
        document
          .getElementById("payments-member-uid-container")
          .classList.add("hidden");
      }
    });

    // Plan select change
    paymentsPlanSelect.addEventListener("change", function () {
      const selectedPlan = allPlans.find((p) => p.id === this.value);
      if (selectedPlan) {
        document.getElementById("payments-plan-type").textContent =
          selectedPlan.plan_type;
        document
          .getElementById("payments-plan-type-container")
          .classList.remove("hidden");
        paymentsTotalAmount.value = selectedPlan.amount;

        // Show/hide trainer container based on plan type
        if (selectedPlan.plan_type === "Personal Training Plan") {
          paymentsTrainerContainer.classList.remove("hidden");
          paymentsTrainerSelect.required = true;
        } else {
          paymentsTrainerContainer.classList.add("hidden");
          paymentsTrainerSelect.required = false;
          paymentsTrainerSelect.value = ""; // Clear trainer selection
          document
            .getElementById("payments-trainer-uid-container")
            .classList.add("hidden");
        }

        // If start date is set, calculate end date
        if (paymentsStartDate.value) {
          calculateEndDate(paymentsStartDate.value, selectedPlan.plan_duration);
        }
      } else {
        document
          .getElementById("payments-plan-type-container")
          .classList.add("hidden");
        paymentsTrainerContainer.classList.add("hidden");
        paymentsTrainerSelect.required = false;
      }
    });

    // Trainer select change
    paymentsTrainerSelect.addEventListener("change", function () {
      const selectedTrainer = allTrainers.find((t) => t.id === this.value);
      if (selectedTrainer) {
        document.getElementById("payments-trainer-uid").textContent =
          selectedTrainer.id;
        document
          .getElementById("payments-trainer-uid-container")
          .classList.remove("hidden");
      } else {
        document
          .getElementById("payments-trainer-uid-container")
          .classList.add("hidden");
      }
    });

    // Amount paid input change
    paymentsAmountPaid.addEventListener("input", updateBalanceDue);

    // Start date change (both in add and edit mode)
    paymentsStartDate.addEventListener("change", function () {
      const selectedPlan = allPlans.find(
        (p) => p.id === paymentsPlanSelect.value
      );
      if (selectedPlan && this.value) {
        calculateEndDate(this.value, selectedPlan.plan_duration);
      }
    });
  }

  function loadMembers() {
    onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      allMembers = data
        ? Object.entries(data).map(([id, member]) => ({ id, ...member }))
        : [];

      // Update member dropdown
      updateMemberDropdown();
    });
  }

  function loadPlans() {
    onValue(plansRef, (snapshot) => {
      const data = snapshot.val();
      allPlans = data
        ? Object.entries(data).map(([id, plan]) => ({ id, ...plan }))
        : [];

      // Update plan dropdown
      updatePlanDropdown();
    });
  }

  function loadTrainers() {
    onValue(trainersRef, (snapshot) => {
      const data = snapshot.val();
      allTrainers = data
        ? Object.entries(data).map(([id, trainer]) => ({ id, ...trainer }))
        : [];

      // Update trainer dropdown
      updateTrainerDropdown();
    });
  }

  function updateMemberDropdown() {
    // Clear previous options
    paymentsMemberSelect.innerHTML =
      '<option value="">Select a member</option>';

    // Add all members to the select
    allMembers.forEach((member) => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = member.full_name;
      paymentsMemberSelect.appendChild(option);
    });
  }

  function updatePlanDropdown() {
    // Clear previous options
    paymentsPlanSelect.innerHTML = '<option value="">Select a plan</option>';

    // Add all plans to the select
    allPlans.forEach((plan) => {
      const option = document.createElement("option");
      option.value = plan.id;
      option.textContent = `${plan.plan_name} (${plan.plan_type})`;
      paymentsPlanSelect.appendChild(option);
    });
  }

  function updateTrainerDropdown() {
    // Clear previous options
    paymentsTrainerSelect.innerHTML =
      '<option value="">Select a trainer</option>';

    // Add all trainers to the select
    allTrainers.forEach((trainer) => {
      const option = document.createElement("option");
      option.value = trainer.id;
      option.textContent = trainer.name;
      paymentsTrainerSelect.appendChild(option);
    });
  }

  function calculateEndDate(startDate, duration) {
    const start = new Date(startDate);
    let end = new Date(start);

    // Parse duration (e.g., "1 month", "3 months", "12 months", "1 day")
    const durationParts = duration.split(" ");
    const durationValue = parseInt(durationParts[0]);
    const durationUnit = durationParts[1].toLowerCase();

    if (durationUnit.includes("month")) {
      end.setMonth(start.getMonth() + durationValue);
    } else if (durationUnit.includes("day")) {
      end.setDate(start.getDate() + durationValue);
    } else if (durationUnit.includes("year")) {
      end.setFullYear(start.getFullYear() + durationValue);
    } else if (durationUnit.includes("week")) {
      end.setDate(start.getDate() + durationValue * 7);
    }

    // Format as YYYY-MM-DD
    const endDateStr = end.toISOString().split("T")[0];
    paymentsEndDate.value = endDateStr;

    // Update plan validity status based on current date
    updateValidityStatus(endDateStr);
  }

  function updateBalanceDue() {
    const total = parseFloat(paymentsTotalAmount.value) || 0;
    const paid = parseFloat(paymentsAmountPaid.value) || 0;
    const balance = total - paid;

    paymentsBalanceDue.value = balance.toFixed(2);
    paymentsDueStatus.value = balance > 0 ? "due" : "not_due";
  }

  function updateValidityStatus(endDate) {
    const today = new Date();
    const end = new Date(endDate);
    const validityStatus = today <= end ? "active" : "expired";
    paymentsValidityStatus.value = validityStatus;
  }

  function loadPaymentRecords() {
    onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val();
      paymentRecords = data
        ? Object.entries(data).map(([id, record]) => ({ id, ...record }))
        : [];

      // Update validity status for all records based on current date
      paymentRecords.forEach((record) => {
        record.plan_validity_status =
          new Date(record.end_date) >= new Date() ? "active" : "expired";
      });

      renderPaymentsTable();
    });
  }

  function openPaymentModal(editing, recordId = null) {
    isEditing = editing;
    currentEditId = recordId;

    // Update dropdowns
    updateMemberDropdown();
    updatePlanDropdown();
    updateTrainerDropdown();

    if (editing && recordId) {
      paymentsModalTitle.textContent = "Edit Payment Record";
      const record = paymentRecords.find((r) => r.id === recordId);
      if (record) {
        // Fill form with record data
        paymentsMemberSelect.value = record.member_uid;
        document.getElementById("payments-member-uid").textContent =
          record.member_uid;
        document
          .getElementById("payments-member-uid-container")
          .classList.remove("hidden");
        document.getElementById("payments-received-from").value =
          record.received_from;
        document.getElementById("payments-received-by").value =
          record.received_by;
        document.getElementById("payments-date-paid").value = record.date_paid;
        document.getElementById("payments-method").value =
          record.payment_method;
        paymentsPlanSelect.value = record.plan_uid;
        document.getElementById("payments-plan-type").textContent =
          record.plan_type;
        document
          .getElementById("payments-plan-type-container")
          .classList.remove("hidden");
        paymentsStartDate.value = record.start_date;
        paymentsEndDate.value = record.end_date;
        paymentsTotalAmount.value = record.total_amount;
        paymentsAmountPaid.value = record.pre_booking_amount;
        paymentsBalanceDue.value = record.balance_due;
        paymentsDueStatus.value = record.due_status;
        paymentsValidityStatus.value = record.plan_validity_status;

        // Make end date editable in edit mode
        paymentsEndDate.readOnly = false;

        // Show trainer dropdown if plan type is personal training
        if (record.plan_type === "Personal Training Plan") {
          paymentsTrainerContainer.classList.remove("hidden");
          paymentsTrainerSelect.value = record.assigned_trainer_uid || "";
          document.getElementById("payments-trainer-uid").textContent =
            record.assigned_trainer_uid || "";
          document
            .getElementById("payments-trainer-uid-container")
            .classList.remove("hidden");
          paymentsTrainerSelect.required = true;
        } else {
          paymentsTrainerContainer.classList.add("hidden");
          paymentsTrainerSelect.required = false;
        }
      }
    } else {
      paymentsModalTitle.textContent = "Add Payment Record";
      paymentsForm.reset();

      // Set default values
      const today = new Date().toISOString().split("T")[0];
      document.getElementById("payments-date-paid").value = today;
      document.getElementById("payments-method").value = "cash";
      paymentsDueStatus.value = "not_due";
      paymentsValidityStatus.value = "active";

      // Make end date read-only in add mode
      paymentsEndDate.readOnly = true;

      // Hide UID containers
      document
        .getElementById("payments-member-uid-container")
        .classList.add("hidden");
      document
        .getElementById("payments-plan-type-container")
        .classList.add("hidden");
      document
        .getElementById("payments-trainer-uid-container")
        .classList.add("hidden");
      paymentsTrainerContainer.classList.add("hidden");
      paymentsTrainerSelect.required = false;
    }

    paymentsModal.classList.remove("hidden");
  }

  function closePaymentModal() {
    paymentsModal.classList.add("hidden");
    isEditing = false;
    currentEditId = null;
    paymentsForm.reset();
  }

  async function checkDuplicateRecord(
    memberId,
    planId,
    startDate,
    planType,
    excludeId = null
  ) {
    return paymentRecords.some((record) => {
      return (
        record.member_uid === memberId &&
        record.plan_type === planType &&
        record.start_date === startDate &&
        record.id !== excludeId
      );
    });
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const memberSelect = document.getElementById("payments-member-select");
    const planSelect = document.getElementById("payments-plan-select");
    const receivedFrom = document.getElementById("payments-received-from");
    const receivedBy = document.getElementById("payments-received-by");
    const datePaid = document.getElementById("payments-date-paid");
    const paymentMethod = document.getElementById("payments-method");
    const startDate = document.getElementById("payments-start-date");
    const endDate = document.getElementById("payments-end-date");
    const totalAmount = document.getElementById("payments-total-amount");
    const amountPaid = document.getElementById("payments-pre-booking-amount");
    const balanceDue = document.getElementById("payments-balance-due");
    const dueStatus = document.getElementById("payments-due-status");
    const validityStatus = document.getElementById("payments-validity-status");
    const trainerSelect = document.getElementById("payments-trainer-select");
    const planType = document.getElementById("payments-plan-type").textContent;

    // Validate form
    if (!memberSelect.value) {
      showToast("Please select a member", "error");
      return;
    }

    if (!planSelect.value) {
      showToast("Please select a plan", "error");
      return;
    }

    if (!receivedFrom.value) {
      showToast("Please enter received from", "error");
      return;
    }

    if (!receivedBy.value) {
      showToast("Please enter received by", "error");
      return;
    }

    if (!datePaid.value) {
      showToast("Please select payment date", "error");
      return;
    }

    if (!startDate.value) {
      showToast("Please select start date", "error");
      return;
    }

    if (!amountPaid.value || parseFloat(amountPaid.value) <= 0) {
      showToast("Please enter a valid amount paid", "error");
      return;
    }

    const selectedPlan = allPlans.find((p) => p.id === planSelect.value);
    if (!selectedPlan) {
      showToast("Invalid plan selected", "error");
      return;
    }

    // Validate amount paid doesn't exceed total amount
    if (parseFloat(amountPaid.value) > parseFloat(totalAmount.value)) {
      showToast("Amount paid cannot be greater than total amount", "error");
      return;
    }

    // Validate trainer is selected for personal training plan
    if (
      selectedPlan.plan_type === "Personal Training Plan" &&
      !trainerSelect.value
    ) {
      showToast("Please select a trainer for personal training plan", "error");
      return;
    }

    // Check for duplicate record (same member, same plan type, same start date)
    const isDuplicate = await checkDuplicateRecord(
      memberSelect.value,
      planSelect.value,
      startDate.value,
      selectedPlan.plan_type,
      isEditing ? currentEditId : null
    );

    if (isDuplicate) {
      showToast(
        "This member already has the same plan type starting on this date",
        "error"
      );
      return;
    }

    const formData = {
      payment_uid: "", // Will be set below
      member_uid: memberSelect.value,
      member_name:
        allMembers.find((m) => m.id === memberSelect.value)?.full_name || "",
      received_from: receivedFrom.value,
      received_by: receivedBy.value,
      date_paid: datePaid.value,
      payment_method: paymentMethod.value,
      plan_uid: planSelect.value,
      plan_name: selectedPlan.plan_name,
      plan_type: selectedPlan.plan_type,
      plan_duration: selectedPlan.plan_duration,
      start_date: startDate.value,
      end_date: endDate.value,
      total_amount: totalAmount.value,
      pre_booking_amount: amountPaid.value,
      balance_due: balanceDue.value,
      due_status: dueStatus.value,
      plan_validity_status: validityStatus.value,
    };

    // Add trainer info if it's a personal training plan
    if (
      selectedPlan.plan_type === "Personal Training Plan" &&
      trainerSelect.value
    ) {
      formData.assigned_trainer_uid = trainerSelect.value;
      formData.assigned_trainer_name =
        allTrainers.find((t) => t.id === trainerSelect.value)?.name || "";
    }

    try {
      if (isEditing && currentEditId) {
        // Update existing record
        formData.payment_uid = currentEditId;
        const recordRef = ref(database, `member_payments/${currentEditId}`);
        await update(recordRef, formData);
        showToast("Payment record updated successfully", "success");
      } else {
        // Add new record
        const newRecordRef = push(paymentsRef);
        formData.payment_uid = newRecordRef.key;
        await set(newRecordRef, formData);
        showToast("Payment record added successfully", "success");
      }

      closePaymentModal();
    } catch (error) {
      console.error("Error saving payment record:", error);
      showToast("Failed to save payment record", "error");
    }
  }

  function showDeleteConfirmation(recordId) {
    recordToDelete = recordId;
    paymentsConfirmDelete.classList.remove("hidden");
  }

  async function confirmDelete() {
    if (!recordToDelete) return;

    paymentsConfirmDelete.classList.add("hidden");

    try {
      const recordRef = ref(database, `member_payments/${recordToDelete}`);
      await remove(recordRef);
      showToast("Payment record deleted successfully", "success");
      recordToDelete = null;
    } catch (error) {
      console.error("Error deleting payment record:", error);
      showToast("Failed to delete payment record", "error");
    }
  }

  function getFilteredRecords() {
    const searchTerm = paymentsSearchInput.value.toLowerCase();
    const statusFilter = paymentsStatusFilter.value;
    const validityFilter = paymentsValidityFilter.value;
    const planTypeFilter = paymentsPlanTypeFilter.value;

    return paymentRecords.filter((record) => {
      // Search filter
      const matchesSearch = record.member_name
        .toLowerCase()
        .includes(searchTerm);

      // Status filter
      const matchesStatus = !statusFilter || record.due_status === statusFilter;

      // Validity filter
      const matchesValidity =
        !validityFilter ||
        (validityFilter === "active"
          ? new Date(record.end_date) >= new Date()
          : new Date(record.end_date) < new Date());

      // Plan type filter
      const matchesPlanType =
        !planTypeFilter || record.plan_type === planTypeFilter;

      return (
        matchesSearch && matchesStatus && matchesValidity && matchesPlanType
      );
    });
  }

  function renderPaymentsTable() {
    const filteredRecords = getFilteredRecords();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRecords = filteredRecords.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    // Clear previous table content
    paymentsTableBody.innerHTML = "";

    // Show empty message if no records
    if (filteredRecords.length === 0) {
      paymentsEmptyMsg.classList.remove("hidden");
      paymentsTableHead.classList.add("hidden");
      paymentsPagination.classList.add("hidden");
      return;
    }

    paymentsEmptyMsg.classList.add("hidden");
    paymentsTableHead.classList.remove("hidden");
    paymentsPagination.classList.remove("hidden");

    // Populate table with records
    paginatedRecords.forEach((record) => {
      const row = document.createElement("tr");
      row.className = "border-b border-gray-700 hover:bg-gray-700";
      row.innerHTML = `
        <td class="px-3 py-4 whitespace-nowrap">
          <div class="flex items-center gap-3">
            <div>
              <div class="font-medium text-white">${record.member_name}</div>
              <div class="text-xs text-gray-400">${record.member_uid}</div>
            </div>
          </div>
        </td>
        <td class="px-3 py-4 whitespace-nowrap">
          <span class="px-2 py-1 text-xs rounded-full ${
            record.due_status === "due"
              ? "bg-red-500/20 text-red-400"
              : "bg-green-500/20 text-green-400"
          }">
            ${record.due_status === "due" ? "Due" : "Not Due"}
          </span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap">
          <span class="px-2 py-1 text-xs rounded-full ${
            record.plan_validity_status === "active"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }">
            ${record.plan_validity_status === "active" ? "Active" : "Expired"}
          </span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-gray-300">
          ${record.plan_type}
        </td>
        <td class="px-3 py-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button 
              class="view-btn p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              data-id="${record.id}"
              title="View"
            >
              <i class="fas fa-eye"></i>
            </button>
            <button 
              class="edit-btn p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
              data-id="${record.id}"
              title="Edit"
            >
              <i class="fas fa-edit"></i>
            </button>
            <button 
              class="delete-btn p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
              data-id="${record.id}"
              title="Delete"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;

      // Add event listeners to buttons
      row
        .querySelector(".view-btn")
        .addEventListener("click", () => viewRecord(record.id));
      row
        .querySelector(".edit-btn")
        .addEventListener("click", () => openPaymentModal(true, record.id));
      row
        .querySelector(".delete-btn")
        .addEventListener("click", () => showDeleteConfirmation(record.id));

      paymentsTableBody.appendChild(row);
    });

    // Update pagination buttons
    paymentsPrevBtn.disabled = currentPage === 1;
    paymentsNextBtn.disabled =
      currentPage * itemsPerPage >= filteredRecords.length;
  }

  function viewRecord(recordId) {
    const record = paymentRecords.find((r) => r.id === recordId);
    if (!record) return;

    paymentsViewContent.innerHTML = `
      <div class="bg-gray-700/50 p-4 rounded-lg">
        <h3 class="font-semibold text-white mb-2">Member Information</h3>
        <p><span class="text-gray-400">Name:</span> ${record.member_name}</p>
        <p><span class="text-gray-400">Member ID:</span> ${
          record.member_uid
        }</p>
      </div>
      
      <div class="bg-gray-700/50 p-4 rounded-lg">
        <h3 class="font-semibold text-white mb-2">Payment Details</h3>
        <p><span class="text-gray-400">Received From:</span> ${
          record.received_from
        }</p>
        <p><span class="text-gray-400">Received By:</span> ${
          record.received_by
        }</p>
        <p><span class="text-gray-400">Date Paid:</span> ${record.date_paid}</p>
        <p><span class="text-gray-400">Payment Method:</span> ${
          record.payment_method
        }</p>
        <p><span class="text-gray-400">Amount Paid:</span> ₹${
          record.pre_booking_amount
        }</p>
        <p><span class="text-gray-400">Balance Due:</span> ₹${
          record.balance_due
        }</p>
        <p><span class="text-gray-400">Due Status:</span> 
          <span class="${
            record.due_status === "due" ? "text-red-400" : "text-green-400"
          }">
            ${record.due_status === "due" ? "Due" : "Not Due"}
          </span>
        </p>
      </div>
      
      <div class="bg-gray-700/50 p-4 rounded-lg">
        <h3 class="font-semibold text-white mb-2">Plan Information</h3>
        <p><span class="text-gray-400">Plan Name:</span> ${record.plan_name}</p>
        <p><span class="text-gray-400">Plan Type:</span> ${record.plan_type}</p>
        <p><span class="text-gray-400">Plan Duration:</span> ${
          record.plan_duration
        }</p>
        <p><span class="text-gray-400">Start Date:</span> ${
          record.start_date
        }</p>
        <p><span class="text-gray-400">End Date:</span> ${record.end_date}</p>
        <p><span class="text-gray-400">Total Amount:</span> ₹${
          record.total_amount
        }</p>
        <p><span class="text-gray-400">Validity Status:</span> 
          <span class="${
            record.plan_validity_status === "active"
              ? "text-green-400"
              : "text-red-400"
          }">
            ${record.plan_validity_status === "active" ? "Active" : "Expired"}
          </span>
        </p>
      </div>
      
      ${
        record.plan_type === "Personal Training Plan" &&
        record.assigned_trainer_name
          ? `
      <div class="bg-gray-700/50 p-4 rounded-lg">
        <h3 class="font-semibold text-white mb-2">Trainer Information</h3>
        <p><span class="text-gray-400">Trainer Name:</span> ${record.assigned_trainer_name}</p>
        <p><span class="text-gray-400">Trainer ID:</span> ${record.assigned_trainer_uid}</p>
      </div>
      `
          : ""
      }
    `;

    // Store record ID for PDF generation
    paymentsGenerateBillBtn.dataset.id = recordId;
    paymentsViewModal.classList.remove("hidden");
  }

  function generateBillPDF() {
    const recordId = paymentsGenerateBillBtn.dataset.id;
    const record = paymentRecords.find((r) => r.id === recordId);
    if (!record) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Set document properties
    doc.setProperties({
      title: `Payment Receipt - ${record.id}`,
      subject: "Gym Membership Payment",
      author: "Your Gym Name",
      keywords: "receipt, payment, gym",
      creator: "Gym Management System",
    });

    // Add background watermark
    doc.setFillColor(240, 240, 240);
    doc.rect(
      0,
      0,
      doc.internal.pageSize.getWidth(),
      doc.internal.pageSize.getHeight(),
      "F"
    );

    // Add header with logo (replace with your actual logo if available)
    doc.setFontSize(24);
    doc.setTextColor(30, 80, 150); // Dark blue
    doc.setFont("helvetica", "bold");
    doc.text("FITNESS HUB", 105, 25, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Premium Fitness Center", 105, 32, { align: "center" });

    // Add decorative line
    doc.setDrawColor(30, 80, 150);
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);

    // Main receipt title
    doc.setFontSize(18);
    doc.setTextColor(30, 80, 150);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT RECEIPT", 105, 50, { align: "center" });

    // Receipt metadata
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`Receipt No: ${record.id}`, 20, 60);
    doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 160, 60, {
      align: "right",
    });

    // Member details section
    doc.setFillColor(30, 80, 150);
    doc.rect(20, 70, 170, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("MEMBER DETAILS", 105, 75, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${record.member_name}`, 25, 85);
    doc.text(`Member ID: ${record.member_uid}`, 25, 90);
    doc.text(`Contact: ${record.member_phone || "N/A"}`, 25, 95);

    // Payment details section
    doc.setFillColor(30, 80, 150);
    doc.rect(20, 105, 170, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT DETAILS", 105, 110, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");

    // Create a table-like structure for payment details
    const paymentDetails = [
      { label: "Plan Enrolled", value: record.plan_name },
      { label: "Plan Type", value: record.plan_type },
      {
        label: "Duration",
        value: `${record.start_date} to ${record.end_date}`,
      },
      { label: "Payment Method", value: record.payment_method },
      { label: "Amount Paid", value: `Rs.${record.pre_booking_amount}` },
      { label: "Balance Due", value: `Rs.${record.balance_due}` },
    ];

    let yPos = 120;
    paymentDetails.forEach((item) => {
      doc.text(`${item.label}:`, 25, yPos);
      doc.text(item.value, 80, yPos);
      yPos += 7;
    });

    // Total amount with highlight
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 80, 150);
    doc.text("Total Amount:", 25, yPos + 10);
    doc.text(`Rs.${record.total_amount}`, 80, yPos + 10);

    // Footer with signature and terms
    doc.setDrawColor(150, 150, 150);
    doc.line(20, yPos + 30, 190, yPos + 30);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your payment!", 105, yPos + 40, {
      align: "center",
    });

    doc.text("___________________", 30, yPos + 50);
    doc.text("Member Signature", 30, yPos + 55);

    doc.text("___________________", 140, yPos + 50);
    doc.text("Authorized Signature", 140, yPos + 55);

    // Terms and conditions
    doc.setFontSize(8);
    doc.text("Terms & Conditions:", 20, yPos + 65);
    doc.text(
      "1. This receipt must be presented for any claims.",
      20,
      yPos + 70
    );
    doc.text("2. Membership is non-transferable.", 20, yPos + 75);
    doc.text("3. For inquiries, contact: info@yourgym.com", 20, yPos + 80);

    // Save the PDF
    doc.save(`Payment_Receipt_${record.id}.pdf`);
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
      type === "success"
        ? "bg-green-500/90 text-white"
        : "bg-red-500/90 text-white"
    }`;
    toast.innerHTML = `
      <i class="fas ${
        type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
      }"></i>
      <span>${message}</span>
    `;

    paymentsToastContainer.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});
