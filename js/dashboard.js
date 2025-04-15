// dashboard.js
document.getElementById("logout-btn").addEventListener("click", function () {
  logout();
});

function logout() {
  // Redirect to login page
  window.location.href = "../index.html";
}
