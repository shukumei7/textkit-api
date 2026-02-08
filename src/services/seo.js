const { callLLM } = require('./llm');
const { systemMessage, buildPrompt } = require('../prompts/seo');

async function generateSEOMeta({ text, url, keywords }) {
  if (url && typeof url !== 'string') {
    throw Object.assign(new Error('URL must be a string'), { status: 400, code: 'INVALID_URL', expose: true });
  }

  if (keywords && !Array.isArray(keywords)) {
    throw Object.assign(new Error('Keywords must be an array'), { status: 400, code: 'INVALID_KEYWORDS', expose: true });
  }

  const userMessage = buildPrompt(text, url, keywords);
  const { data, tokensUsed } = await callLLM({ systemMessage, userMessage, jsonMode: true });

  return {
    seo: data,
    metadata: { url: url || null, providedKeywords: keywords || [], tokensUsed },
  };
}

module.exports = { generateSEOMeta };
