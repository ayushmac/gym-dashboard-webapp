/* manageplans.js – full version with trainer‑field fix + view modal */
import { database, ref, push, set, get, child } from './firebase-config.js';

/* ---------- DOM refs ---------- */
const searchInput   = document.getElementById('search-input');
const addBtn        = document.getElementById('add-plan-btn');
const modal         = document.getElementById('add-plan-modal');
const closeBtn      = document.getElementById('close-modal');
const form          = document.getElementById('add-plan-form');
const tblBody       = document.getElementById('plans-table-body');
const prevBtn       = document.getElementById('prev-btn');
const nextBtn       = document.getElementById('next-btn');
const trainerChk    = document.getElementById('includes-trainer');
const trainerWrap   = document.getElementById('trainer-duration-wrap');
const trainerSelect = document.getElementById('trainer-duration');
const modalTitle    = document.getElementById('modal-title');

/* View modal */
const viewModal     = document.getElementById('view-plan-modal');
const viewContent   = document.getElementById('view-content');
const closeViewBtn  = document.getElementById('close-view');

/* ---------- state ---------- */
let currentPage = 1;
const pageSize  = 10;
let cache       = [];          // [uid, obj]
let editingUid  = null;

/* ---------- helpers ---------- */
const show   = el => el.classList.remove('hidden');
const hide   = el => el.classList.add('hidden');
const resetForm = () => { form.reset(); hide(trainerWrap); };

/* ---------- trainer checkbox toggle ---------- */
trainerChk.onchange = () =>
  trainerChk.checked ? show(trainerWrap) : hide(trainerWrap);

/* ---------- data ---------- */
const fetchPlans = async () => {
  const snap = await get(ref(database, 'membership_plans'));
  cache = snap.exists() ? Object.entries(snap.val()) : [];
  currentPage = 1;
  filterAndRender();
};

const filterAndRender = () => {
  const q = searchInput.value.trim().toLowerCase();
  const rows = cache.filter(([,p]) => p.plan_name.toLowerCase().includes(q));
  render(rows);
  updatePager(rows.length);
};

const render = (rows) => {
  tblBody.innerHTML = '';
  const slice = rows.slice((currentPage-1)*pageSize, currentPage*pageSize);

  slice.forEach(([uid,p]) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-700';
    tr.innerHTML = `
      <td class="px-3 py-2">${p.plan_name}</td>
      <td class="px-3 py-2 truncate max-w-xs">${p.plan_description}</td>
      <td class="px-3 py-2">${p.includes_trainer}</td>
      <td class="px-3 py-2 space-x-2">
        <button data-view="${uid}" class="text-yellow-500">View</button>
        <button data-edit="${uid}" class="text-green-500">Edit</button>
        <button data-del ="${uid}" class="text-red-500">Delete</button>
      </td>`;
    tblBody.appendChild(tr);
  });
};

const updatePager = total => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === pages;
};

/* ---------- CRUD ---------- */
const upsertPlan = async (data) => {
  if (editingUid) {
    await set(ref(database, `membership_plans/${editingUid}`), { ...data, plan_uid: editingUid });
  } else {
    const newRef = push(ref(database, 'membership_plans'));
    await set(newRef, { ...data, plan_uid: newRef.key });
  }
  await fetchPlans();
};

const deletePlan = async uid => {
  if (!confirm('Delete this plan?')) return;
  await set(ref(database, `membership_plans/${uid}`), null);
  await fetchPlans();
};

const viewPlan = async uid => {
  const snap = await get(child(ref(database), `membership_plans/${uid}`));
  if (!snap.exists()) return;
  const p = snap.val();
  viewContent.innerHTML = `
    <p><span class="font-semibold">Name:</span> ${p.plan_name}</p>
    <p><span class="font-semibold">Description:</span> ${p.plan_description}</p>
    <p><span class="font-semibold">Amount:</span> ₹${p.plan_amount}</p>
    <p><span class="font-semibold">Includes trainer:</span> ${p.includes_trainer}</p>
    <p><span class="font-semibold">Trainer duration:</span> ${p.trainer_duration || '-' } months</p>
    <p><span class="font-semibold">Plan duration:</span> ${p.plan_duration} months</p>`;
  show(viewModal);
};

const editPlan = async uid => {
  const snap = await get(child(ref(database), `membership_plans/${uid}`));
  if (!snap.exists()) return;
  const p = snap.val();
  editingUid = uid;
  modalTitle.textContent = 'Edit Plan';

  // fill form
  form['plan-name'].value        = p.plan_name;
  form['plan-description'].value = p.plan_description;
  form['plan-amount'].value      = p.plan_amount;
  form['plan-duration'].value    = p.plan_duration;

  trainerChk.checked = (p.includes_trainer === 'yes');
  trainerChk.dispatchEvent(new Event('change')); // triggers show/hide
  trainerSelect.value = p.trainer_duration || '1';

  show(modal);
};

/* ---------- listeners ---------- */
addBtn.onclick = () => { editingUid = null; modalTitle.textContent='Add Plan'; resetForm(); show(modal); };
closeBtn.onclick = () => hide(modal);
closeViewBtn.onclick = () => hide(viewModal);

prevBtn.onclick = () => { currentPage--; filterAndRender(); };
nextBtn.onclick = () => { currentPage++; filterAndRender(); };
searchInput.oninput = filterAndRender;

/* Delegated actions in table */
tblBody.onclick = e => {
  const { view, edit, del } = e.target.dataset;
  if (view) return viewPlan(view);
  if (edit) return editPlan(edit);
  if (del)  return deletePlan(del);
};

/* form submit (add / edit) */
form.onsubmit = async e => {
  e.preventDefault();
  const data = {
    plan_name:        form['plan-name'].value.trim(),
    plan_description: form['plan-description'].value.trim(),
    plan_amount:      +form['plan-amount'].value,
    includes_trainer: trainerChk.checked ? 'yes' : 'no',
    trainer_duration: trainerChk.checked ? trainerSelect.value : '',
    plan_duration:    form['plan-duration'].value
  };

  await upsertPlan(data);
  hide(modal);
  resetForm();
};

/* ---------- init ---------- */
fetchPlans();
