(function() {
  const alert = document.getElementById('alert');

  function showAlert(message, type) {
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
  }

  const form = document.getElementById('forgotForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const res = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        showAlert(data.error || data.details || 'Something went wrong', 'error');
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
        return;
      }

      showAlert('If an account with that email exists, a reset link has been sent. Check your inbox.', 'success');
      form.style.display = 'none';
    } catch (err) {
      showAlert('Network error. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Send Reset Link';
    }
  });
})();
