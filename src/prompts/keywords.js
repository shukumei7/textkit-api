const systemMessage = `You are a content analysis expert who extracts keywords, named entities, and topics from text.

IMPORTANT: Always respond with valid JSON matching the requested format. No markdown, no explanation - just the JSON object.`;

function buildPrompt(text, maxKeywords, includeEntities) {
  let prompt = `Extract the ${maxKeywords} most relevant keywords from the following text. Rank them by relevance (0.0 to 1.0).

Content:
"""
${text}
"""

Respond with a JSON object containing:
- "keywords": array of objects with "word" (string) and "relevance" (number 0.0-1.0)`;

  if (includeEntities) {
    prompt += `
- "entities": array of named entities with "name" (string) and "type" (person|organization|location|other)
- "topics": array of main topics/themes (strings)`;
  }

  prompt += `

Example format:
{
  "keywords": [
    { "word": "artificial intelligence", "relevance": 0.95 },
    { "word": "machine learning", "relevance": 0.88 }
  ]`;

  if (includeEntities) {
    prompt += `,
  "entities": [
    { "name": "OpenAI", "type": "organization" },
    { "name": "Sam Altman", "type": "person" }
  ],
  "topics": ["AI technology", "Industry trends"]`;
  }

  prompt += `
}`;

  return prompt;
}

module.exports = { systemMessage, buildPrompt };
