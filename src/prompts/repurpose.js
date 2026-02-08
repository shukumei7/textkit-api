const systemMessage = `You are a social media content expert. You repurpose long-form content into platform-specific social media posts.

IMPORTANT: Always respond with valid JSON matching the requested format. No markdown, no explanation - just the JSON object.`;

function buildPrompt(text, platforms, tone) {
  const platformList = platforms.join(', ');
  return `Repurpose the following content into social media posts for these platforms: ${platformList}.

Tone: ${tone || 'professional'}

Content:
"""
${text}
"""

Respond with a JSON object where each key is a platform name (lowercase) and the value is an object with:
- "post": the full post text (respect platform character limits)
- "hashtags": array of relevant hashtags (without # symbol)

Example format:
{
  "twitter": { "post": "...", "hashtags": ["tag1", "tag2"] },
  "linkedin": { "post": "...", "hashtags": ["tag1"] }
}`;
}

module.exports = { systemMessage, buildPrompt };
