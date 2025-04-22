document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    // const cancelLogout = document.getElementById('cancel-logout');
    const cancelLogoutBtn = document.getElementById('cancel-logout-btn');
    const confirmLogout = document.getElementById('confirm-logout');
  
    // Show modal
    logoutBtn.addEventListener('click', function() {
      logoutModal.classList.remove('hidden'); logoutModal.classList.add('flex');

      document.body.style.overflow = 'hidden';
    });
  
    // Close modal
    function closeModal() {
      logoutModal.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
  
    // Close modal handlers
    // cancelLogout.addEventListener('click', closeModal);
    cancelLogoutBtn.addEventListener('click', closeModal);
  
    // Confirm logout
    confirmLogout.addEventListener('click', function() {
      localStorage.removeItem('activeTab');
      window.location.href = '../index.html';
    });
  
    // Close modal when clicking on backdrop
    logoutModal.addEventListener('click', function(e) {
      if (e.target === logoutModal || e.target.classList.contains('backdrop-blur-sm')) {
        closeModal();
      }
    });
  
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !logoutModal.classList.contains('hidden')) {
        closeModal();
      }
    });
  });