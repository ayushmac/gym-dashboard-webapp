(function () {
  const AUTH_KEY = "isAdminAuth";
  const RELOAD_KEY = "isReloading";

  // Check if this is a page reload
  const isReload = sessionStorage.getItem(RELOAD_KEY) === "true";

  // Clear the reload flag (for future navigation)
  sessionStorage.removeItem(RELOAD_KEY);

  // If not authenticated and not a reload, redirect to login
  if (localStorage.getItem(AUTH_KEY) !== "true" && !isReload) {
    window.location.replace("/index.html");
    return;
  }

  // Set reload flag for next page load (will be true if this page is reloaded)
  sessionStorage.setItem(RELOAD_KEY, "true");

  // Handle tab/browser close - only clear auth if not reloading
  window.addEventListener("beforeunload", (event) => {
    // Check if this is a page reload
    const isNavigation = performance.navigation.type === performance.navigation.TYPE_RELOAD;
    
    if (!isNavigation) {
      // Only clear auth if this is a tab/browser close, not a reload
      localStorage.removeItem(AUTH_KEY);
    }
  });
})();