document.addEventListener("DOMContentLoaded", function () {
  const logoutBtns = [
    document.getElementById("desktop-logout-btn"),
    document.getElementById("mobile-logout-btn"),
  ];
  const logoutDialog = document.getElementById("logout-dialog");
  const confirmLogout = document.getElementById("confirm-logout");
  const cancelLogout = document.getElementById("cancel-logout");

  // Show logout confirmation dialog
  logoutBtns.forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        logoutDialog.classList.remove("hidden");
      });
    }
  });

  // Confirm logout
  confirmLogout.addEventListener("click", function () {
    localStorage.removeItem("activeTab");
    window.location.href = "../index.html";
  });

  // Cancel logout
  cancelLogout.addEventListener("click", function () {
    logoutDialog.classList.add("hidden");
  });
});
