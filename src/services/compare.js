const { callLLM } = require('./llm');
const { systemMessage, buildPrompt } = require('../prompts/compare');

const VALID_ASPECTS = ['tone', 'complexity', 'length', 'vocabulary', 'structure'];

async function compare({ text1, text2, aspects = VALID_ASPECTS }) {
  const selectedAspects = aspects.filter(a => VALID_ASPECTS.includes(a.toLowerCase()));

  if (selectedAspects.length === 0) {
    throw Object.assign(new Error(`Invalid aspects. Valid options: ${VALID_ASPECTS.join(', ')}`), { status: 400, code: 'INVALID_ASPECTS', expose: true });
  }

  const userMessage = buildPrompt(text1, text2, selectedAspects);
  const { data, tokensUsed } = await callLLM({ systemMessage, userMessage, jsonMode: true });

  return {
    ...data,
    metadata: { aspectsAnalyzed: selectedAspects, tokensUsed },
  };
}

module.exports = { compare, VALID_ASPECTS };
