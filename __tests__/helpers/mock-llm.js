const { setClient } = require('../../src/services/llm');

// Preset responses for each endpoint type
const MOCK_RESPONSES = {
  repurpose: {
    twitter: { post: 'Check out this amazing content! #innovation', hashtags: ['innovation', 'tech'] },
    linkedin: { post: 'I wanted to share some insights on this topic...', hashtags: ['insights', 'business'] },
  },
  summarize: {
    summary: 'This is a concise summary of the provided text.',
    wordCount: 10,
    keyPoints: ['Key point 1', 'Key point 2', 'Key point 3'],
  },
  rewrite: {
    rewritten: 'This is the rewritten version of the text in the requested tone.',
    tone: 'formal',
    changes: ['Adjusted vocabulary', 'Changed sentence structure'],
  },
  seo: {
    metaDescription: 'A compelling meta description for SEO purposes.',
    titleTag: 'Compelling Title Tag | Brand',
    ogTitle: 'Open Graph Title',
    ogDescription: 'Open Graph description for social sharing.',
    keywords: ['keyword1', 'keyword2', 'keyword3'],
  },
  email: {
    subjectLines: [
      { text: 'Don\'t miss out on this opportunity!', style: 'promotional', estimatedOpenRate: 'high' },
      { text: 'Your weekly update is here', style: 'informational', estimatedOpenRate: 'medium' },
      { text: 'URGENT: Action required', style: 'urgent', estimatedOpenRate: 'high' },
    ],
  },
  headlines: {
    headlines: [
      { text: '10 Ways to Improve Your Workflow', type: 'listicle', characterCount: 35 },
      { text: 'The Future of Technology Is Here', type: 'article', characterCount: 32 },
      { text: 'You Won\'t Believe What Happened Next', type: 'clickbait', characterCount: 37 },
    ],
  },
  keywords: {
    keywords: [
      { word: 'technology', relevance: 0.95 },
      { word: 'innovation', relevance: 0.87 },
      { word: 'software', relevance: 0.82 },
    ],
    entities: [
      { name: 'Google', type: 'organization' },
      { name: 'San Francisco', type: 'location' },
    ],
    topics: ['technology', 'business'],
  },
  tone: {
    detectedTone: 'casual',
    targetTone: 'formal',
    translated: 'The translated text in a formal tone.',
    toneShifts: ['Replaced colloquialisms', 'Added formal vocabulary'],
  },
  compare: {
    similarity: 0.72,
    differences: [
      { aspect: 'tone', text1: 'formal', text2: 'casual' },
      { aspect: 'complexity', text1: 'high', text2: 'medium' },
    ],
    summary: 'The texts share similar content but differ in tone and complexity.',
  },
};

// Mock OpenAI client that returns preset responses based on the prompt content
function createMockClient(overrideResponse) {
  return {
    chat: {
      completions: {
        create: async (params) => {
          const userMsg = params.messages.find(m => m.role === 'user')?.content || '';
          let responseData = overrideResponse;

          if (!responseData) {
            // Detect which endpoint based on system message content
            const sysMsg = params.messages.find(m => m.role === 'system')?.content || '';
            if (sysMsg.includes('social media')) responseData = MOCK_RESPONSES.repurpose;
            else if (sysMsg.includes('summarizer')) responseData = MOCK_RESPONSES.summarize;
            else if (sysMsg.includes('rewrite')) responseData = MOCK_RESPONSES.rewrite;
            else if (sysMsg.includes('SEO')) responseData = MOCK_RESPONSES.seo;
            else if (sysMsg.includes('email marketing')) responseData = MOCK_RESPONSES.email;
            else if (sysMsg.includes('headline')) responseData = MOCK_RESPONSES.headlines;
            else if (sysMsg.includes('keywords') || sysMsg.includes('extracts keywords')) responseData = MOCK_RESPONSES.keywords;
            else if (sysMsg.includes('linguistic') || sysMsg.includes('tone')) responseData = MOCK_RESPONSES.tone;
            else if (sysMsg.includes('compares texts') || sysMsg.includes('compare')) responseData = MOCK_RESPONSES.compare;
            else responseData = { result: 'mock response' };
          }

          return {
            choices: [{ message: { content: JSON.stringify(responseData) } }],
            usage: { total_tokens: 150 },
          };
        },
      },
    },
  };
}

function setupMockLLM(overrideResponse) {
  const mockClient = createMockClient(overrideResponse);
  setClient(mockClient);
  return mockClient;
}

function resetMockLLM() {
  setClient(null);
}

module.exports = { setupMockLLM, resetMockLLM, MOCK_RESPONSES, createMockClient };
