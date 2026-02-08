const { callLLM } = require('./llm');
const { systemMessage, buildPrompt } = require('../prompts/headlines');

const VALID_TYPES = ['article', 'ad', 'clickbait', 'seo', 'listicle'];

async function generateHeadlines({ text, count, type }) {
  const headlineCount = count !== undefined && count !== null ? count : 5;

  if (headlineCount < 1 || headlineCount > 20) {
    throw Object.assign(new Error('Count must be between 1 and 20'), { status: 400, code: 'INVALID_COUNT', expose: true });
  }

  if (type && !VALID_TYPES.includes(type.toLowerCase())) {
    throw Object.assign(new Error(`Invalid type. Valid options: ${VALID_TYPES.join(', ')}`), { status: 400, code: 'INVALID_TYPE', expose: true });
  }

  const userMessage = buildPrompt(text, headlineCount, type);
  const { data, tokensUsed } = await callLLM({ systemMessage, userMessage, jsonMode: true });

  return {
    headlines: data.headlines,
    metadata: { count: headlineCount, type: type || 'article', tokensUsed },
  };
}

module.exports = { generateHeadlines, VALID_TYPES };
