import { database, ref, onValue } from "./firebase-config.js";

// Database references
const membersRef = ref(database, "members");
const trainersRef = ref(database, "trainers"); // Note: Check if this should be "trainers" or "trainers"
const staffRef = ref(database, "staff");
const plansRef = ref(database, "plans");
const paymentsRef = ref(database, "member_payments");

// Initialize the stats dashboard
function initDashboard() {
  // Set initial loading state
  showLoadingState();

  // Members count
  setupCounter(membersRef, "stat-total-members");

  // Trainers count (note the spelling - make sure it matches your Firebase structure)
  setupCounter(trainersRef, "stat-total-trainers");

  // Staff count
  setupCounter(staffRef, "stat-total-staff");

  // Plans count
  setupCounter(plansRef, "stat-total-plans");

  // Payment stats
  setupPaymentStats();
}

// Generic counter setup function
function setupCounter(dbRef, elementId) {
  onValue(
    dbRef,
    (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      updateElement(elementId, count);
    },
    {
      onlyOnce: false,
      onError: (error) => {
        console.error(`Error reading ${elementId}:`, error);
        updateElement(elementId, "--");
      },
    }
  );
}

// Payment statistics setup
function setupPaymentStats() {
  onValue(
    paymentsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        updatePaymentStats(0, 0, 0, 0);
        return;
      }

      const paymentsData = snapshot.val();
      let totalRevenue = 0;
      let membersWithDues = 0;
      let activePlans = 0;
      let expiredPlans = 0;

      Object.values(paymentsData).forEach((payment) => {
        // Calculate total revenue
        if (payment.pre_booking_amount) {
          totalRevenue += parseFloat(payment.pre_booking_amount) || 0;
        }

        // Check for dues
        if (payment.due_status === "due") {
          membersWithDues++;
        }

        // Check plan status
        if (payment.plan_validity_status === "active") {
          activePlans++;
        } else if (payment.plan_validity_status === "expired") {
          expiredPlans++;
        }
      });

      updatePaymentStats(
        totalRevenue,
        membersWithDues,
        activePlans,
        expiredPlans
      );
    },
    {
      onlyOnce: false,
      onError: (error) => {
        console.error("Error reading payment stats:", error);
        updatePaymentStats("--", "--", "--", "--");
      },
    }
  );
}

// Helper functions
function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent =
      id === "stat-total-revenue" && typeof value === "number"
        ? `₹${value.toFixed(2)}`
        : value;
  }
}

function updatePaymentStats(revenue, dues, active, expired) {
  updateElement("stat-total-revenue", revenue);
  updateElement("stat-total-dues", dues);
  updateElement("stat-active-plans", active);
  updateElement("stat-expired-plans", expired);
}

function showLoadingState() {
  document.querySelectorAll('[id^="stat-"]').forEach((el) => {
    el.textContent = "Loading...";
  });
}

function showErrorState() {
  document.querySelectorAll('[id^="stat-"]').forEach((el) => {
    el.textContent = "--";
  });
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initDashboard);
