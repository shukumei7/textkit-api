const { callLLM } = require('./llm');
const { systemMessage, buildPrompt } = require('../prompts/summarize');

const VALID_LENGTHS = ['brief', 'medium', 'detailed'];
const VALID_FORMATS = ['paragraph', 'bullets', 'numbered'];

async function summarize({ text, length, format }) {
  if (length && !VALID_LENGTHS.includes(length)) {
    throw Object.assign(new Error(`Invalid length. Valid options: ${VALID_LENGTHS.join(', ')}`), { status: 400, code: 'INVALID_LENGTH', expose: true });
  }
  if (format && !VALID_FORMATS.includes(format)) {
    throw Object.assign(new Error(`Invalid format. Valid options: ${VALID_FORMATS.join(', ')}`), { status: 400, code: 'INVALID_FORMAT', expose: true });
  }

  const userMessage = buildPrompt(text, length, format);
  const { data, tokensUsed } = await callLLM({ systemMessage, userMessage, jsonMode: true });

  return {
    summary: data.summary,
    wordCount: data.wordCount,
    keyPoints: data.keyPoints || [],
    metadata: { length: length || 'medium', format: format || 'paragraph', tokensUsed },
  };
}

module.exports = { summarize, VALID_LENGTHS, VALID_FORMATS };
