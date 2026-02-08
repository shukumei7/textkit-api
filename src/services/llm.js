const OpenAI = require('openai');
const config = require('../config');

let client;

function getClient() {
  if (client) return client;
  client = new OpenAI({ apiKey: config.openai.apiKey });
  return client;
}

async function callLLM({ systemMessage, userMessage, jsonMode = false, maxTokens = 1024 }) {
  const openai = getClient();

  const params = {
    model: config.openai.model,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  };

  if (jsonMode) {
    params.response_format = { type: 'json_object' };
  }

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await openai.chat.completions.create(params);
      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      if (jsonMode) {
        try {
          return { data: JSON.parse(content), tokensUsed };
        } catch {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            return { data: JSON.parse(jsonMatch[1].trim()), tokensUsed };
          }
          throw new Error('Failed to parse LLM response as JSON');
        }
      }

      return { data: content, tokensUsed };
    } catch (err) {
      lastError = err;
      if (err.status === 429 || err.status >= 500) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// Allow injection for testing
function setClient(mockClient) {
  client = mockClient;
}

module.exports = { callLLM, setClient };
