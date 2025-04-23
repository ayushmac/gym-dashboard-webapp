// Import necessary functions from your firebaseConfig file
import { database, ref, onValue } from './firebase-config.js';  // Adjust the path if necessary

// Reference to Firebase Realtime Database for 'membership_plans'
const plansRef = ref(database, 'membership_plans');

// Function to get the total number of plans and update the UI
function updateStats(plansData) {
    let totalPlans = Object.keys(plansData).length;

    // Update the DOM with the total number of plans
    document.getElementById('stat-total-plans').textContent = totalPlans;
}

// Listen for changes to the 'membership_plans' node in real-time
onValue(plansRef, (snapshot) => {
    if (snapshot.exists()) {
        const plansData = snapshot.val();
        updateStats(plansData);
    } else {
        // If no data exists, display 0
        document.getElementById('stat-total-plans').textContent = "0";
    }
}, (error) => {
    console.error("Error getting data: ", error);
    // Optionally handle errors here, e.g., show an error message in the UI
});
