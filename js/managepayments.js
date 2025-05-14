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
  const paymentsGenerateBillBtn = document.getElementById(
    "payments-generate-bill"
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

    // Status/Validity filter
    paymentsStatusFilter.addEventListener("change", () => {
      currentPage = 1;
      renderPaymentsTable();
    });

    paymentsValidityFilter.addEventListener("change", () => {
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
  }

  function loadMembers() {
    onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      allMembers = data
        ? Object.entries(data).map(([id, member]) => ({ id, ...member }))
        : [];

      // Update member dropdown if modal is open
      if (!paymentsModal.classList.contains("hidden")) {
        updateMemberDropdown();
      }
    });
  }

  function loadPlans() {
    onValue(plansRef, (snapshot) => {
      const data = snapshot.val();
      allPlans = data
        ? Object.entries(data).map(([id, plan]) => ({ id, ...plan }))
        : [];

      // Update plan dropdown if modal is open
      if (!paymentsModal.classList.contains("hidden")) {
        updatePlanDropdown();
      }
    });
  }

  function loadTrainers() {
    onValue(trainersRef, (snapshot) => {
      const data = snapshot.val();
      allTrainers = data
        ? Object.entries(data).map(([id, trainer]) => ({ id, ...trainer }))
        : [];

      // Update trainer dropdown if modal is open
      if (!paymentsModal.classList.contains("hidden")) {
        updateTrainerDropdown();
      }
    });
  }

  function updateMemberDropdown() {
    const memberSelectContainer = document.getElementById(
      "payments-member-select-container"
    );
    memberSelectContainer.innerHTML = `
      <div class="relative">
        <input
          type="text"
          id="payments-member-search"
          placeholder="Search members..."
          class="w-full p-2 pl-10 rounded-lg bg-gray-700 text-white placeholder-gray-400"
        />
        <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <i class="fas fa-search"></i>
        </span>
      </div>
      <select
        id="payments-member-select"
        required
        class="hidden"
      ></select>
      <div id="payments-member-dropdown" class="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg bg-gray-700 shadow-lg hidden"></div>
    `;

    const memberSearch = document.getElementById("payments-member-search");
    const memberSelect = document.getElementById("payments-member-select");
    const memberDropdown = document.getElementById("payments-member-dropdown");

    // Clear previous options
    memberSelect.innerHTML = '<option value="">Select a member</option>';

    // Add all members to the hidden select
    allMembers.forEach((member) => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = member.full_name;
      option.setAttribute("data-name", member.full_name);
      memberSelect.appendChild(option);
    });

    // Search functionality
    memberSearch.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();
      memberDropdown.innerHTML = "";

      if (searchTerm.length === 0) {
        memberDropdown.classList.add("hidden");
        return;
      }

      const filteredMembers = allMembers.filter((member) =>
        member.full_name.toLowerCase().includes(searchTerm)
      );

      if (filteredMembers.length === 0) {
        const noResult = document.createElement("div");
        noResult.className = "p-2 text-gray-400";
        noResult.textContent = "No members found";
        memberDropdown.appendChild(noResult);
      } else {
        filteredMembers.forEach((member) => {
          const memberOption = document.createElement("div");
          memberOption.className = "p-2 hover:bg-gray-600 cursor-pointer";
          memberOption.textContent = member.full_name;
          memberOption.addEventListener("click", function () {
            memberSearch.value = member.full_name;
            memberSelect.value = member.id;
            memberDropdown.classList.add("hidden");

            // Auto-fill received_from with member name
            document.getElementById("payments-received-from").value =
              member.full_name;
          });
          memberDropdown.appendChild(memberOption);
        });
      }

      memberDropdown.classList.remove("hidden");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (!memberSelectContainer.contains(e.target)) {
        memberDropdown.classList.add("hidden");
      }
    });
  }

  function updatePlanDropdown() {
    const planSelectContainer = document.getElementById(
      "payments-plan-select-container"
    );
    planSelectContainer.innerHTML = `
      <div class="relative">
        <input
          type="text"
          id="payments-plan-search"
          placeholder="Search plans..."
          class="w-full p-2 pl-10 rounded-lg bg-gray-700 text-white placeholder-gray-400"
        />
        <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <i class="fas fa-search"></i>
        </span>
      </div>
      <select
        id="payments-plan-select"
        required
        class="hidden"
      ></select>
      <div id="payments-plan-dropdown" class="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg bg-gray-700 shadow-lg hidden"></div>
    `;

    const planSearch = document.getElementById("payments-plan-search");
    const planSelect = document.getElementById("payments-plan-select");
    const planDropdown = document.getElementById("payments-plan-dropdown");

    // Clear previous options
    planSelect.innerHTML = '<option value="">Select a plan</option>';

    // Add all plans to the hidden select
    allPlans.forEach((plan) => {
      const option = document.createElement("option");
      option.value = plan.id;
      option.textContent = plan.plan_name;
      option.setAttribute("data-name", plan.plan_name);
      planSelect.appendChild(option);
    });

    // Search functionality
    planSearch.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();
      planDropdown.innerHTML = "";

      if (searchTerm.length === 0) {
        planDropdown.classList.add("hidden");
        return;
      }

      const filteredPlans = allPlans.filter((plan) =>
        plan.plan_name.toLowerCase().includes(searchTerm)
      );

      if (filteredPlans.length === 0) {
        const noResult = document.createElement("div");
        noResult.className = "p-2 text-gray-400";
        noResult.textContent = "No plans found";
        planDropdown.appendChild(noResult);
      } else {
        filteredPlans.forEach((plan) => {
          const planOption = document.createElement("div");
          planOption.className = "p-2 hover:bg-gray-600 cursor-pointer";
          planOption.textContent = plan.plan_name;
          planOption.addEventListener("click", function () {
            planSearch.value = plan.plan_name;
            planSelect.value = plan.id;
            planDropdown.classList.add("hidden");

            // Update plan details when a plan is selected
            updatePlanDetails(plan.id);
          });
          planDropdown.appendChild(planOption);
        });
      }

      planDropdown.classList.remove("hidden");
    });

    // Plan selection change handler
    planSelect.addEventListener("change", function () {
      if (this.value) {
        updatePlanDetails(this.value);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (!planSelectContainer.contains(e.target)) {
        planDropdown.classList.add("hidden");
      }
    });
  }

  function updateTrainerDropdown() {
    const trainerContainer = document.getElementById(
      "payments-trainer-select-container"
    );
    trainerContainer.innerHTML = `
      <div class="relative">
        <input
          type="text"
          id="payments-trainer-search"
          placeholder="Search trainers..."
          class="w-full p-2 pl-10 rounded-lg bg-gray-700 text-white placeholder-gray-400"
        />
        <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <i class="fas fa-search"></i>
        </span>
      </div>
      <select
        id="payments-trainer-select"
        required
        class="hidden"
      ></select>
      <div id="payments-trainer-dropdown" class="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg bg-gray-700 shadow-lg hidden"></div>
    `;

    const trainerSearch = document.getElementById("payments-trainer-search");
    const trainerSelect = document.getElementById("payments-trainer-select");
    const trainerDropdown = document.getElementById(
      "payments-trainer-dropdown"
    );

    // Clear previous options
    trainerSelect.innerHTML = '<option value="">Select a trainer</option>';

    // Add all trainers to the hidden select
    allTrainers.forEach((trainer) => {
      const option = document.createElement("option");
      option.value = trainer.id;
      option.textContent = trainer.name;
      option.setAttribute("data-name", trainer.name);
      trainerSelect.appendChild(option);
    });

    // Search functionality
    trainerSearch.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();
      trainerDropdown.innerHTML = "";

      if (searchTerm.length === 0) {
        trainerDropdown.classList.add("hidden");
        return;
      }

      const filteredTrainers = allTrainers.filter((trainer) =>
        trainer.name.toLowerCase().includes(searchTerm)
      );

      if (filteredTrainers.length === 0) {
        const noResult = document.createElement("div");
        noResult.className = "p-2 text-gray-400";
        noResult.textContent = "No trainers found";
        trainerDropdown.appendChild(noResult);
      } else {
        filteredTrainers.forEach((trainer) => {
          const trainerOption = document.createElement("div");
          trainerOption.className = "p-2 hover:bg-gray-600 cursor-pointer";
          trainerOption.textContent = trainer.name;
          trainerOption.addEventListener("click", function () {
            trainerSearch.value = trainer.name;
            trainerSelect.value = trainer.id;
            trainerDropdown.classList.add("hidden");
          });
          trainerDropdown.appendChild(trainerOption);
        });
      }

      trainerDropdown.classList.remove("hidden");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (!trainerContainer.contains(e.target)) {
        trainerDropdown.classList.add("hidden");
      }
    });
  }

  function updatePlanDetails(planId) {
    const plan = allPlans.find((p) => p.id === planId);
    if (!plan) return;

    // Update total amount
    document.getElementById("payments-total-amount").value = plan.amount;

    // Update plan type and show/hide trainer dropdown
    const trainerContainer = document.getElementById(
      "payments-trainer-container"
    );
    if (plan.plan_type === "Personal Training Plan") {
      trainerContainer.classList.remove("hidden");
      updateTrainerDropdown();
    } else {
      trainerContainer.classList.add("hidden");
    }

    // Calculate and update end date based on start date and plan duration
    const startDateInput = document.getElementById("payments-start-date");
    const endDateInput = document.getElementById("payments-end-date");

    if (startDateInput.value) {
      calculateEndDate(startDateInput.value, plan.plan_duration);
    }

    // Add event listener to start date to recalculate end date when changed
    startDateInput.addEventListener("change", function () {
      if (this.value && planId) {
        calculateEndDate(this.value, plan.plan_duration);
      }
    });

    // Update balance due when amount paid changes
    const amountPaidInput = document.getElementById(
      "payments-pre-booking-amount"
    );
    amountPaidInput.addEventListener("input", function () {
      updateBalanceDue(plan.amount, this.value);
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
    document.getElementById("payments-end-date").value = endDateStr;

    // Update plan validity status
    updateValidityStatus(endDateStr);
  }

  function updateBalanceDue(totalAmount, amountPaid) {
    const total = parseFloat(totalAmount) || 0;
    const paid = parseFloat(amountPaid) || 0;
    const balance = total - paid;

    document.getElementById("payments-balance-due").value = balance.toFixed(2);
    document.getElementById("payments-due-status").value =
      balance > 0 ? "due" : "not_due";
  }

  function updateValidityStatus(endDate) {
    const today = new Date();
    const end = new Date(endDate);
    const validityStatus = today <= end ? "active" : "expired";
    document.getElementById("payments-validity-status").value = validityStatus;
  }

  function loadPaymentRecords() {
    onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val();
      paymentRecords = data
        ? Object.entries(data).map(([id, record]) => ({ id, ...record }))
        : [];
      renderPaymentsTable();
    });
  }

  function openPaymentModal(editing, recordId = null) {
    isEditing = editing;
    currentEditId = recordId;

    // Update dropdowns
    updateMemberDropdown();
    updatePlanDropdown();

    if (editing && recordId) {
      paymentsModalTitle.textContent = "Edit Payment Record";
      const record = paymentRecords.find((r) => r.id === recordId);
      if (record) {
        // Fill form with record data
        document.getElementById("payments-member-search").value =
          record.member_name;
        document.getElementById("payments-member-select").value =
          record.member_uid;
        document.getElementById("payments-received-from").value =
          record.received_from;
        document.getElementById("payments-received-by").value =
          record.received_by;
        document.getElementById("payments-date-paid").value = record.date_paid;
        document.getElementById("payments-method").value =
          record.payment_method;
        document.getElementById("payments-plan-search").value =
          record.plan_name;
        document.getElementById("payments-plan-select").value = record.plan_uid;
        document.getElementById("payments-start-date").value =
          record.start_date;
        document.getElementById("payments-end-date").value = record.end_date;
        document.getElementById("payments-total-amount").value =
          record.total_amount;
        document.getElementById("payments-pre-booking-amount").value =
          record.pre_booking_amount;
        document.getElementById("payments-balance-due").value =
          record.balance_due;
        document.getElementById("payments-due-status").value =
          record.due_status;
        document.getElementById("payments-validity-status").value =
          record.plan_validity_status;

        // Show trainer dropdown if plan type is personal training
        if (record.plan_type === "Personal Training Plan") {
          document
            .getElementById("payments-trainer-container")
            .classList.remove("hidden");
          document.getElementById("payments-trainer-search").value =
            record.assigned_trainer_name || "";
          document.getElementById("payments-trainer-select").value =
            record.assigned_trainer_uid || "";
        }
      }
    } else {
      paymentsModalTitle.textContent = "Add Payment Record";
      paymentsForm.reset();

      // Set default values
      const today = new Date().toISOString().split("T")[0];
      document.getElementById("payments-date-paid").value = today;
      document.getElementById("payments-method").value = "cash";
      document.getElementById("payments-due-status").value = "not_due";
      document.getElementById("payments-validity-status").value = "active";
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
    excludeId = null
  ) {
    return paymentRecords.some((record) => {
      return (
        record.member_uid === memberId &&
        record.plan_uid === planId &&
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

    // Check for duplicate record (same member, same plan, same start date)
    const isDuplicate = await checkDuplicateRecord(
      memberSelect.value,
      planSelect.value,
      startDate.value,
      isEditing ? currentEditId : null
    );

    if (isDuplicate) {
      showToast(
        "This member already has the same plan starting on this date",
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
    } catch (error) {
      console.error("Error deleting payment record:", error);
      showToast("Failed to delete payment record", "error");
    }

    recordToDelete = null;
  }

  function getFilteredRecords() {
    const searchTerm = paymentsSearchInput.value.toLowerCase();
    const statusFilter = paymentsStatusFilter.value;
    const validityFilter = paymentsValidityFilter.value;

    return paymentRecords.filter((record) => {
      // Search filter
      const matchesSearch = searchTerm
        ? record.member_name.toLowerCase().includes(searchTerm)
        : true;

      // Status filter
      const matchesStatus = statusFilter
        ? record.due_status === statusFilter
        : true;

      // Validity filter
      const matchesValidity = validityFilter
        ? record.plan_validity_status === validityFilter
        : true;

      return matchesSearch && matchesStatus && matchesValidity;
    });
  }

  function renderPaymentsTable() {
    const filteredRecords = getFilteredRecords();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRecords = filteredRecords.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    paymentsTableBody.innerHTML = "";

    if (filteredRecords.length === 0) {
      paymentsEmptyMsg.classList.remove("hidden");
      paymentsTableHead.classList.add("hidden");
      paymentsPagination.classList.add("hidden");
    } else {
      paymentsEmptyMsg.classList.add("hidden");
      paymentsTableHead.classList.remove("hidden");
      paymentsPagination.classList.remove("hidden");

      paginatedRecords.forEach((record) => {
        const row = document.createElement("tr");
        row.className = "border-b border-gray-700 hover:bg-gray-700";

        // Status badge color
        const dueStatusClass =
          record.due_status === "due" ? "bg-red-500" : "bg-green-500";
        const validityStatusClass =
          record.plan_validity_status === "active"
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
            <span class="px-2 py-1 rounded-full text-xs ${dueStatusClass}">${
          record.due_status === "due" ? "Due" : "Not Due"
        }</span>
          </td>
          <td class="px-3 py-3">
            <span class="px-2 py-1 rounded-full text-xs ${validityStatusClass}">${
          record.plan_validity_status === "active" ? "Active" : "Expired"
        }</span>
          </td>
          <td class="px-3 py-3">
            <div class="flex gap-2">
              <button class="payments-view-btn p-1 text-indigo-400 hover:text-indigo-300" data-id="${
                record.id
              }">
                <i class="fas fa-eye"></i>
              </button>
              <button class="payments-edit-btn p-1 text-blue-400 hover:text-blue-300" data-id="${
                record.id
              }">
                <i class="fas fa-edit"></i>
              </button>
              <button class="payments-delete-btn p-1 text-red-400 hover:text-red-300" data-id="${
                record.id
              }">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        paymentsTableBody.appendChild(row);
      });

      // Add event listeners to the buttons
      document.querySelectorAll(".payments-view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          viewRecord(e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".payments-edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          openPaymentModal(true, e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".payments-delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          showDeleteConfirmation(e.target.closest("button").dataset.id)
        );
      });
    }

    // Update pagination buttons
    paymentsPrevBtn.disabled = currentPage === 1;
    paymentsNextBtn.disabled =
      currentPage * itemsPerPage >= filteredRecords.length;
  }

  function viewRecord(recordId) {
    const record = paymentRecords.find((r) => r.id === recordId);
    if (!record) return;

    // Format dates for display
    const formattedDatePaid = record.date_paid
      ? new Date(record.date_paid).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "--";

    const formattedStartDate = record.start_date
      ? new Date(record.start_date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "--";

    const formattedEndDate = record.end_date
      ? new Date(record.end_date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "--";

    // Status badge color
    const dueStatusClass =
      record.due_status === "due" ? "bg-red-500" : "bg-green-500";
    const validityStatusClass =
      record.plan_validity_status === "active" ? "bg-green-500" : "bg-red-500";

    let trainerSection = "";
    if (record.plan_type === "Personal Training Plan") {
      trainerSection = `
        <div>
          <p class="text-gray-400">Assigned Trainer</p>
          <p class="font-medium">${record.assigned_trainer_name || "--"}</p>
        </div>
        <div>
          <p class="text-gray-400">Trainer ID</p>
          <p class="font-medium">${record.assigned_trainer_uid || "--"}</p>
        </div>
      `;
    }

    paymentsViewContent.innerHTML = `
      <div class="flex justify-center mb-4">
        <div class="w-32 h-32 rounded-full bg-indigo-500 flex items-center justify-center text-white text-4xl">
          ${record.member_name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div class="space-y-4">
        <div>
          <p class="text-gray-400">Payment ID</p>
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
          <p class="text-gray-400">Received From</p>
          <p class="font-medium">${record.received_from}</p>
        </div>
        <div>
          <p class="text-gray-400">Received By</p>
          <p class="font-medium">${record.received_by}</p>
        </div>
        <div>
          <p class="text-gray-400">Date Paid</p>
          <p class="font-medium">${formattedDatePaid}</p>
        </div>
        <div>
          <p class="text-gray-400">Payment Method</p>
          <p class="font-medium">${
            record.payment_method.charAt(0).toUpperCase() +
            record.payment_method.slice(1)
          }</p>
        </div>
        <div>
          <p class="text-gray-400">Plan Name</p>
          <p class="font-medium">${record.plan_name}</p>
        </div>
        <div>
          <p class="text-gray-400">Plan ID</p>
          <p class="font-medium">${record.plan_uid}</p>
        </div>
        <div>
          <p class="text-gray-400">Plan Type</p>
          <p class="font-medium">${record.plan_type}</p>
        </div>
        <div>
          <p class="text-gray-400">Plan Duration</p>
          <p class="font-medium">${record.plan_duration}</p>
        </div>
        <div>
          <p class="text-gray-400">Start Date</p>
          <p class="font-medium">${formattedStartDate}</p>
        </div>
        <div>
          <p class="text-gray-400">End Date</p>
          <p class="font-medium">${formattedEndDate}</p>
        </div>
        <div>
          <p class="text-gray-400">Total Amount</p>
          <p class="font-medium">₹${parseFloat(record.total_amount).toFixed(
            2
          )}</p>
        </div>
        <div>
          <p class="text-gray-400">Amount Paid</p>
          <p class="font-medium">₹${parseFloat(
            record.pre_booking_amount
          ).toFixed(2)}</p>
        </div>
        <div>
          <p class="text-gray-400">Balance Due</p>
          <p class="font-medium">₹${parseFloat(record.balance_due).toFixed(
            2
          )}</p>
        </div>
        <div>
          <p class="text-gray-400">Due Status</p>
          <p class="font-medium"><span class="px-3 py-1 rounded-full text-sm ${dueStatusClass}">${
      record.due_status === "due" ? "Due" : "Not Due"
    }</span></p>
        </div>
        <div>
          <p class="text-gray-400">Plan Validity Status</p>
          <p class="font-medium"><span class="px-3 py-1 rounded-full text-sm ${validityStatusClass}">${
      record.plan_validity_status === "active" ? "Active" : "Expired"
    }</span></p>
        </div>
        ${trainerSection}
      </div>
    `;

    // Set the record ID for the generate bill button
    paymentsGenerateBillBtn.dataset.id = recordId;

    paymentsViewModal.classList.remove("hidden");
  }

  function generateBillPDF() {
    const recordId = paymentsGenerateBillBtn.dataset.id;
    const record = paymentRecords.find((r) => r.id === recordId);
    if (!record) return;

    // Access jsPDF from the global namespace
    const { jsPDF } = window.jspdf;

    // Create a new PDF document
    const doc = new jsPDF();

    // Add logo or header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text("GYM MANAGEMENT SYSTEM", 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Payment Receipt", 105, 30, { align: "center" });

    // Add line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 35, 190, 35);

    // Bill information
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(`Receipt No: ${record.id}`, 20, 45);
    doc.text(
      `Date: ${new Date(record.date_paid).toLocaleDateString()}`,
      160,
      45
    );

    // Member information
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Member Information:", 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${record.member_name}`, 20, 70);
    doc.text(`Member ID: ${record.member_uid}`, 20, 80);

    // Define the Rupee symbol correctly (UTF-8)
    const rupeeSymbol = "Rs.";

    // Payment details
    doc.setFont("helvetica", "bold");
    doc.text("Payment Details:", 20, 100);
    doc.setFont("helvetica", "normal");

    // Create payment details table with correct Rupee symbol
    const paymentData = [
      ["Plan Name", record.plan_name],
      ["Plan Type", record.plan_type],
      ["Plan Duration", record.plan_duration],
      ["Start Date", new Date(record.start_date).toLocaleDateString()],
      ["End Date", new Date(record.end_date).toLocaleDateString()],
      [
        "Payment Method",
        record.payment_method.charAt(0).toUpperCase() +
          record.payment_method.slice(1),
      ],
      [
        "Total Amount",
        `${rupeeSymbol}${parseFloat(record.total_amount).toFixed(2)}`,
      ],
      [
        "Amount Paid",
        `${rupeeSymbol}${parseFloat(record.pre_booking_amount).toFixed(2)}`,
      ],
      [
        "Balance Due",
        `${rupeeSymbol}${parseFloat(record.balance_due).toFixed(2)}`,
      ],
      ["Due Status", record.due_status === "due" ? "Due" : "Paid in Full"],
      [
        "Plan Status",
        record.plan_validity_status === "active" ? "Active" : "Expired",
      ],
    ];

    // Include trainer info if applicable
    if (
      record.plan_type === "Personal Training Plan" &&
      record.assigned_trainer_name
    ) {
      paymentData.splice(2, 0, [
        "Assigned Trainer",
        record.assigned_trainer_name,
      ]);
    }

    // Generate the AutoTable
    doc.autoTable({
      startY: 105,
      head: [["Description", "Value"]],
      body: paymentData,
      margin: { left: 20 },
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [70, 130, 180], textColor: 255 },
      columnStyles: { 0: { fontStyle: "bold" } },
    });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Thank you for your payment!",
      105,
      doc.lastAutoTable.finalY + 15,
      { align: "center" }
    );
    doc.text(
      "This is a computer-generated receipt and does not require a signature.",
      105,
      doc.lastAutoTable.finalY + 25,
      { align: "center" }
    );

    // Save the PDF
    doc.save(`Payment_Receipt_${record.id}.pdf`);
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

    paymentsToastContainer.appendChild(toast);

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
