(function() {
  const alert = document.getElementById('alert');

  function showAlert(message, type) {
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
  }

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          showAlert(data.error || data.details || 'Login failed', 'error');
          return;
        }

        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get('redirect') || '/dashboard.html';
      } catch (err) {
        showAlert('Network error. Please try again.', 'error');
      }
    });
  }

  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const res = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          showAlert(data.error || data.details || 'Registration failed', 'error');
          return;
        }

        window.location.href = '/dashboard.html';
      } catch (err) {
        showAlert('Network error. Please try again.', 'error');
      }
    });
  }
})();
