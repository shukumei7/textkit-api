const systemMessage = `You are an expert text summarizer. You create clear, accurate summaries at various detail levels.

IMPORTANT: Always respond with valid JSON matching the requested format. No markdown, no explanation - just the JSON object.`;

function buildPrompt(text, length, format) {
  return `Summarize the following text.

Length: ${length || 'medium'} (brief=1-2 sentences, medium=1 paragraph, detailed=2-3 paragraphs)
Format: ${format || 'paragraph'}

Text:
"""
${text}
"""

Respond with a JSON object:
{
  "summary": "the summary text",
  "wordCount": number,
  "keyPoints": ["point 1", "point 2", ...]
}`;
}

module.exports = { systemMessage, buildPrompt };
