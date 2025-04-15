import { database, ref, get } from "./firebase-config.js";

document
  .getElementById("login-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    validateLogin(email, password);
  });

function validateLogin(email, password) {
  const loginRef = ref(database, "/admin/login");

  get(loginRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        const credentials = snapshot.val();

        // Console log the fetched email and password
        // console.log(`Fetched email: ${credentials.email}`);
        // console.log(`Fetched password: ${credentials.password}`);

        // Uncomment the line below to show an alert with the username and password (useful for debugging)
        alert(
          `Fetched Email: ${credentials.email}\nFetched Password: ${credentials.password}`
        );

        // Check if the entered email and password match the database values
        if (credentials.email === email && credentials.password === password) {
          // If credentials match, redirect to dashboard
          window.location.href = "/dashboard/dashboard.html";
        } else {
          // Show error message if login fails
          document.getElementById("error-message").style.display = "block";
          alert("Invalid credentials. Please try again.");
        }
      } else {
        console.log("No login data found in database.");
        alert("No login data found.");
      }
    })
    .catch((error) => {
      console.error(error);
      alert("An error occurred. Please try again later.");
    });
}
