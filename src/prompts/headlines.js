const systemMessage = `You are a headline writing expert for articles, ads, and marketing.

IMPORTANT: Always respond with valid JSON matching the requested format. No markdown, no explanation - just the JSON object.`;

function buildPrompt(text, count, type) {
  return `Generate ${count || 5} headline variations for the following content:

Type: ${type || 'article'}

Content:
"""
${text}
"""

Respond with a JSON object containing:
- "headlines": array of ${count || 5} headline objects, each with:
  - "text": the headline text
  - "type": the headline type (${type || 'article'})
  - "characterCount": the exact character count of the headline

Example format:
{
  "headlines": [
    { "text": "...", "type": "article", "characterCount": 45 },
    { "text": "...", "type": "article", "characterCount": 52 }
  ]
}`;
}

module.exports = { systemMessage, buildPrompt };
