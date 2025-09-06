// Alternative approach - use event delegation to avoid CSP issues
document.addEventListener('DOMContentLoaded', function() {
  console.log('Setting up evaluation modal with event delegation...');

  // Define functions directly on window
  window.openEvaluationModal = function() {
    console.log('Opening evaluation modal...');
    const modal = document.getElementById('evaluationModal');
    if (modal) {
      modal.classList.add('show');
      setTimeout(() => {
        const firstInput = document.getElementById('firstName');
        if (firstInput) {
          firstInput.focus();
          console.log('Focused on first input');
        }
      }, 100);
      document.body.classList.add('no-scroll');
      console.log('Modal opened successfully');
    } else {
      console.error('Modal element not found');
    }
  };

  window.closeEvaluationModal = function() {
    console.log('Closing evaluation modal...');
    const modal = document.getElementById('evaluationModal');
    if (modal) {
      modal.classList.remove('show');
      const form = document.getElementById('evaluationForm');
      if (form) form.reset();
      const modalForm = document.getElementById('modalForm');
      const successMessage = document.getElementById('successMessage');
      if (modalForm) modalForm.style.display = 'block';
      if (successMessage) successMessage.style.display = 'none';
      document.body.classList.remove('no-scroll');
      console.log('Modal closed successfully');
    }
  };

  window.showSuccessMessage = function() {
    console.log('showSuccessMessage called');
    const modalForm = document.getElementById('modalForm');
    const successMessage = document.getElementById('successMessage');
    if (modalForm) {
      modalForm.style.display = 'none';
      console.log('Form hidden');
    }
    if (successMessage) {
      successMessage.style.display = 'block';
      console.log('Success message shown');
    }
    setTimeout(() => {
      console.log('Auto-closing modal');
      window.closeEvaluationModal();
    }, 3000);
  };

  // Set up form submission handler using event delegation
  document.addEventListener('submit', function(event) {
    if (event.target.id === 'evaluationForm') {
      event.preventDefault();
      console.log('Form submitted via event delegation');

      const form = event.target;
      const formData = new FormData(form);
      const firstName = formData.get('firstName');
      const lastName = formData.get('lastName');
      const email = formData.get('email');
      const company = formData.get('company') || 'Not provided';

      console.log('Form data:', { firstName, lastName, email, company });

      if (!firstName || !lastName || !email) {
        alert('Please fill in all required fields');
        return;
      }

      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      // Create email for Jira
      const emailSubject = 'AcceleraQA Evaluation Request - ' + firstName + ' ' + lastName;
      const emailBody = 'Hello AcceleraQA Team,\n\nNew evaluation request:\n\nName: ' + firstName + ' ' + lastName + '\nEmail: ' + email + '\nCompany: ' + company + '\nDate: ' + new Date().toLocaleString() + '\n\nPlease follow up for evaluation access.';

      const mailtoLink = 'mailto:support@acceleraqa.atlassian.net?subject=' + encodeURIComponent(emailSubject) + '&body=' + encodeURIComponent(emailBody);

      try {
        window.open(mailtoLink, '_blank');
        console.log('Mailto opened');
      } catch (e) {
        console.log('Mailto failed, logging data');
      }

      setTimeout(() => {
        window.showSuccessMessage();
      }, 1000);
    }
  });

  // Modal click to close
  const modal = document.getElementById('evaluationModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        window.closeEvaluationModal();
      }
    });
  }

  // Escape key to close
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
      window.closeEvaluationModal();
    }
  });

  console.log('Evaluation modal setup complete');
  console.log('Functions available:', typeof window.openEvaluationModal);

  // Ensure body scroll is restored on page navigation/unload
  window.addEventListener('pagehide', window.closeEvaluationModal);
});

// Performance monitoring
if ('performance' in window && 'getEntriesByType' in performance) {
  window.addEventListener('load', function() {
    setTimeout(function() {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        console.log('⚡ Page Load Performance:', {
          'DOM Content Loaded': Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart) + 'ms',
          'Full Page Load': Math.round(perfData.loadEventEnd - perfData.loadEventStart) + 'ms'
        });
      }
    }, 0);
  });
}
