(function() {
  // Check auth — redirect if not logged in
  async function checkAuth() {
    try {
      const res = await fetch('/auth/me');
      if (!res.ok) {
        window.location.href = '/login.html';
        return null;
      }
      return await res.json();
    } catch {
      window.location.href = '/login.html';
      return null;
    }
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/';
  });

  // Load dashboard data
  async function loadDashboard() {
    const authData = await checkAuth();
    if (!authData) return;

    const user = authData.user;
    document.getElementById('welcomeText').textContent = `Welcome back, ${user.name || user.email}`;

    // Load subscription, keys, usage in parallel
    const [subRes, keysRes, usageRes] = await Promise.all([
      fetch('/dashboard/subscription'),
      fetch('/dashboard/api-keys'),
      fetch('/dashboard/usage'),
    ]);

    const subData = await subRes.json();
    const keysData = await keysRes.json();
    const usageData = await usageRes.json();

    renderSubscription(subData.subscription);
    renderKeys(keysData.keys);
    renderUsage(usageData.stats);
  }

  function renderSubscription(sub) {
    const el = document.getElementById('subscriptionInfo');
    const manageBillingBtn = document.getElementById('manageBillingBtn');
    const subscribeBtnTop = document.getElementById('subscribeBtnTop');
    const pricingSelect = document.getElementById('pricingSelect');

    if (!sub) {
      el.innerHTML = '<p style="color:var(--text-secondary)">No active subscription. Choose a plan to get started.</p>';
      subscribeBtnTop.style.display = 'inline-flex';
      subscribeBtnTop.addEventListener('click', () => {
        pricingSelect.style.display = pricingSelect.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('currentTier').textContent = 'Free';
      return;
    }

    document.getElementById('currentTier').innerHTML = `<span class="badge badge-tier">${sub.tier}</span>`;
    manageBillingBtn.style.display = 'inline-flex';

    const endDate = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—';
    const cancelNote = sub.cancel_at_period_end ? ' (cancels at period end)' : '';

    el.innerHTML = `
      <p><strong>Plan:</strong> ${sub.tier} &nbsp; <span class="badge badge-active">${sub.status}</span>${cancelNote}</p>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:4px">Current period ends: ${endDate}</p>
    `;

    manageBillingBtn.addEventListener('click', async () => {
      const res = await fetch('/stripe/create-portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    });
  }

  function renderKeys(keys) {
    const tbody = document.getElementById('keysTableBody');
    document.getElementById('keyCount').textContent = keys.length;

    if (keys.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-secondary)">No API keys yet. Create one to get started.</td></tr>';
      return;
    }

    tbody.innerHTML = keys.map(k => `
      <tr>
        <td><span class="key-prefix">${k.key_prefix}...</span></td>
        <td>${k.name}</td>
        <td>${k.is_active ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-inactive">Inactive</span>'}</td>
        <td>${new Date(k.created_at).toLocaleDateString()}</td>
        <td>${k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteKey(${k.id})">Delete</button></td>
      </tr>
    `).join('');
  }

  function renderUsage(stats) {
    const tbody = document.getElementById('usageTableBody');
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    document.getElementById('totalRequests').textContent = total.toLocaleString();

    if (stats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-secondary)">No usage data yet.</td></tr>';
      return;
    }

    tbody.innerHTML = stats.map(s => `
      <tr>
        <td>${s.endpoint}</td>
        <td>${s.count.toLocaleString()}</td>
        <td>${(s.total_tokens || 0).toLocaleString()}</td>
      </tr>
    `).join('');
  }

  // Create key
  document.getElementById('createKeyBtn').addEventListener('click', () => {
    document.getElementById('createKeyModal').classList.add('show');
  });

  document.getElementById('createKeyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('keyName').value;
    document.getElementById('createKeyModal').classList.remove('show');

    const res = await fetch('/dashboard/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || data.details || 'Failed to create key');
      return;
    }

    document.getElementById('newKeyDisplay').textContent = data.key;
    document.getElementById('newKeyModal').classList.add('show');

    // Refresh keys list
    const keysRes = await fetch('/dashboard/api-keys');
    const keysData = await keysRes.json();
    renderKeys(keysData.keys);
  });

  // Copy key to clipboard
  window.copyKey = function() {
    const key = document.getElementById('newKeyDisplay').textContent;
    navigator.clipboard.writeText(key);
  };

  window.closeModal = function() {
    document.getElementById('newKeyModal').classList.remove('show');
  };

  // Delete key
  window.deleteKey = async function(id) {
    if (!confirm('Delete this API key? This cannot be undone.')) return;

    await fetch(`/dashboard/api-keys/${id}`, { method: 'DELETE' });

    const keysRes = await fetch('/dashboard/api-keys');
    const keysData = await keysRes.json();
    renderKeys(keysData.keys);
  };

  // Subscribe to a tier
  window.subscribe = async function(tier) {
    const res = await fetch('/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  // Export data — triggers browser download
  document.getElementById('exportDataBtn').addEventListener('click', () => {
    window.location.href = '/dashboard/export';
  });

  // Delete account — show modal
  document.getElementById('deleteAccountBtn').addEventListener('click', () => {
    document.getElementById('deleteError').style.display = 'none';
    document.getElementById('deletePassword').value = '';
    document.getElementById('deleteAccountModal').classList.add('show');
  });

  document.getElementById('deleteAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('deletePassword').value;
    const errorEl = document.getElementById('deleteError');
    errorEl.style.display = 'none';

    const res = await fetch('/dashboard/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await res.json();
      errorEl.textContent = data.error || 'Failed to delete account';
      errorEl.style.display = 'block';
      return;
    }

    window.location.replace('/?account_deleted=1');
  });

  // Init
  loadDashboard();
})();
