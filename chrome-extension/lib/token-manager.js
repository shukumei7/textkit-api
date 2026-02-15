const TOKEN_KEY = 'textkit_token';
const EXPIRY_KEY = 'textkit_token_expiry';

function parseJwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function saveToken(token) {
  const expiry = parseJwtExpiry(token);
  await chrome.storage.local.set({
    [TOKEN_KEY]: token,
    [EXPIRY_KEY]: expiry,
  });
}

async function getToken() {
  const data = await chrome.storage.local.get([TOKEN_KEY, EXPIRY_KEY]);
  const token = data[TOKEN_KEY];
  const expiry = data[EXPIRY_KEY];

  if (!token) return null;

  // Check expiry with 5-minute early buffer
  if (expiry && Date.now() > expiry - 5 * 60 * 1000) {
    await clearToken();
    return null;
  }

  return token;
}

async function clearToken() {
  await chrome.storage.local.remove([TOKEN_KEY, EXPIRY_KEY]);
}

export { saveToken, getToken, clearToken };
