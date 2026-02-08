const systemMessage = `You are a linguistic analysis expert who can detect and translate text between different tones.

IMPORTANT: Always respond with valid JSON matching the requested format. No markdown, no explanation - just the JSON object.`;

function buildPrompt(text, targetTone) {
  return `Analyze the tone of the following text, then rewrite it in a ${targetTone} tone while preserving the core meaning.

Content:
"""
${text}
"""

Target tone: ${targetTone}

Respond with a JSON object containing:
- "detectedTone": the current tone of the text (string)
- "targetTone": the requested target tone (string)
- "translated": the rewritten text in the target tone (string)
- "toneShifts": array of strings describing major changes made

Example format:
{
  "detectedTone": "casual",
  "targetTone": "formal",
  "translated": "The rewritten text here...",
  "toneShifts": [
    "Replaced contractions with full forms",
    "Changed colloquial expressions to formal language"
  ]
}`;
}

module.exports = { systemMessage, buildPrompt };
