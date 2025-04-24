document.addEventListener('DOMContentLoaded', function() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const closeBtn = document.getElementById('close-btn');
  const sidebar = document.getElementById('sidebar');
  const tabLinks = document.querySelectorAll('.sidebar-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Function to open sidebar
  function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    hamburgerBtn.classList.add('hidden');
  }

  // Function to close sidebar
  function closeSidebar() {
    sidebar.classList.remove('translate-x-0');
    sidebar.classList.add('-translate-x-full');
    hamburgerBtn.classList.remove('hidden');
  }

  // Function to switch tabs
  function switchTab(tabId) {
    tabContents.forEach(content => content.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    tabLinks.forEach(link => {
      link.classList.remove('bg-gray-700', 'text-white');
      link.classList.add('text-gray-300', 'hover:bg-gray-700', 'hover:text-white');
    });
    
    const activeLink = document.querySelector(`.sidebar-tab[data-tab="${tabId}"]`);
    activeLink.classList.remove('text-gray-300', 'hover:bg-gray-700', 'hover:text-white');
    activeLink.classList.add('bg-gray-700', 'text-white');
    
    localStorage.setItem('activeTab', tabId);
  }

  // Event listeners
  hamburgerBtn.addEventListener('click', openSidebar);
  closeBtn.addEventListener('click', closeSidebar);

  tabLinks.forEach(link => {
    link.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      switchTab(tabId);
      closeSidebar();
    });
  });

  // Close sidebar when clicking outside
  document.addEventListener('click', function(event) {
    const isClickInsideSidebar = sidebar.contains(event.target);
    const isClickOnHamburger = hamburgerBtn.contains(event.target);
    
    if (!isClickInsideSidebar && !isClickOnHamburger && !sidebar.classList.contains('-translate-x-full')) {
      closeSidebar();
    }
  });

  // Load active tab
  const activeTab = localStorage.getItem('activeTab') || 'overview';
  switchTab(activeTab);
});
