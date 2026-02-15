import { login, apiCall } from '../lib/api-client.js';
import { saveToken, getToken, clearToken } from '../lib/token-manager.js';

const loginView = document.getElementById('loginView');
const dashView = document.getElementById('dashView');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const userEmail = document.getElementById('userEmail');
const userTier = document.getElementById('userTier');
const usageBar = document.getElementById('usageBar');
const usageCount = document.getElementById('usageCount');
const usageLimit = document.getElementById('usageLimit');
const logoutBtn = document.getElementById('logoutBtn');

async function init() {
  const token = await getToken();
  if (token) {
    await showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.hidden = false;
  dashView.hidden = true;
}

async function showDashboard() {
  loginView.hidden = true;
  dashView.hidden = false;

  // Fetch user info
  const meResult = await apiCall('/auth/me');
  if (!meResult.ok) {
    showLogin();
    return;
  }

  userEmail.textContent = meResult.data.user.email;

  // Fetch usage
  const usageResult = await apiCall('/dashboard/studio/usage');
  if (usageResult.ok) {
    const { tier, usedToday, limitToday } = usageResult.data;
    userTier.textContent = tier;
    usageCount.textContent = usedToday;
    usageLimit.textContent = limitToday === Infinity || limitToday > 99999 ? 'Unlimited' : limitToday;
    const pct = limitToday === Infinity || limitToday > 99999 ? 0 : Math.min((usedToday / limitToday) * 100, 100);
    usageBar.style.width = `${pct}%`;
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const result = await login(email, password);

  if (result.ok && result.data.token) {
    await saveToken(result.data.token);
    await showDashboard();
  } else {
    loginError.textContent = result.message || 'Login failed';
    loginError.hidden = false;
  }

  loginBtn.disabled = false;
  loginBtn.textContent = 'Log In';
});

logoutBtn.addEventListener('click', async () => {
  await clearToken();
  showLogin();
});

init();
