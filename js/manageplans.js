/* manageplans.js – v2.1
   Added no-records display and improved search bar */

   import { database, ref, push, set, get, child } from './firebase-config.js';

   /* ---------- DOM refs ---------- */
   const searchInput   = document.getElementById('search-input');
   const addBtn        = document.getElementById('add-plan-btn');
   const modal         = document.getElementById('add-plan-modal');
   const closeBtn      = document.getElementById('close-modal');
   const form          = document.getElementById('add-plan-form');
   const tblBody       = document.getElementById('plans-table-body');
   const tblHead       = document.querySelector('thead');
   const prevBtn       = document.getElementById('prev-btn');
   const nextBtn       = document.getElementById('next-btn');
   const trainerChk    = document.getElementById('includes-trainer');
   const trainerWrap   = document.getElementById('trainer-duration-wrap');
   const trainerSelect = document.getElementById('trainer-duration');
   const modalTitle    = document.getElementById('modal-title');
   const noRecordsMsg  = document.getElementById('no-records');
   
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
   
   /* click‑outside to close */
   [modal, viewModal].forEach(m => {
     m.addEventListener('click', e => {
       if (e.target === m) hide(m);
     });
   });
   
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
     
     if (rows.length === 0) {
       show(noRecordsMsg);
       hide(tblBody);
       hide(tblHead);
       hide(document.querySelector('#pagination'));
       return;
     }
     
     hide(noRecordsMsg);
     show(tblBody);
     show(tblHead);
     show(document.querySelector('#pagination'));
     
     const slice = rows.slice((currentPage-1)*pageSize, currentPage*pageSize);
   
     slice.forEach(([uid,p]) => {
       const tr = document.createElement('tr');
       tr.className = 'border-b border-gray-700';
       tr.innerHTML = `
         <td class="px-3 py-2">${p.plan_name}</td>
         <td class="px-3 py-2 truncate max-w-xs">${p.plan_description}</td>
         <td class="px-3 py-2">${p.plan_duration} month/s</td>
         <td class="px-3 py-2">${p.includes_trainer}</td>
         <td class="px-3 py-2 space-x-2">
           <button data-view="${uid}" class="text-indigo-400 hover:text-indigo-300">
             <i class="fas fa-eye"></i>
           </button>
           <button data-edit="${uid}" class="text-indigo-400 hover:text-indigo-300">
             <i class="fas fa-pen"></i>
           </button>
           <button data-del ="${uid}" class="text-red-500 hover:text-red-400">
             <i class="fas fa-trash"></i>
           </button>
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
     const ok = await confirmDialog('Delete this plan? This cannot be undone.');
     if (!ok) return;
     await set(ref(database, `membership_plans/${uid}`), null);
     await fetchPlans();
   };
   
   /* simple async confirm dialog */
   function confirmDialog(msg){
     return new Promise(res=>{
       const d = document.createElement('div');
       d.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm';
       d.innerHTML = `
         <div class="bg-gray-800 rounded-xl p-6 w-80 shadow-2xl text-center">
           <p class="text-gray-200 mb-6">${msg}</p>
           <button id="c-ok"  class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mr-4">Delete</button>
           <button id="c-no"  class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">Cancel</button>
         </div>`;
       document.body.appendChild(d);
       d.querySelector('#c-ok').onclick = ()=>{ d.remove(); res(true); };
       d.querySelector('#c-no').onclick = ()=>{ d.remove(); res(false); };
       d.onclick = e=>{ if(e.target===d){ d.remove(); res(false);} };
     });
   }
   
   const viewPlan = async uid => {
     const snap = await get(child(ref(database), `membership_plans/${uid}`));
     if (!snap.exists()) return;
     const p = snap.val();
     viewContent.innerHTML = `
       <p><span class="font-semibold">Name:</span> ${p.plan_name}</p>
       <p><span class="font-semibold">Description:</span> ${p.plan_description}</p>
       <p><span class="font-semibold">Amount:</span> ₹${p.plan_amount}</p>
       <p><span class="font-semibold">Includes trainer:</span> ${p.includes_trainer}</p>
       <p><span class="font-semibold">Trainer duration:</span> ${p.trainer_duration || '-' } month/s</p>
       <p><span class="font-semibold">Plan duration:</span> ${p.plan_duration} month/s</p>`;
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
   
   /* Delegated actions in table (robust) */
   tblBody.onclick = e => {
     const btn = e.target.closest('[data-view],[data-edit],[data-del]');
     if (!btn) return;
   
     const { view, edit, del } = btn.dataset;
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