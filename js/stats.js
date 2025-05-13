// Import necessary functions from your firebaseConfig file
import { database, ref, onValue } from "./firebase-config.js";

// References to Firebase Realtime Database nodes
const plansRef = ref(database, "plans");
const trainersRef = ref(database, "trainers");

// Function to update the statistics in the UI
function updateStats(plansData, trainersData) {
  // Update total plans count
  const totalPlans = plansData ? Object.keys(plansData).length : 0;
  document.getElementById("stat-total-plans").textContent = totalPlans;

  // Update total trainers count
  const totalTrainers = trainersData ? Object.keys(trainersData).length : 0;
  document.getElementById("stat-total-trainers").textContent = totalTrainers;
}

// Listen for changes to the 'membership_plans' node
onValue(
  plansRef,
  (snapshot) => {
    const plansData = snapshot.exists() ? snapshot.val() : null;

    // Get current trainers data to maintain it when updating
    const trainersSnapshot = document.getElementById(
      "stat-total-trainers"
    ).textContent;
    const trainersData =
      trainersSnapshot !== "‑‑" ? { count: trainersSnapshot } : null;

    updateStats(plansData, trainersData);
  },
  (error) => {
    console.error("Error getting plans data: ", error);
    document.getElementById("stat-total-plans").textContent = "0";
  }
);

// Listen for changes to the 'trainers' node
onValue(
  trainersRef,
  (snapshot) => {
    const trainersData = snapshot.exists() ? snapshot.val() : null;

    // Get current plans data to maintain it when updating
    const plansSnapshot =
      document.getElementById("stat-total-plans").textContent;
    const plansData = plansSnapshot !== "‑‑" ? { count: plansSnapshot } : null;

    updateStats(plansData, trainersData);
  },
  (error) => {
    console.error("Error getting trainers data: ", error);
    document.getElementById("stat-total-trainers").textContent = "0";
  }
);
