const { callLLM } = require('./llm');
const { systemMessage, buildPrompt } = require('../prompts/product-description');

const REQUIRED_TAG_COUNT = 13;
const MAX_TAG_LENGTH = 20;
const MAX_TITLE_LENGTH = 140;

function truncateAtWordBoundary(str, maxLength) {
  if (str.length <= maxLength) return str;
  const truncated = str.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  const normalized = tags
    .map(t => (typeof t === 'string' ? t.trim().slice(0, MAX_TAG_LENGTH) : ''))
    .filter(Boolean);

  // Pad with generic tags if LLM returned fewer than 13
  while (normalized.length < REQUIRED_TAG_COUNT) {
    normalized.push(`handmade item ${normalized.length + 1}`);
  }

  return normalized.slice(0, REQUIRED_TAG_COUNT);
}

async function generateProductDescription({ name, materials, features, style, targetBuyer }) {
  const userMessage = buildPrompt(name, materials, features, style, targetBuyer);
  const { data, tokensUsed } = await callLLM({ systemMessage, userMessage, jsonMode: true, maxTokens: 1024 });

  if (!data.title || !data.description || !data.tags || !data.meta) {
    const err = new Error('LLM returned incomplete product description');
    err.status = 502;
    err.code = 'LLM_INCOMPLETE_RESPONSE';
    throw err;
  }

  const title = truncateAtWordBoundary(String(data.title), MAX_TITLE_LENGTH);
  const tags = normalizeTags(data.tags);

  return {
    title,
    description: String(data.description),
    tags,
    meta: String(data.meta),
    metadata: { tokensUsed },
  };
}

module.exports = { generateProductDescription };
