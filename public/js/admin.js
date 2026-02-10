(function() {
  async function checkAdmin() {
    try {
      const res = await fetch('/admin/overview');
      if (res.status === 401) {
        window.location.href = '/login.html';
        return false;
      }
      if (res.status === 403) {
        window.location.href = '/dashboard.html';
        return false;
      }
      return true;
    } catch {
      window.location.href = '/login.html';
      return false;
    }
  }

  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/';
  });

  async function loadAdmin() {
    const ok = await checkAdmin();
    if (!ok) return;

    const [overviewRes, dailyRes, endpointsRes, tiersRes, usersRes, recentRes, regsRes, pvRes] = await Promise.all([
      fetch('/admin/overview'),
      fetch('/admin/daily'),
      fetch('/admin/endpoints'),
      fetch('/admin/tiers'),
      fetch('/admin/top-users'),
      fetch('/admin/recent'),
      fetch('/admin/registrations'),
      fetch('/admin/page-views'),
    ]);

    const overview = await overviewRes.json();
    const daily = await dailyRes.json();
    const endpoints = await endpointsRes.json();
    const tiers = await tiersRes.json();
    const users = await usersRes.json();
    const recent = await recentRes.json();
    const regs = await regsRes.json();
    const pv = await pvRes.json();

    renderOverview(overview);
    renderDaily(daily.daily);
    renderEndpoints(endpoints.endpoints);
    renderTiers(tiers.tiers);
    renderUsers(users.users);
    renderRecent(recent.requests);
    renderRegistrations(regs);
    renderPageViews(pv);
  }

  function renderOverview(d) {
    document.getElementById('totalRequests').textContent = d.totalRequests.toLocaleString();
    document.getElementById('last30Days').textContent = d.last30Days.toLocaleString();
    document.getElementById('today').textContent = d.today.toLocaleString();
    document.getElementById('uniqueUsers').textContent = d.uniqueUsers.toLocaleString();
    document.getElementById('totalTokens').textContent = d.totalTokens.toLocaleString();
    document.getElementById('errorRate').textContent = d.errorRate + '%';
  }

  function renderDaily(rows) {
    const el = document.getElementById('dailyChart');
    if (!rows.length) {
      el.innerHTML = '<p style="color:var(--text-secondary)">No data yet.</p>';
      return;
    }
    const max = Math.max(...rows.map(r => r.count));
    el.innerHTML = rows.map(r => {
      const pct = max > 0 ? (r.count / max) * 100 : 0;
      const label = r.date.slice(5); // MM-DD
      return `<div class="chart-bar-row">
        <span class="chart-bar-label">${label}</span>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
        <span class="chart-bar-value">${r.count}</span>
      </div>`;
    }).join('');
  }

  function renderEndpoints(rows) {
    const tbody = document.getElementById('endpointsBody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-secondary)">No data yet.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `<tr>
      <td>${r.endpoint}</td>
      <td>${r.count.toLocaleString()}</td>
      <td>${r.avg_response_ms}ms</td>
      <td>${r.error_rate}%</td>
      <td>${r.total_tokens.toLocaleString()}</td>
    </tr>`).join('');
  }

  function renderTiers(rows) {
    const tbody = document.getElementById('tiersBody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-secondary)">No data yet.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `<tr>
      <td><span class="badge badge-tier">${r.tier}</span></td>
      <td>${r.count.toLocaleString()}</td>
      <td>${r.share}%</td>
    </tr>`).join('');
  }

  function renderUsers(rows) {
    const tbody = document.getElementById('usersBody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-secondary)">No data yet.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `<tr>
      <td>${r.email || 'User #' + r.user_id}</td>
      <td>${r.request_count.toLocaleString()}</td>
      <td>${r.total_tokens.toLocaleString()}</td>
    </tr>`).join('');
  }

  function renderRecent(rows) {
    const tbody = document.getElementById('recentBody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-secondary)">No data yet.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const time = new Date(r.created_at).toLocaleString();
      const statusClass = r.status_code < 400 ? 'status-ok' : 'status-err';
      return `<tr>
        <td>${time}</td>
        <td>${r.email || 'User #' + r.user_id}</td>
        <td>${r.endpoint}</td>
        <td><span class="${statusClass}">${r.status_code}</span></td>
        <td>${r.response_time_ms}ms</td>
        <td>${r.tokens_used}</td>
      </tr>`;
    }).join('');
  }

  function renderRegistrations(d) {
    document.getElementById('registeredUsers').textContent = d.total.toLocaleString();
    document.getElementById('regsLast30').textContent = d.last30Days.toLocaleString();
    document.getElementById('regsToday').textContent = d.today.toLocaleString();

    const tbody = document.getElementById('regsBody');
    if (!d.recent.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-secondary)">No users yet.</td></tr>';
      return;
    }
    tbody.innerHTML = d.recent.map(r => `<tr>
      <td>${r.email}</td>
      <td>${r.name || '—'}</td>
      <td>${new Date(r.created_at).toLocaleDateString()}</td>
    </tr>`).join('');
  }

  function renderPageViews(d) {
    document.getElementById('pageViewsToday').textContent = d.today.toLocaleString();
    document.getElementById('pvTotal').textContent = d.total.toLocaleString();
    document.getElementById('pvToday').textContent = d.today.toLocaleString();

    const tbody = document.getElementById('pvBody');
    if (!d.byPage.length) {
      tbody.innerHTML = '<tr><td colspan="2" style="color:var(--text-secondary)">No data yet.</td></tr>';
      return;
    }
    tbody.innerHTML = d.byPage.map(r => `<tr>
      <td>${r.path}</td>
      <td>${r.count.toLocaleString()}</td>
    </tr>`).join('');

    // Daily chart
    const el = document.getElementById('pvChart');
    if (!d.daily.length) {
      el.innerHTML = '<p style="color:var(--text-secondary)">No data yet.</p>';
      return;
    }
    const max = Math.max(...d.daily.map(r => r.count));
    el.innerHTML = d.daily.map(r => {
      const pct = max > 0 ? (r.count / max) * 100 : 0;
      const label = r.date.slice(5);
      return `<div class="chart-bar-row">
        <span class="chart-bar-label">${label}</span>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
        <span class="chart-bar-value">${r.count}</span>
      </div>`;
    }).join('');
  }

  loadAdmin();
})();
