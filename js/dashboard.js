document.addEventListener("DOMContentLoaded", function () {
  // Mobile menu toggle
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileDropdown = document.getElementById("mobile-dropdown");

  mobileMenuButton.addEventListener("click", function () {
    mobileDropdown.classList.toggle("hidden");
  });

  // Close mobile dropdown when clicking outside
  document.addEventListener("click", function (event) {
    if (
      !mobileMenuButton.contains(event.target) &&
      !mobileDropdown.contains(event.target)
    ) {
      mobileDropdown.classList.add("hidden");
    }
  });

  // Tab elements
  const tabButtons = document.querySelectorAll(".tab-btn");
  const mobileTabButtons = document.querySelectorAll(".mobile-tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const currentTabTitle = document.getElementById("current-tab-title");

  // Tab switch function
  function switchTab(tabId) {
    // Save active tab
    localStorage.setItem("activeTab", tabId);

    // Desktop tab style update
    tabButtons.forEach((button) => {
      if (button.getAttribute("data-tab") === tabId) {
        button.classList.add("bg-blue-600", "text-white");
        button.classList.remove("text-gray-300", "hover:bg-gray-700");
      } else {
        button.classList.remove("bg-blue-600", "text-white");
        button.classList.add("text-gray-300", "hover:bg-gray-700");
      }
    });

    // Mobile tab style update
    mobileTabButtons.forEach((button) => {
      if (button.getAttribute("data-tab") === tabId) {
        button.classList.remove("text-gray-300");
        button.classList.add("text-blue-400");
      } else {
        button.classList.remove("text-blue-400");
        button.classList.add("text-gray-300");
      }
    });

    // Show tab content
    tabContents.forEach((content) => {
      if (content.id === `${tabId}-section`) {
        content.classList.remove("hidden");
        const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeBtn) {
          currentTabTitle.textContent = activeBtn.textContent.trim();
        }
      } else {
        content.classList.add("hidden");
      }
    });
  }

  // On page load: apply active tab from localStorage or default
  const activeTab = localStorage.getItem("activeTab") || "stats";
  switchTab(activeTab);

  // Desktop tab click
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab");
      switchTab(tabId);
      mobileDropdown.classList.add("hidden");
    });
  });

  // Mobile tab click
  mobileTabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab");
      switchTab(tabId);
      mobileDropdown.classList.add("hidden");
    });
  });
});
