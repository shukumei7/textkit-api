const { callLLM } = require('./llm');
const { systemMessage, buildPrompt } = require('../prompts/keywords');

async function keywords({ text, maxKeywords = 10, includeEntities = true }) {
  const clampedMax = Math.min(Math.max(1, maxKeywords), 50);

  const userMessage = buildPrompt(text, clampedMax, includeEntities);
  const { data, tokensUsed } = await callLLM({ systemMessage, userMessage, jsonMode: true });

  return {
    ...data,
    metadata: { maxKeywords: clampedMax, includeEntities, tokensUsed },
  };
}

module.exports = { keywords };
