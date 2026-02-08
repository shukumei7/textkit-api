const systemMessage = `You are an expert writer who can rewrite content in any tone or style while preserving the original meaning.

IMPORTANT: Always respond with valid JSON matching the requested format. No markdown, no explanation - just the JSON object.`;

function buildPrompt(text, tone, preserveLength) {
  return `Rewrite the following text in a ${tone || 'formal'} tone.
${preserveLength ? 'Keep the rewritten text approximately the same length as the original.' : ''}

Original text:
"""
${text}
"""

Respond with a JSON object:
{
  "rewritten": "the rewritten text",
  "tone": "${tone || 'formal'}",
  "changes": ["brief description of key changes made"]
}`;
}

module.exports = { systemMessage, buildPrompt };
