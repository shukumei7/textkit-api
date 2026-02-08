const systemMessage = `You are an email marketing expert who crafts high-converting subject lines.

IMPORTANT: Always respond with valid JSON matching the requested format. No markdown, no explanation - just the JSON object.`;

function buildPrompt(text, count, style) {
  return `Generate ${count || 5} email subject line variations for the following content:

Style: ${style || 'promotional'}

Content:
"""
${text}
"""

Respond with a JSON object containing:
- "subjectLines": array of ${count || 5} subject line objects, each with:
  - "text": the subject line text
  - "style": the style category (${style || 'promotional'})
  - "estimatedOpenRate": estimated open rate potential ("high", "medium", or "low")

Example format:
{
  "subjectLines": [
    { "text": "...", "style": "promotional", "estimatedOpenRate": "high" },
    { "text": "...", "style": "promotional", "estimatedOpenRate": "medium" }
  ]
}`;
}

module.exports = { systemMessage, buildPrompt };
