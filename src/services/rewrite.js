const { callLLM } = require('./llm');
const { systemMessage, buildPrompt } = require('../prompts/rewrite');

const VALID_TONES = ['formal', 'casual', 'persuasive', 'academic', 'friendly', 'professional', 'humorous', 'empathetic'];

async function rewrite({ text, tone, preserveLength }) {
  if (tone && !VALID_TONES.includes(tone)) {
    throw Object.assign(new Error(`Invalid tone. Valid options: ${VALID_TONES.join(', ')}`), { status: 400, code: 'INVALID_TONE', expose: true });
  }

  const userMessage = buildPrompt(text, tone, preserveLength);
  const { data, tokensUsed } = await callLLM({ systemMessage, userMessage, jsonMode: true });

  return {
    rewritten: data.rewritten,
    tone: data.tone,
    changes: data.changes || [],
    metadata: { originalLength: text.length, rewrittenLength: (data.rewritten || '').length, tokensUsed },
  };
}

module.exports = { rewrite, VALID_TONES };
