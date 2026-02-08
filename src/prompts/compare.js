const systemMessage = `You are a text analysis expert who compares texts for similarity, differences, and quality.

IMPORTANT: Always respond with valid JSON matching the requested format. No markdown, no explanation - just the JSON object.`;

function buildPrompt(text1, text2, aspects) {
  const aspectList = aspects.join(', ');

  return `Compare the following two texts across these aspects: ${aspectList}.

Text 1:
"""
${text1}
"""

Text 2:
"""
${text2}
"""

Respond with a JSON object containing:
- "similarity": overall similarity score (number 0.0-1.0)
- "differences": array of objects with "aspect" (string), "text1" (description), "text2" (description)
- "summary": brief summary of the comparison (string)

Example format:
{
  "similarity": 0.65,
  "differences": [
    {
      "aspect": "tone",
      "text1": "Formal and academic",
      "text2": "Casual and conversational"
    },
    {
      "aspect": "complexity",
      "text1": "High complexity with technical jargon",
      "text2": "Moderate complexity with simpler language"
    }
  ],
  "summary": "Both texts cover similar topics but differ significantly in tone and complexity..."
}`;
}

module.exports = { systemMessage, buildPrompt };
