const systemMessage = `You are an SEO specialist who generates optimized meta tags, title tags, and Open Graph tags.

IMPORTANT: Always respond with valid JSON matching the requested format. No markdown, no explanation - just the JSON object.`;

function buildPrompt(text, url, keywords) {
  let prompt = `Generate SEO-optimized metadata for the following content:

Content:
"""
${text}
"""
`;

  if (url) {
    prompt += `\nURL: ${url}`;
  }

  if (keywords && keywords.length > 0) {
    prompt += `\nTarget keywords: ${keywords.join(', ')}`;
  }

  prompt += `

Respond with a JSON object containing:
- "metaDescription": SEO-optimized meta description (155 characters max)
- "titleTag": SEO-optimized title tag (60 characters max)
- "ogTitle": Open Graph title (60 characters max)
- "ogDescription": Open Graph description (155 characters max)
- "keywords": array of 5-10 suggested SEO keywords

Example format:
{
  "metaDescription": "...",
  "titleTag": "...",
  "ogTitle": "...",
  "ogDescription": "...",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;

  return prompt;
}

module.exports = { systemMessage, buildPrompt };
