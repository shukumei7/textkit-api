let panel = null;
let shadow = null;
let lastSelection = null;
let lastRange = null;

// Capture selection before context menu steals it
document.addEventListener('mousedown', (e) => {
  if (e.button === 2) { // right-click
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      lastSelection = sel.toString();
      lastRange = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    }
  }
});

function getOrCreatePanel() {
  if (panel) return shadow;

  panel = document.createElement('div');
  panel.id = 'textkit-panel-host';
  shadow = panel.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    }

    .backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 1;
    }

    .panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 380px;
      max-width: 90vw;
      background: #0f0f23;
      color: #e2e8f0;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
      z-index: 2;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.25s ease;
    }

    .panel.open {
      transform: translateX(0);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #1e293b;
      flex-shrink: 0;
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .panel-logo {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      color: white;
    }

    .panel-label {
      font-size: 14px;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      line-height: 1;
    }

    .close-btn:hover {
      background: #1e293b;
      color: #e2e8f0;
    }

    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .panel-actions {
      display: flex;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid #1e293b;
      flex-shrink: 0;
    }

    .btn {
      flex: 1;
      padding: 10px 16px;
      border-radius: 8px;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .btn:hover { opacity: 0.85; }

    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
    }

    .btn-secondary {
      background: #1a1a2e;
      border: 1px solid #334155;
      color: #e2e8f0;
    }

    /* Loading */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      height: 200px;
      color: #94a3b8;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #334155;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Result content */
    .result-text {
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Error */
    .error-container {
      text-align: center;
      padding: 40px 20px;
    }

    .error-icon {
      font-size: 36px;
      margin-bottom: 12px;
    }

    .error-message {
      font-size: 14px;
      color: #f87171;
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .error-link {
      color: #818cf8;
      text-decoration: none;
      font-size: 13px;
    }

    .error-link:hover {
      text-decoration: underline;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #e2e8f0;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 3;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .toast.show {
      opacity: 1;
    }
  `;

  shadow.appendChild(style);
  document.body.appendChild(panel);
  return shadow;
}

function showPanel(content) {
  const root = getOrCreatePanel();

  // Clear previous content
  const existingBackdrop = root.querySelector('.backdrop');
  const existingPanel = root.querySelector('.panel');
  const existingToast = root.querySelector('.toast');
  if (existingBackdrop) existingBackdrop.remove();
  if (existingPanel) existingPanel.remove();
  if (existingToast) existingToast.remove();

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.addEventListener('click', closePanel);
  root.appendChild(backdrop);

  // Panel
  const panelEl = document.createElement('div');
  panelEl.className = 'panel';
  panelEl.innerHTML = content;
  root.appendChild(panelEl);

  // Animate open
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panelEl.classList.add('open');
    });
  });

  // Close button handler
  const closeBtn = panelEl.querySelector('.close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  return panelEl;
}

function closePanel() {
  if (!shadow) return;
  const panelEl = shadow.querySelector('.panel');
  if (panelEl) {
    panelEl.classList.remove('open');
    setTimeout(() => {
      const backdrop = shadow.querySelector('.backdrop');
      if (backdrop) backdrop.remove();
      panelEl.remove();
    }, 250);
  }
}

function showToast(message) {
  if (!shadow) return;
  let toast = shadow.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    shadow.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function formatResult(data) {
  if (typeof data === 'string') return data;

  // Compare: { similarity, differences: [{aspect, text1, text2}], summary }
  // Checked before Summarize since both have 'summary'
  if (data.differences || data.similarity !== undefined) {
    let text = '';
    if (data.summary) text += data.summary + '\n\n';
    if (data.differences && data.differences.length) {
      text += 'Differences:\n' + data.differences.map(d =>
        typeof d === 'string' ? `• ${d}` : `• ${d.aspect}: Text 1 — ${d.text1}; Text 2 — ${d.text2}`
      ).join('\n') + '\n\n';
    }
    if (data.similarity !== undefined) text += `Similarity: ${Math.round(data.similarity * 100)}%`;
    return text.trim();
  }

  // Summarize: { summary, keyPoints }
  if (data.summary) {
    let text = data.summary;
    if (data.keyPoints && data.keyPoints.length) {
      text += '\n\nKey Points:\n' + data.keyPoints.map(p => `• ${p}`).join('\n');
    }
    return text;
  }

  // Rewrite: { rewritten }
  if (data.rewritten) return data.rewritten;

  // Keywords: { keywords: [{word, relevance}], entities, topics }
  if (data.keywords && !data.seo) {
    let text = 'Keywords: ' + data.keywords.map(k => typeof k === 'string' ? k : k.word || k.keyword || k.term).join(', ');
    if (data.entities) {
      if (Array.isArray(data.entities)) {
        text += '\n\nEntities:\n' + data.entities.map(e => `• ${typeof e === 'string' ? e : e.name} (${e.type || 'entity'})`).join('\n');
      } else {
        for (const [cat, items] of Object.entries(data.entities)) {
          if (Array.isArray(items) && items.length) {
            text += `\n\n${cat}:\n` + items.map(e => `• ${typeof e === 'string' ? e : e.name}`).join('\n');
          }
        }
      }
    }
    if (data.topics && data.topics.length) text += '\n\nTopics: ' + data.topics.join(', ');
    return text;
  }

  // Headlines: { headlines: [{text, type, characterCount}] }
  if (data.headlines) return data.headlines.map((h, i) => `${i + 1}. ${typeof h === 'string' ? h : h.text}`).join('\n');

  // SEO Meta: { seo: { titleTag, metaDescription, ogTitle, ogDescription, keywords[] } }
  if (data.seo) {
    const s = data.seo;
    let text = '';
    if (s.titleTag) text += `Title: ${s.titleTag}\n\n`;
    if (s.metaDescription) text += `Description: ${s.metaDescription}\n\n`;
    if (s.ogTitle) text += `OG Title: ${s.ogTitle}\n\n`;
    if (s.ogDescription) text += `OG Description: ${s.ogDescription}\n\n`;
    if (s.keywords) text += 'Keywords: ' + (Array.isArray(s.keywords) ? s.keywords.join(', ') : s.keywords);
    return text.trim();
  }

  // Email subject lines: { subjectLines: [{text, style, estimatedOpenRate}] }
  if (data.subjectLines) return data.subjectLines.map((s, i) => `${i + 1}. ${typeof s === 'string' ? s : s.text}`).join('\n');

  // Tone: { translated }
  if (data.translated) return data.translated;

  // Repurpose: { platforms: { twitter: {post, hashtags[]}, ... } }
  if (data.platforms) {
    if (Array.isArray(data.platforms)) {
      return data.platforms.map(p => `--- ${p.platform || p.name} ---\n${p.post || p.content || p.text}`).join('\n\n');
    }
    return Object.entries(data.platforms).map(([platform, content]) => {
      const post = typeof content === 'string' ? content : content.post || content.content || content.text;
      const hashtags = content.hashtags && content.hashtags.length ? '\n' + content.hashtags.map(t => `#${t}`).join(' ') : '';
      return `--- ${platform} ---\n${post}${hashtags}`;
    }).join('\n\n');
  }

  // Fallback: stringify
  return JSON.stringify(data, null, 2);
}

function replaceSelection(newText) {
  // Only works in editable elements
  const active = document.activeElement;
  const isEditable = active && (
    active.tagName === 'TEXTAREA' ||
    (active.tagName === 'INPUT' && active.type === 'text') ||
    active.isContentEditable
  );

  if (isEditable) {
    if (active.isContentEditable) {
      // For contentEditable, restore range and use execCommand
      if (lastRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(lastRange);
        document.execCommand('insertText', false, newText);
        return true;
      }
    } else {
      // For textarea/input
      const start = active.selectionStart;
      const end = active.selectionEnd;
      if (start !== end) {
        document.execCommand('insertText', false, newText);
        return true;
      }
    }
  }
  return false;
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'TEXTKIT_TOAST') {
    showToast(msg.message);
    return;
  }

  if (msg.type === 'TEXTKIT_LOADING') {
    showPanel(`
      <div class="panel-header">
        <div class="panel-title">
          <div class="panel-logo">TK</div>
          <span class="panel-label">${msg.label}</span>
        </div>
        <button class="close-btn">&times;</button>
      </div>
      <div class="panel-body">
        <div class="loading">
          <div class="spinner"></div>
          <span>Processing...</span>
        </div>
      </div>
    `);
    return;
  }

  if (msg.type === 'TEXTKIT_RESULT') {
    if (msg.error) {
      const icon = msg.errorType === 'NOT_LOGGED_IN' ? '🔒' : '⚠️';
      const upgradeLink = msg.upgradeUrl
        ? `<a href="${msg.upgradeUrl}" target="_blank" class="error-link">Upgrade Plan</a>`
        : '';

      showPanel(`
        <div class="panel-header">
          <div class="panel-title">
            <div class="panel-logo">TK</div>
            <span class="panel-label">TextKit</span>
          </div>
          <button class="close-btn">&times;</button>
        </div>
        <div class="panel-body">
          <div class="error-container">
            <div class="error-icon">${icon}</div>
            <div class="error-message">${msg.message}</div>
            ${upgradeLink}
          </div>
        </div>
      `);
      return;
    }

    // Success
    const resultText = formatResult(msg.data);

    const panelEl = showPanel(`
      <div class="panel-header">
        <div class="panel-title">
          <div class="panel-logo">TK</div>
          <span class="panel-label">${msg.label}</span>
        </div>
        <button class="close-btn">&times;</button>
      </div>
      <div class="panel-body">
        <div class="result-text"></div>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" id="tk-copy">Copy</button>
        <button class="btn btn-secondary" id="tk-replace">Replace Selection</button>
      </div>
    `);

    // Set text content safely (no innerHTML for user data)
    const resultEl = panelEl.querySelector('.result-text');
    resultEl.textContent = resultText;

    // Copy button
    panelEl.querySelector('#tk-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(resultText);
        showToast('Copied to clipboard');
      } catch {
        showToast('Copy failed');
      }
    });

    // Replace button
    panelEl.querySelector('#tk-replace').addEventListener('click', () => {
      const replaced = replaceSelection(resultText);
      if (replaced) {
        showToast('Text replaced');
        closePanel();
      } else {
        // Fall back to copy
        navigator.clipboard.writeText(resultText).then(() => {
          showToast('Not editable — copied to clipboard instead');
        }).catch(() => {
          showToast('Could not replace or copy');
        });
      }
    });
  }
});
