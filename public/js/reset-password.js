(function() {
  const alert = document.getElementById('alert');
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const email = params.get('email');

  function showAlert(message, type) {
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
  }

  if (!token || !email) {
    showAlert('Invalid reset link. Please request a new one.', 'error');
    document.getElementById('resetForm').style.display = 'none';
    return;
  }

  const form = document.getElementById('resetForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      showAlert('Passwords do not match.', 'error');
      return;
    }

    if (password.length < 8) {
      showAlert('Password must be at least 8 characters.', 'error');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Resetting...';

    try {
      const res = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        showAlert(data.error || data.details || 'Reset failed', 'error');
        btn.disabled = false;
        btn.textContent = 'Reset Password';
        return;
      }

      showAlert('Password reset successful! Redirecting...', 'success');
      form.style.display = 'none';
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);
    } catch (err) {
      showAlert('Network error. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Reset Password';
    }
  });
})();
