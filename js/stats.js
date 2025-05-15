import { database, ref, onValue } from "./firebase-config.js";

// Database references
const membersRef = ref(database, "members");
const trainersRef = ref(database, "trainers");
const staffRef = ref(database, "staff");
const plansRef = ref(database, "plans");
const paymentsRef = ref(database, "member_payments");

// Initialize the stats dashboard
function initDashboard() {
  // Members count
  onValue(
    membersRef,
    (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById("stat-total-members").textContent = count;
    },
    { onlyOnce: false }
  );

  // Trainers count
  onValue(
    trainersRef,
    (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById("stat-total-trainers").textContent = count;
    },
    { onlyOnce: false }
  );

  // Staff count
  onValue(
    staffRef,
    (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById("stat-total-staff").textContent = count;
    },
    { onlyOnce: false }
  );

  // Plans count
  onValue(
    plansRef,
    (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      document.getElementById("stat-total-plans").textContent = count;
    },
    { onlyOnce: false }
  );

  // Payment stats
  onValue(
    paymentsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        showErrorState();
        return;
      }

      const paymentsData = snapshot.val();
      let totalRevenue = 0;
      let membersWithDues = 0;
      let activePlans = 0;
      let expiredPlans = 0;

      Object.keys(paymentsData).forEach((paymentId) => {
        const payment = paymentsData[paymentId];

        // Calculate total revenue (sum of pre_booking_amount)
        if (payment.pre_booking_amount) {
          totalRevenue += parseFloat(payment.pre_booking_amount);
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

      // Update the DOM
      document.getElementById(
        "stat-total-revenue"
      ).textContent = `₹${totalRevenue.toFixed(2)}`;
      document.getElementById("stat-total-dues").textContent = membersWithDues;
      document.getElementById("stat-active-plans").textContent = activePlans;
      document.getElementById("stat-expired-plans").textContent = expiredPlans;
    },
    { onlyOnce: false }
  );
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initDashboard);

// Error handling for all cards
function showErrorState() {
  document.querySelectorAll('[id^="stat-total-"]').forEach((el) => {
    el.textContent = "--";
  });
  document.getElementById("stat-total-revenue").textContent = "--";
  document.getElementById("stat-total-dues").textContent = "--";
  document.getElementById("stat-active-plans").textContent = "--";
  document.getElementById("stat-expired-plans").textContent = "--";
}
