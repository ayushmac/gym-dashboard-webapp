// Import the necessary functions from Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  child,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBb5FqDuZCK_GDl86y8krdffNeTLd1ImSg",
  authDomain: "gym-dashboard-web-app-cd3dd.firebaseapp.com",
  databaseURL:
    "https://gym-dashboard-web-app-cd3dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gym-dashboard-web-app-cd3dd",
  storageBucket: "gym-dashboard-web-app-cd3dd.appspot.com",
  messagingSenderId: "95787041527",
  appId: "1:95787041527:web:25e4139cd5e7c38a9b89f2",
  measurementId: "G-J8XVJ1H9L3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Firebase Realtime Database
const database = getDatabase(app);

// Export the necessary functions from Firebase
export { database, ref, get, set, push, child, onValue, remove, update };
