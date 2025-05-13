import { database, ref, onValue } from "./firebase-config.js";

// Database references
const membersRef = ref(database, "members");
const trainersRef = ref(database, "trainers");
const staffRef = ref(database, "staff");
const plansRef = ref(database, "plans");

// Initialize the stats dashboard
function initDashboard() {
  // Members count
  onValue(
    membersRef,
    (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById("stat-total-members").textContent = count;
    },
    {
      onlyOnce: false,
    }
  );

  // Trainers count (only active) stat-total-trainers
  onValue(
    trainersRef,
    (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById("stat-total-trainers").textContent = count;
    },
    {
      onlyOnce: false,
    }
  );

  // Staff count
  onValue(
    staffRef,
    (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById("stat-total-staff").textContent = count;
    },
    {
      onlyOnce: false,
    }
  );

  // Plans count
  onValue(
    plansRef,
    (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById("stat-total-plans").textContent = count;
    },
    {
      onlyOnce: false,
    }
  );
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initDashboard);

// Error handling for all cards
function showErrorState() {
  document.querySelectorAll('[id^="stat-total-"]').forEach((el) => {
    el.textContent = "--";
  });
}
