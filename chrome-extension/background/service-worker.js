import ENDPOINTS from '../lib/endpoints.js';
import { apiCall } from '../lib/api-client.js';
import { getToken } from '../lib/token-manager.js';

async function ensureContentScript(tabId) {
  try {
    // Check if already injected by sending a ping
    await chrome.tabs.sendMessage(tabId, { type: 'TEXTKIT_PING' });
  } catch {
    // Not injected yet, inject now
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js'],
    });
  }
}

// Create context menus on install
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu
  chrome.contextMenus.create({
    id: 'textkit-parent',
    title: 'TextKit',
    contexts: ['selection'],
  });

  // Child menu items for each endpoint
  for (const ep of ENDPOINTS) {
    chrome.contextMenus.create({
      id: `textkit-${ep.id}`,
      parentId: 'textkit-parent',
      title: ep.label,
      contexts: ['selection'],
    });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId.startsWith('textkit-')) return;
  if (info.menuItemId === 'textkit-parent') return;

  const endpointId = info.menuItemId.replace('textkit-', '');
  const endpoint = ENDPOINTS.find(ep => ep.id === endpointId);
  if (!endpoint) return;

  const text = info.selectionText;
  if (!text) return;

  await ensureContentScript(tab.id);

  // Check if logged in
  const token = await getToken();
  if (!token) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TEXTKIT_RESULT',
      error: true,
      errorType: 'NOT_LOGGED_IN',
      message: 'Please log in via the TextKit extension popup.',
    });
    return;
  }

  // Two-step compare flow
  if (endpoint.dualInput) {
    const stored = await chrome.storage.local.get('textkit_compare_text1');

    if (!stored.textkit_compare_text1) {
      // Step 1: Save first text
      if (text.length < endpoint.minLength) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'TEXTKIT_RESULT',
          error: true,
          errorType: 'VALIDATION',
          message: `Text too short. ${endpoint.label} needs at least ${endpoint.minLength} characters (selected: ${text.length}).`,
        });
        return;
      }
      if (text.length > endpoint.maxLength) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'TEXTKIT_RESULT',
          error: true,
          errorType: 'VALIDATION',
          message: `Text too long. ${endpoint.label} allows up to ${endpoint.maxLength.toLocaleString()} characters (selected: ${text.length.toLocaleString()}).`,
        });
        return;
      }
      await chrome.storage.local.set({ textkit_compare_text1: text });
      chrome.tabs.sendMessage(tab.id, {
        type: 'TEXTKIT_TOAST',
        message: 'First text saved. Now select the second text and click Compare again.',
      });
      return;
    } else {
      // Step 2: Use stored text1 + current selection as text2
      const text1 = stored.textkit_compare_text1;
      await chrome.storage.local.remove('textkit_compare_text1');

      // Validate text2 (current selection)
      if (text.length < endpoint.minLength) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'TEXTKIT_RESULT',
          error: true,
          errorType: 'VALIDATION',
          message: `Second text too short. Needs at least ${endpoint.minLength} characters (selected: ${text.length}). First text cleared — start over.`,
        });
        return;
      }
      if (text.length > endpoint.maxLength) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'TEXTKIT_RESULT',
          error: true,
          errorType: 'VALIDATION',
          message: `Second text too long. Allows up to ${endpoint.maxLength.toLocaleString()} characters (selected: ${text.length.toLocaleString()}). First text cleared — start over.`,
        });
        return;
      }

      // Show loading
      chrome.tabs.sendMessage(tab.id, {
        type: 'TEXTKIT_LOADING',
        label: endpoint.label,
      });

      // Make API call with both texts
      const body = { text1, text2: text };
      const result = await apiCall(endpoint.path, { method: 'POST', body });

      if (!result.ok) {
        let message = result.message;
        if (result.error === 'RATE_LIMIT_MINUTE') message = 'Slow down — try again in a minute.';
        else if (result.error === 'RATE_LIMIT_DAY') message = 'Daily limit reached. Upgrade your plan for more requests.';
        chrome.tabs.sendMessage(tab.id, {
          type: 'TEXTKIT_RESULT',
          error: true,
          errorType: result.error,
          message,
          upgradeUrl: result.error === 'RATE_LIMIT_DAY' ? 'https://www.textkitapi.com/dashboard.html' : undefined,
        });
        return;
      }

      chrome.tabs.sendMessage(tab.id, {
        type: 'TEXTKIT_RESULT',
        error: false,
        label: endpoint.label,
        data: result.data,
      });
      return;
    }
  }

  // Pre-validate text length
  if (text.length < endpoint.minLength) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TEXTKIT_RESULT',
      error: true,
      errorType: 'VALIDATION',
      message: `Text too short. ${endpoint.label} needs at least ${endpoint.minLength} characters (selected: ${text.length}).`,
    });
    return;
  }

  if (text.length > endpoint.maxLength) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TEXTKIT_RESULT',
      error: true,
      errorType: 'VALIDATION',
      message: `Text too long. ${endpoint.label} allows up to ${endpoint.maxLength.toLocaleString()} characters (selected: ${text.length.toLocaleString()}).`,
    });
    return;
  }

  // Show loading state
  chrome.tabs.sendMessage(tab.id, {
    type: 'TEXTKIT_LOADING',
    label: endpoint.label,
  });

  // Make the API call
  const body = { [endpoint.fieldName]: text, ...endpoint.defaultParams };
  const result = await apiCall(endpoint.path, {
    method: 'POST',
    body,
  });

  if (!result.ok) {
    let message = result.message;
    if (result.error === 'RATE_LIMIT_MINUTE') {
      message = 'Slow down — try again in a minute.';
    } else if (result.error === 'RATE_LIMIT_DAY') {
      message = 'Daily limit reached. Upgrade your plan for more requests.';
    }

    chrome.tabs.sendMessage(tab.id, {
      type: 'TEXTKIT_RESULT',
      error: true,
      errorType: result.error,
      message,
      upgradeUrl: result.error === 'RATE_LIMIT_DAY' ? 'https://www.textkitapi.com/dashboard.html' : undefined,
    });
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    type: 'TEXTKIT_RESULT',
    error: false,
    label: endpoint.label,
    data: result.data,
  });
});
