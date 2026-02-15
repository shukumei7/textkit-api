import { getToken, clearToken } from './token-manager.js';

const BASE_URL = 'https://www.textkitapi.com';

async function apiCall(path, options = {}) {
  const token = await getToken();
  if (!token) {
    return { ok: false, error: 'NOT_LOGGED_IN', message: 'Please log in' };
  }

  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        await clearToken();
        return { ok: false, error: 'NOT_LOGGED_IN', message: 'Session expired. Please log in again.' };
      }
      return {
        ok: false,
        status: response.status,
        error: data.code || 'API_ERROR',
        message: data.details || data.error || 'Something went wrong',
      };
    }

    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: 'NETWORK_ERROR', message: 'Connection error. Check your internet.' };
  }
}

async function login(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, message: data.details || data.error || 'Login failed' };
    }

    return { ok: true, data };
  } catch (err) {
    return { ok: false, message: 'Connection error. Check your internet.' };
  }
}

export { apiCall, login, BASE_URL };
