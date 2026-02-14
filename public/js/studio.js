(function() {
  // Global state
  let currentTool = null;
  let lastResult = null;
  let usageData = null;

  // Tool registry
  const TOOLS = [
    {
      id: 'summarize',
      label: 'Summarize',
      endpoint: '/api/v1/summarize',
      description: 'Condense long text into a clear summary with key points.',
      inputs: 'single',
      options: [
        { name: 'length', type: 'select', label: 'Length', values: [
          { value: '', label: 'Auto' },
          { value: 'brief', label: 'Brief' },
          { value: 'medium', label: 'Medium' },
          { value: 'detailed', label: 'Detailed' },
        ]},
        { name: 'format', type: 'select', label: 'Format', values: [
          { value: '', label: 'Auto' },
          { value: 'paragraph', label: 'Paragraph' },
          { value: 'bullets', label: 'Bullets' },
          { value: 'numbered', label: 'Numbered' },
        ]},
      ],
      formatResult: (data) => {
        let html = `<p>${escapeHtml(data.summary)}</p>`;
        if (data.keyPoints && data.keyPoints.length > 0) {
          html += '<h4 style="margin-top:1.5rem;margin-bottom:0.5rem;color:var(--text-secondary);font-size:0.9rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Key Points</h4><ul style="margin:0;padding-left:1.5rem">';
          data.keyPoints.forEach(point => {
            html += `<li style="margin-bottom:0.5rem">${escapeHtml(point)}</li>`;
          });
          html += '</ul>';
        }
        return html;
      },
      getPlainText: (data) => {
        let text = data.summary;
        if (data.keyPoints && data.keyPoints.length > 0) {
          text += '\n\nKey Points:\n' + data.keyPoints.map(p => `- ${p}`).join('\n');
        }
        return text;
      },
    },
    {
      id: 'rewrite',
      label: 'Rewrite',
      endpoint: '/api/v1/rewrite',
      description: 'Transform your text with different tones and styles while preserving the core message.',
      inputs: 'single',
      options: [
        { name: 'tone', type: 'select', label: 'Tone', values: [
          { value: '', label: 'Auto' },
          { value: 'formal', label: 'Formal' },
          { value: 'casual', label: 'Casual' },
          { value: 'persuasive', label: 'Persuasive' },
          { value: 'academic', label: 'Academic' },
          { value: 'friendly', label: 'Friendly' },
          { value: 'professional', label: 'Professional' },
          { value: 'humorous', label: 'Humorous' },
          { value: 'empathetic', label: 'Empathetic' },
        ]},
        { name: 'preserveLength', type: 'checkbox', label: 'Preserve original length' },
      ],
      formatResult: (data) => {
        return `<p>${escapeHtml(data.rewrittenText)}</p>`;
      },
      getPlainText: (data) => data.rewrittenText,
    },
    {
      id: 'repurpose',
      label: 'Repurpose',
      endpoint: '/api/v1/repurpose',
      description: 'Adapt your content for multiple social media platforms with platform-specific formatting.',
      inputs: 'single',
      options: [
        { name: 'platforms', type: 'multi-checkbox', label: 'Platforms', values: [
          { value: 'Twitter', label: 'Twitter' },
          { value: 'LinkedIn', label: 'LinkedIn' },
          { value: 'Facebook', label: 'Facebook' },
          { value: 'Instagram', label: 'Instagram' },
          { value: 'Blog', label: 'Blog' },
          { value: 'Newsletter', label: 'Newsletter' },
        ]},
        { name: 'tone', type: 'select', label: 'Tone', values: [
          { value: '', label: 'Auto' },
          { value: 'professional', label: 'Professional' },
          { value: 'casual', label: 'Casual' },
          { value: 'humorous', label: 'Humorous' },
          { value: 'inspirational', label: 'Inspirational' },
          { value: 'educational', label: 'Educational' },
        ]},
      ],
      formatResult: (data) => {
        if (!data.versions || data.versions.length === 0) {
          return '<p style="color:var(--text-secondary)">No versions generated.</p>';
        }

        let html = '<div class="platform-tabs" style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">';
        data.versions.forEach((v, i) => {
          html += `<button class="platform-tab ${i === 0 ? 'active' : ''}" data-platform="${escapeHtml(v.platform)}" style="padding:0.5rem 1rem;border:1px solid var(--border);background:${i === 0 ? 'var(--accent)' : 'var(--bg-card)'};color:${i === 0 ? 'white' : 'var(--text-primary)'};border-radius:4px;cursor:pointer;font-size:0.875rem;font-weight:500">${escapeHtml(v.platform)}</button>`;
        });
        html += '</div>';

        data.versions.forEach((v, i) => {
          html += `<div class="platform-content" data-platform="${escapeHtml(v.platform)}" style="display:${i === 0 ? 'block' : 'none'}"><p style="white-space:pre-wrap">${escapeHtml(v.content)}</p></div>`;
        });

        return html;
      },
      getPlainText: (data) => {
        if (!data.versions || data.versions.length === 0) return '';
        return data.versions.map(v => `--- ${v.platform} ---\n${v.content}`).join('\n\n');
      },
    },
    {
      id: 'change-tone',
      label: 'Change Tone',
      endpoint: '/api/v1/translate/tone',
      description: 'Adjust the emotional tone of your text to match your intended audience and context.',
      inputs: 'single',
      options: [
        { name: 'targetTone', type: 'select', label: 'Target Tone', required: true, values: [
          { value: 'formal', label: 'Formal' },
          { value: 'casual', label: 'Casual' },
          { value: 'persuasive', label: 'Persuasive' },
          { value: 'academic', label: 'Academic' },
          { value: 'friendly', label: 'Friendly' },
          { value: 'professional', label: 'Professional' },
          { value: 'humorous', label: 'Humorous' },
          { value: 'empathetic', label: 'Empathetic' },
          { value: 'authoritative', label: 'Authoritative' },
          { value: 'conversational', label: 'Conversational' },
        ]},
      ],
      formatResult: (data) => {
        let html = '';
        if (data.detectedTone) {
          html += `<p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:1rem"><strong>Original tone:</strong> ${escapeHtml(data.detectedTone)}</p>`;
        }
        html += `<p>${escapeHtml(data.translatedText)}</p>`;
        return html;
      },
      getPlainText: (data) => {
        let text = '';
        if (data.detectedTone) {
          text += `Original tone: ${data.detectedTone}\n\n`;
        }
        text += data.translatedText;
        return text;
      },
    },
    {
      id: 'headlines',
      label: 'Headlines',
      endpoint: '/api/v1/headlines',
      description: 'Generate attention-grabbing headlines for articles, ads, and content marketing.',
      inputs: 'single',
      options: [
        { name: 'count', type: 'number', label: 'Number of Headlines', min: 1, max: 20, default: 5 },
        { name: 'type', type: 'select', label: 'Type', values: [
          { value: '', label: 'Auto' },
          { value: 'article', label: 'Article' },
          { value: 'ad', label: 'Ad' },
          { value: 'clickbait', label: 'Clickbait' },
          { value: 'seo', label: 'SEO' },
          { value: 'listicle', label: 'Listicle' },
        ]},
      ],
      formatResult: (data) => {
        if (!data.headlines || data.headlines.length === 0) {
          return '<p style="color:var(--text-secondary)">No headlines generated.</p>';
        }

        let html = '<ol style="margin:0;padding-left:1.5rem">';
        data.headlines.forEach((headline, i) => {
          html += `<li class="list-item" style="margin-bottom:1rem;position:relative;padding-right:4rem">
            <span>${escapeHtml(headline)}</span>
            <button class="list-item-copy" data-text="${escapeHtml(headline)}" style="position:absolute;right:0;top:0;padding:0.25rem 0.75rem;font-size:0.75rem;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text-secondary)">Copy</button>
          </li>`;
        });
        html += '</ol>';
        return html;
      },
      getPlainText: (data) => {
        if (!data.headlines || data.headlines.length === 0) return '';
        return data.headlines.map((h, i) => `${i + 1}. ${h}`).join('\n');
      },
    },
    {
      id: 'email-subjects',
      label: 'Email Subjects',
      endpoint: '/api/v1/email/subject-lines',
      description: 'Create compelling email subject lines that boost open rates and engagement.',
      inputs: 'single',
      options: [
        { name: 'count', type: 'number', label: 'Number of Subject Lines', min: 1, max: 20, default: 5 },
        { name: 'style', type: 'select', label: 'Style', values: [
          { value: '', label: 'Auto' },
          { value: 'promotional', label: 'Promotional' },
          { value: 'informational', label: 'Informational' },
          { value: 'urgent', label: 'Urgent' },
          { value: 'curiosity', label: 'Curiosity' },
          { value: 'personalized', label: 'Personalized' },
        ]},
      ],
      formatResult: (data) => {
        if (!data.subjectLines || data.subjectLines.length === 0) {
          return '<p style="color:var(--text-secondary)">No subject lines generated.</p>';
        }

        let html = '<ol style="margin:0;padding-left:1.5rem">';
        data.subjectLines.forEach((subject, i) => {
          html += `<li class="list-item" style="margin-bottom:1rem;position:relative;padding-right:4rem">
            <span>${escapeHtml(subject)}</span>
            <button class="list-item-copy" data-text="${escapeHtml(subject)}" style="position:absolute;right:0;top:0;padding:0.25rem 0.75rem;font-size:0.75rem;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text-secondary)">Copy</button>
          </li>`;
        });
        html += '</ol>';
        return html;
      },
      getPlainText: (data) => {
        if (!data.subjectLines || data.subjectLines.length === 0) return '';
        return data.subjectLines.map((s, i) => `${i + 1}. ${s}`).join('\n');
      },
    },
    {
      id: 'seo-optimizer',
      label: 'SEO Optimizer',
      endpoint: '/api/v1/seo/meta',
      description: 'Generate search-optimized meta tags, titles, and descriptions for better visibility.',
      inputs: 'single',
      options: [
        { name: 'url', type: 'text', label: 'Page URL (optional)', placeholder: 'https://example.com/page' },
        { name: 'keywords', type: 'text', label: 'Target Keywords (optional)', placeholder: 'keyword1, keyword2, keyword3' },
      ],
      formatResult: (data) => {
        let html = '<div class="seo-card" style="display:flex;flex-direction:column;gap:1rem">';

        if (data.title) {
          html += `<div class="seo-field" style="padding:1rem;background:var(--bg-card);border-radius:8px">
            <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">Title Tag</div>
            <div style="font-weight:500">${escapeHtml(data.title)}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem">${data.title.length} characters</div>
          </div>`;
        }

        if (data.description) {
          html += `<div class="seo-field" style="padding:1rem;background:var(--bg-card);border-radius:8px">
            <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">Meta Description</div>
            <div>${escapeHtml(data.description)}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem">${data.description.length} characters</div>
          </div>`;
        }

        if (data.keywords && data.keywords.length > 0) {
          html += `<div class="seo-field" style="padding:1rem;background:var(--bg-card);border-radius:8px">
            <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">Keywords</div>
            <div>${data.keywords.map(k => `<span style="display:inline-block;padding:0.25rem 0.75rem;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;font-size:0.875rem;margin-right:0.5rem;margin-bottom:0.5rem">${escapeHtml(k)}</span>`).join('')}</div>
          </div>`;
        }

        if (data.ogTitle) {
          html += `<div class="seo-field" style="padding:1rem;background:var(--bg-card);border-radius:8px">
            <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">Open Graph Title</div>
            <div style="font-weight:500">${escapeHtml(data.ogTitle)}</div>
          </div>`;
        }

        if (data.ogDescription) {
          html += `<div class="seo-field" style="padding:1rem;background:var(--bg-card);border-radius:8px">
            <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">Open Graph Description</div>
            <div>${escapeHtml(data.ogDescription)}</div>
          </div>`;
        }

        html += '</div>';
        return html;
      },
      getPlainText: (data) => {
        let text = '';
        if (data.title) text += `Title: ${data.title}\n\n`;
        if (data.description) text += `Description: ${data.description}\n\n`;
        if (data.keywords && data.keywords.length > 0) text += `Keywords: ${data.keywords.join(', ')}\n\n`;
        if (data.ogTitle) text += `OG Title: ${data.ogTitle}\n\n`;
        if (data.ogDescription) text += `OG Description: ${data.ogDescription}`;
        return text.trim();
      },
    },
    {
      id: 'keywords',
      label: 'Keywords',
      endpoint: '/api/v1/extract/keywords',
      description: 'Extract important keywords and entities from your content for SEO and analysis.',
      inputs: 'single',
      options: [
        { name: 'maxKeywords', type: 'number', label: 'Max Keywords', min: 1, max: 50, default: 10 },
        { name: 'includeEntities', type: 'checkbox', label: 'Include named entities (people, places, organizations)' },
      ],
      formatResult: (data) => {
        let html = '';

        if (data.keywords && data.keywords.length > 0) {
          html += '<div class="keyword-pills" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem">';
          data.keywords.forEach(keyword => {
            html += `<span class="keyword-pill" style="display:inline-block;padding:0.5rem 1rem;background:var(--accent);color:white;border-radius:20px;font-size:0.875rem;font-weight:500">${escapeHtml(keyword)}</span>`;
          });
          html += '</div>';
        }

        if (data.entities && Object.keys(data.entities).length > 0) {
          html += '<h4 style="margin-top:1.5rem;margin-bottom:1rem;color:var(--text-secondary);font-size:0.9rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Named Entities</h4>';

          for (const [category, items] of Object.entries(data.entities)) {
            if (items && items.length > 0) {
              html += `<div style="margin-bottom:1rem">
                <div style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:0.5rem;font-weight:500">${escapeHtml(category)}</div>
                <div style="display:flex;flex-wrap:wrap;gap:0.5rem">`;
              items.forEach(item => {
                html += `<span style="display:inline-block;padding:0.375rem 0.875rem;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;font-size:0.875rem">${escapeHtml(item)}</span>`;
              });
              html += '</div></div>';
            }
          }
        }

        return html || '<p style="color:var(--text-secondary)">No keywords extracted.</p>';
      },
      getPlainText: (data) => {
        let text = '';
        if (data.keywords && data.keywords.length > 0) {
          text += 'Keywords:\n' + data.keywords.join(', ') + '\n\n';
        }
        if (data.entities && Object.keys(data.entities).length > 0) {
          text += 'Named Entities:\n';
          for (const [category, items] of Object.entries(data.entities)) {
            if (items && items.length > 0) {
              text += `${category}: ${items.join(', ')}\n`;
            }
          }
        }
        return text.trim();
      },
    },
    {
      id: 'compare',
      label: 'Compare Texts',
      endpoint: '/api/v1/compare',
      description: 'Analyze and compare two texts across multiple dimensions like tone, clarity, and persuasiveness.',
      inputs: 'dual',
      options: [
        { name: 'aspects', type: 'multi-checkbox', label: 'Compare Aspects', values: [
          { value: 'tone', label: 'Tone' },
          { value: 'clarity', label: 'Clarity' },
          { value: 'persuasiveness', label: 'Persuasiveness' },
          { value: 'readability', label: 'Readability' },
          { value: 'engagement', label: 'Engagement' },
        ]},
      ],
      formatResult: (data) => {
        return `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
      },
      getPlainText: (data) => {
        return JSON.stringify(data, null, 2);
      },
    },
  ];

  // Utility: escape HTML
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Auth check
  async function checkAuth() {
    try {
      const res = await fetch('/auth/me');
      if (!res.ok) {
        window.location.href = '/login.html?redirect=/studio.html';
        return null;
      }
      return await res.json();
    } catch {
      window.location.href = '/login.html?redirect=/studio.html';
      return null;
    }
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/';
  });

  // Render tool list
  function renderToolList() {
    const toolList = document.getElementById('toolList');
    toolList.innerHTML = TOOLS.map((tool, i) => `
      <button class="tool-btn ${i === 0 ? 'active' : ''}" data-tool-id="${tool.id}">
        ${escapeHtml(tool.label)}
      </button>
    `).join('');

    // Attach click handlers
    toolList.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const toolId = btn.getAttribute('data-tool-id');
        selectTool(toolId);
      });
    });
  }

  // Select tool
  function selectTool(toolId) {
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) return;

    currentTool = tool;

    // Update active button
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tool-id') === toolId);
    });

    // Update title and description
    document.getElementById('toolTitle').textContent = tool.label;
    document.getElementById('toolDescription').textContent = tool.description;

    // Show/hide second textarea
    const input2 = document.getElementById('studioInput2');
    input2.style.display = tool.inputs === 'dual' ? 'block' : 'none';

    // Render options
    renderOptions(tool);

    // Clear output and errors
    document.getElementById('outputArea').style.display = 'none';
    document.getElementById('errorArea').style.display = 'none';
    lastResult = null;
  }

  // Render options
  function renderOptions(tool) {
    const container = document.getElementById('toolOptions');

    if (!tool.options || tool.options.length === 0) {
      container.innerHTML = '';
      return;
    }

    let html = '';

    tool.options.forEach(opt => {
      if (opt.type === 'select') {
        html += `<div class="option-group">
          <label>${escapeHtml(opt.label)}</label>
          <select name="${opt.name}">`;
        opt.values.forEach(v => {
          html += `<option value="${escapeHtml(v.value)}">${escapeHtml(v.label)}</option>`;
        });
        html += '</select></div>';
      } else if (opt.type === 'checkbox') {
        html += `<label class="checkbox-label">
          <input type="checkbox" name="${opt.name}">
          ${escapeHtml(opt.label)}
        </label>`;
      } else if (opt.type === 'number') {
        html += `<div class="option-group">
          <label>${escapeHtml(opt.label)}</label>
          <input type="number" name="${opt.name}" min="${opt.min}" max="${opt.max}" value="${opt.default || opt.min}">
        </div>`;
      } else if (opt.type === 'text') {
        html += `<div class="option-group">
          <label>${escapeHtml(opt.label)}</label>
          <input type="text" name="${opt.name}" placeholder="${escapeHtml(opt.placeholder || '')}">
        </div>`;
      } else if (opt.type === 'multi-checkbox') {
        html += `<div class="option-group">
          <label>${escapeHtml(opt.label)}</label>
          <div class="platform-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:0.5rem;margin-top:0.5rem">`;
        opt.values.forEach(v => {
          html += `<label class="checkbox-label" style="margin:0">
            <input type="checkbox" name="${opt.name}" value="${escapeHtml(v.value)}">
            ${escapeHtml(v.label)}
          </label>`;
        });
        html += '</div></div>';
      }
    });

    container.innerHTML = html;
  }

  // Collect options from UI
  function collectOptions() {
    const options = {};
    const container = document.getElementById('toolOptions');

    container.querySelectorAll('select').forEach(sel => {
      const val = sel.value;
      if (val !== '') options[sel.name] = val;
    });

    container.querySelectorAll('input[type="checkbox"]:not([value])').forEach(cb => {
      if (cb.checked) options[cb.name] = true;
    });

    container.querySelectorAll('input[type="number"]').forEach(inp => {
      const val = parseInt(inp.value, 10);
      if (!isNaN(val)) options[inp.name] = val;
    });

    container.querySelectorAll('input[type="text"]').forEach(inp => {
      const val = inp.value.trim();
      if (val !== '') {
        // Special handling for keywords: split comma-separated into array
        if (inp.name === 'keywords') {
          options[inp.name] = val.split(',').map(k => k.trim()).filter(k => k);
        } else {
          options[inp.name] = val;
        }
      }
    });

    // Multi-checkbox: collect checked values into array
    const multiCheckboxes = {};
    container.querySelectorAll('input[type="checkbox"][value]').forEach(cb => {
      if (!multiCheckboxes[cb.name]) multiCheckboxes[cb.name] = [];
      if (cb.checked) multiCheckboxes[cb.name].push(cb.value);
    });
    Object.keys(multiCheckboxes).forEach(name => {
      if (multiCheckboxes[name].length > 0) {
        options[name] = multiCheckboxes[name];
      }
    });

    return options;
  }

  // Process button click
  document.getElementById('processBtn').addEventListener('click', async () => {
    if (!currentTool) return;

    const text = document.getElementById('studioInput').value.trim();
    if (!text) {
      showToast('Please enter some text to process.');
      return;
    }

    const text2 = currentTool.inputs === 'dual' ? document.getElementById('studioInput2').value.trim() : null;
    if (currentTool.inputs === 'dual' && !text2) {
      showToast('Please enter text in both input fields.');
      return;
    }

    const options = collectOptions();

    // Build request body
    const body = currentTool.inputs === 'dual'
      ? { text1: text, text2, ...options }
      : { text, ...options };

    // Disable button
    const btn = document.getElementById('processBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Processing...';

    // Hide errors
    document.getElementById('errorArea').style.display = 'none';

    try {
      const res = await fetch(currentTool.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.status === 401) {
        // Session expired
        document.getElementById('sessionModal').classList.add('show');
        return;
      }

      if (res.status === 429) {
        // Rate limit
        if (data.code === 'RATE_LIMIT_MINUTE') {
          showToast('Slow down! Wait a moment before trying again.');
        } else {
          const errorArea = document.getElementById('errorArea');
          errorArea.innerHTML = `<p style="margin-bottom:0.5rem">${escapeHtml(data.error || 'Daily limit reached.')}</p>
            <a href="/dashboard.html" style="color:var(--accent);text-decoration:underline">Upgrade to continue</a>`;
          errorArea.style.display = 'block';
        }
        return;
      }

      if (res.status === 400) {
        const errorArea = document.getElementById('errorArea');
        errorArea.textContent = data.error || data.details || 'Invalid request. Please check your input.';
        errorArea.style.display = 'block';
        return;
      }

      if (!res.ok) {
        const errorArea = document.getElementById('errorArea');
        errorArea.innerHTML = `<p style="margin-bottom:0.5rem">Something went wrong. Please try again.</p>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('processBtn').click()">Retry</button>`;
        errorArea.style.display = 'block';
        return;
      }

      // Success
      lastResult = data;
      const outputContent = document.getElementById('outputContent');
      outputContent.innerHTML = currentTool.formatResult(data);

      // Attach click handlers for platform tabs (repurpose tool)
      outputContent.querySelectorAll('.platform-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const platform = tab.getAttribute('data-platform');
          outputContent.querySelectorAll('.platform-tab').forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-platform') === platform);
            t.style.background = t.getAttribute('data-platform') === platform ? 'var(--accent)' : 'var(--bg-card)';
            t.style.color = t.getAttribute('data-platform') === platform ? 'white' : 'var(--text-primary)';
          });
          outputContent.querySelectorAll('.platform-content').forEach(c => {
            c.style.display = c.getAttribute('data-platform') === platform ? 'block' : 'none';
          });
        });
      });

      // Attach click handlers for list-item-copy buttons
      outputContent.querySelectorAll('.list-item-copy').forEach(copyBtn => {
        copyBtn.addEventListener('click', () => {
          const text = copyBtn.getAttribute('data-text');
          navigator.clipboard.writeText(text);
          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = originalText; }, 1000);
        });
      });

      document.getElementById('outputArea').style.display = 'block';

      // Refresh usage
      refreshUsage();

    } catch (err) {
      const errorArea = document.getElementById('errorArea');
      errorArea.innerHTML = `<p style="margin-bottom:0.5rem">Connection error. Please check your internet connection.</p>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('processBtn').click()">Retry</button>`;
      errorArea.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  // Copy button
  document.getElementById('copyBtn').addEventListener('click', () => {
    if (!currentTool || !lastResult) return;
    const text = currentTool.getPlainText(lastResult);
    navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = originalText; }, 2000);
  });

  // Download button
  document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!currentTool || !lastResult) return;
    const text = currentTool.getPlainText(lastResult);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTool.id}-result.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Refresh usage
  async function refreshUsage() {
    try {
      const res = await fetch('/dashboard/studio/usage');
      if (!res.ok) return;

      const data = await res.json();
      usageData = data;

      // Update tier badge
      document.getElementById('tierBadge').textContent = data.tier;

      // Update usage text
      const usageText = document.getElementById('usageText');
      if (data.limitToday === null) {
        usageText.textContent = 'Unlimited usage';
      } else {
        usageText.textContent = `${data.usedToday} of ${data.limitToday} used today`;
      }

      // Update usage bar
      const usageBar = document.getElementById('usageBar');
      let percentage = 0;
      if (data.limitToday !== null && data.limitToday > 0) {
        percentage = (data.usedToday / data.limitToday) * 100;
      }
      usageBar.style.width = `${Math.min(percentage, 100)}%`;

      // Color based on usage
      let color = '#22c55e'; // green
      if (percentage >= 80) color = '#ef4444'; // red
      else if (percentage >= 50) color = '#eab308'; // yellow
      usageBar.style.background = color;

      // Disable button if at limit
      const processBtn = document.getElementById('processBtn');
      if (data.limitToday !== null && data.usedToday >= data.limitToday) {
        processBtn.disabled = true;
        processBtn.textContent = 'Limit reached';
      } else if (processBtn.textContent === 'Limit reached') {
        processBtn.disabled = false;
        processBtn.textContent = 'Process';
      }

      // Show/hide upgrade link
      const upgradeLink = document.getElementById('upgradeLink');
      if (data.tier === 'MEGA') {
        upgradeLink.style.display = 'none';
      } else {
        upgradeLink.style.display = 'inline';
      }

    } catch (err) {
      console.error('Failed to refresh usage:', err);
    }
  }

  // Toast
  function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // Init
  async function init() {
    const authData = await checkAuth();
    if (!authData) return;

    renderToolList();
    selectTool(TOOLS[0].id);
    refreshUsage();
  }

  init();
})();
