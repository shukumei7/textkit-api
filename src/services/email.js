const { callLLM } = require('./llm');
const { systemMessage, buildPrompt } = require('../prompts/email');

const VALID_STYLES = ['promotional', 'informational', 'urgent', 'curiosity', 'personalized'];

async function generateSubjectLines({ text, count, style }) {
  const subjectLineCount = count !== undefined && count !== null ? count : 5;

  if (subjectLineCount < 1 || subjectLineCount > 20) {
    throw Object.assign(new Error('Count must be between 1 and 20'), { status: 400, code: 'INVALID_COUNT', expose: true });
  }

  if (style && !VALID_STYLES.includes(style.toLowerCase())) {
    throw Object.assign(new Error(`Invalid style. Valid options: ${VALID_STYLES.join(', ')}`), { status: 400, code: 'INVALID_STYLE', expose: true });
  }

  const userMessage = buildPrompt(text, subjectLineCount, style);
  const { data, tokensUsed } = await callLLM({ systemMessage, userMessage, jsonMode: true });

  return {
    subjectLines: data.subjectLines,
    metadata: { count: subjectLineCount, style: style || 'promotional', tokensUsed },
  };
}

module.exports = { generateSubjectLines, VALID_STYLES };
