const { callLLM } = require('./llm');
const { systemMessage, buildPrompt } = require('../prompts/tone');

const VALID_TONES = ['formal', 'casual', 'persuasive', 'academic', 'friendly', 'professional', 'humorous', 'empathetic', 'authoritative', 'conversational'];

async function tone({ text, targetTone }) {
  if (!VALID_TONES.includes(targetTone.toLowerCase())) {
    throw Object.assign(new Error(`Invalid tone. Valid options: ${VALID_TONES.join(', ')}`), { status: 400, code: 'INVALID_TONE', expose: true });
  }

  const userMessage = buildPrompt(text, targetTone);
  const { data, tokensUsed } = await callLLM({ systemMessage, userMessage, jsonMode: true });

  return {
    ...data,
    metadata: { tokensUsed },
  };
}

module.exports = { tone, VALID_TONES };
