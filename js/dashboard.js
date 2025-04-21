document.addEventListener('DOMContentLoaded', function() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const closeBtn = document.getElementById('close-btn');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('main');

  // Function to open sidebar (works on all screens)
  function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    hamburgerBtn.classList.add('hidden');
  }

  // Function to close sidebar (works on all screens)
  function closeSidebar() {
    sidebar.classList.remove('translate-x-0');
    sidebar.classList.add('-translate-x-full');
    hamburgerBtn.classList.remove('hidden');
  }

  // Event listeners
  hamburgerBtn.addEventListener('click', openSidebar);
  closeBtn.addEventListener('click', closeSidebar);

  // Close sidebar when clicking outside of it (works on all screens)
  document.addEventListener('click', function(event) {
    const isClickInsideSidebar = sidebar.contains(event.target);
    const isClickOnHamburger = hamburgerBtn.contains(event.target);
    
    if (!isClickInsideSidebar && !isClickOnHamburger && !sidebar.classList.contains('-translate-x-full')) {
      closeSidebar();
    }
  });
});