const { callLLM } = require('./llm');
const { systemMessage, buildPrompt } = require('../prompts/repurpose');

const VALID_PLATFORMS = ['twitter', 'linkedin', 'instagram', 'facebook', 'threads', 'tiktok'];

async function repurpose({ text, platforms, tone }) {
  const selectedPlatforms = (platforms || ['twitter', 'linkedin']).filter(p => VALID_PLATFORMS.includes(p.toLowerCase()));

  if (selectedPlatforms.length === 0) {
    throw Object.assign(new Error(`Invalid platforms. Valid options: ${VALID_PLATFORMS.join(', ')}`), { status: 400, code: 'INVALID_PLATFORMS', expose: true });
  }

  const userMessage = buildPrompt(text, selectedPlatforms, tone);
  const { data, tokensUsed } = await callLLM({ systemMessage, userMessage, jsonMode: true });

  return {
    platforms: data,
    metadata: { platformCount: selectedPlatforms.length, tone: tone || 'professional', tokensUsed },
  };
}

module.exports = { repurpose, VALID_PLATFORMS };
