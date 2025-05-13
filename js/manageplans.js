/* manageplans.js – v3.2
   Improved view modal with vertical scrolling and removed UID display */

import { database, ref, push, set, get, child } from "./firebase-config.js";

/* ---------- DOM refs ---------- */
const searchInput = document.getElementById("search-input");
const addBtn = document.getElementById("add-plan-btn");
const modal = document.getElementById("add-plan-modal");
const modalContent = document.getElementById("modal-content");
const closeBtn = document.getElementById("close-modal");
const form = document.getElementById("add-plan-form");
const tblBody = document.getElementById("plans-table-body");
const tblHead = document.querySelector("thead");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const modalTitle = document.getElementById("modal-title");
const noRecordsMsg = document.getElementById("no-records");

// Validation error elements
const nameError = document.getElementById("name-error");
const descError = document.getElementById("desc-error");
const amountError = document.getElementById("amount-error");

/* View modal */
const viewModal = document.getElementById("view-plan-modal");
const viewModalContent = document.getElementById("view-modal-content");
const closeViewBtn = document.getElementById("close-view");

// View modal elements
const viewName = document.getElementById("view-name");
const viewDescription = document.getElementById("view-description");
const viewAmount = document.getElementById("view-amount");
const viewDuration = document.getElementById("view-duration");
const viewType = document.getElementById("view-type");

/* Toast container */
const toastContainer = document.getElementById("plans-toast-container");

/* ---------- state ---------- */
let currentPage = 1;
const pageSize = 10;
let cache = []; // [uid, obj]
let editingUid = null;

/* ---------- helpers ---------- */
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");
const resetForm = () => {
  form.reset();
  hideValidationErrors();
};

const hideValidationErrors = () => {
  hide(nameError);
  hide(descError);
  hide(amountError);
};

/* Enhanced toast functionality */
const showToast = (message, type = "info") => {
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
};

const getToastClass = (type) => {
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
};

const getToastIcon = (type) => {
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
};

/* Prevent modal close when clicking inside content */
modalContent.addEventListener("click", (e) => e.stopPropagation());
viewModalContent.addEventListener("click", (e) => e.stopPropagation());

/* ---------- data ---------- */
const fetchPlans = async () => {
  try {
    const snap = await get(ref(database, "plans"));
    cache = snap.exists() ? Object.entries(snap.val()) : [];
    currentPage = 1;
    filterAndRender();
  } catch (error) {
    showToast("Failed to fetch plans", "error");
    console.error("Error fetching plans:", error);
  }
};

const filterAndRender = () => {
  const q = searchInput.value.trim().toLowerCase();
  const rows = cache.filter(([, p]) => p.plan_name.toLowerCase().includes(q));
  render(rows);
  updatePager(rows.length);
};

const render = (rows) => {
  tblBody.innerHTML = "";

  if (rows.length === 0) {
    show(noRecordsMsg);
    hide(tblBody);
    hide(tblHead);
    hide(document.querySelector("#pagination"));
    return;
  }

  hide(noRecordsMsg);
  show(tblBody);
  show(tblHead);
  show(document.querySelector("#pagination"));

  const slice = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  slice.forEach(([uid, p]) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-gray-700";
    tr.innerHTML = `
               <td class="px-3 py-2">${p.plan_name}</td>
               <td class="px-3 py-2 truncate max-w-xs">${p.description}</td>
               <td class="px-3 py-2">₹${p.amount}</td>
               <td class="px-3 py-2">${p.plan_duration}</td>
               <td class="px-3 py-2">${p.plan_type}</td>
               <td class="px-3 py-2 space-x-2">
                 <button data-view="${uid}" class="text-indigo-400 hover:text-indigo-300">
                   <i class="fas fa-eye"></i>
                 </button>
                 <button data-edit="${uid}" class=" text-blue-400 hover:text-blue-300">
                     <i class="fas fa-edit"></i>
                 </button>
                 <button data-del="${uid}" class="text-red-500 hover:text-red-400">
                   <i class="fas fa-trash"></i>
                 </button>
               </td>`;
    tblBody.appendChild(tr);
  });
};

const updatePager = (total) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === pages;
};

/* ---------- CRUD ---------- */
const upsertPlan = async (data) => {
  try {
    if (editingUid) {
      await set(ref(database, `plans/${editingUid}`), {
        ...data,
        plan_uid: editingUid,
      });
      showToast("Plan updated successfully!", "success");
    } else {
      const newRef = push(ref(database, "plans"));
      await set(newRef, { ...data, plan_uid: newRef.key });
      showToast("Plan added successfully!", "success");
    }
    await fetchPlans();
  } catch (error) {
    showToast("Failed to save plan", "error");
    console.error("Error saving plan:", error);
  }
};

const deletePlan = async (uid) => {
  const ok = await confirmDialog("Delete this plan? This cannot be undone.");
  if (!ok) return;

  try {
    await set(ref(database, `plans/${uid}`), null);
    showToast("Plan deleted successfully!", "success");
    await fetchPlans();
  } catch (error) {
    showToast("Failed to delete plan", "error");
    console.error("Error deleting plan:", error);
  }
};

/* simple async confirm dialog */
function confirmDialog(msg) {
  return new Promise((res) => {
    const d = document.createElement("div");
    d.className =
      "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm";
    d.innerHTML = `
               <div class="bg-gray-800 rounded-xl p-6 w-80 shadow-2xl text-center">
                 <p class="text-gray-200 mb-6">${msg}</p>
                 <button id="c-ok" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mr-4">Delete</button>
                 <button id="c-no" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">Cancel</button>
               </div>`;
    document.body.appendChild(d);
    d.querySelector("#c-ok").onclick = () => {
      d.remove();
      res(true);
    };
    d.querySelector("#c-no").onclick = () => {
      d.remove();
      res(false);
    };
    d.onclick = (e) => {
      if (e.target === d) {
        d.remove();
        res(false);
      }
    };
  });
}

const viewPlan = async (uid) => {
  try {
    const snap = await get(child(ref(database), `plans/${uid}`));
    if (!snap.exists()) {
      showToast("Plan not found", "error");
      return;
    }
    const p = snap.val();

    // Populate view modal
    viewName.textContent = p.plan_name || "-";
    viewDescription.textContent = p.description || "-";
    viewAmount.textContent = p.amount ? `₹${p.amount}` : "-";
    viewDuration.textContent = p.plan_duration || "-";
    viewType.textContent = p.plan_type || "-";

    show(viewModal);
  } catch (error) {
    showToast("Failed to load plan details", "error");
    console.error("Error viewing plan:", error);
  }
};

const editPlan = async (uid) => {
  try {
    const snap = await get(child(ref(database), `plans/${uid}`));
    if (!snap.exists()) {
      showToast("Plan not found", "error");
      return;
    }
    const p = snap.val();
    editingUid = uid;
    modalTitle.textContent = "Edit Plan";

    // fill form
    form["plan-name"].value = p.plan_name;
    form["plan-description"].value = p.description;
    form["plan-amount"].value = p.amount;
    form["plan-duration"].value = p.plan_duration;
    form["plan-type"].value = p.plan_type;

    show(modal);
  } catch (error) {
    showToast("Failed to load plan for editing", "error");
    console.error("Error editing plan:", error);
  }
};

/* ---------- form validation ---------- */
const validateForm = () => {
  let isValid = true;
  hideValidationErrors();

  // Validate plan name
  const name = form["plan-name"].value.trim();
  if (name.length < 3 || name.length > 50) {
    show(nameError);
    isValid = false;
  }

  // Validate description
  const desc = form["plan-description"].value.trim();
  if (desc.length < 10 || desc.length > 500) {
    show(descError);
    isValid = false;
  }

  // Validate amount
  const amount = parseFloat(form["plan-amount"].value);
  if (isNaN(amount)) {
    show(amountError);
    isValid = false;
  } else if (amount < 1 || amount > 100000) {
    show(amountError);
    isValid = false;
  }

  // Validate duration
  if (!form["plan-duration"].value) {
    isValid = false;
  }

  // Validate plan type
  if (!form["plan-type"].value) {
    isValid = false;
  }

  return isValid;
};

/* ---------- listeners ---------- */
addBtn.onclick = () => {
  editingUid = null;
  modalTitle.textContent = "Add Plan";
  resetForm();
  show(modal);
};
closeBtn.onclick = () => hide(modal);
closeViewBtn.onclick = () => hide(viewModal);

prevBtn.onclick = () => {
  currentPage--;
  filterAndRender();
};
nextBtn.onclick = () => {
  currentPage++;
  filterAndRender();
};
searchInput.oninput = filterAndRender;

/* Delegated actions in table (robust) */
tblBody.onclick = (e) => {
  const btn = e.target.closest("[data-view],[data-edit],[data-del]");
  if (!btn) return;

  const { view, edit, del } = btn.dataset;
  if (view) return viewPlan(view);
  if (edit) return editPlan(edit);
  if (del) return deletePlan(del);
};

/* form submit (add / edit) */
form.onsubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    showToast("Please fix the errors in the form", "error");
    return;
  }

  try {
    const data = {
      plan_name: form["plan-name"].value.trim(),
      description: form["plan-description"].value.trim(),
      amount: parseFloat(form["plan-amount"].value),
      plan_duration: form["plan-duration"].value,
      plan_type: form["plan-type"].value,
    };

    await upsertPlan(data);
    hide(modal);
    resetForm();
  } catch (error) {
    showToast("Failed to save plan", "error");
    console.error("Error submitting form:", error);
  }
};

/* ---------- init ---------- */
fetchPlans();
