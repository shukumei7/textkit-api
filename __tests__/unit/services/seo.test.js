process.env.NODE_ENV = 'test';

const { generateSEOMeta } = require('../../../src/services/seo');
const { setClient } = require('../../../src/services/llm');

describe('SEO Service', () => {
  beforeEach(() => {
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  title: 'SEO Optimized Title',
                  description: 'SEO meta description for the content',
                  keywords: ['keyword1', 'keyword2', 'keyword3'],
                  ogTitle: 'Open Graph Title',
                  ogDescription: 'Open Graph Description'
                })
              }
            }],
            usage: { total_tokens: 180 },
          }),
        },
      },
    };
    setClient(mockClient);
  });

  afterAll(() => {
    setClient(null);
  });

  it('generates meta tags successfully', async () => {
    const result = await generateSEOMeta({
      text: 'This is an article about search engine optimization and best practices for improving website visibility.',
    });

    expect(result).toHaveProperty('seo');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata).toHaveProperty('tokensUsed');
  });

  it('returns all expected fields', async () => {
    const result = await generateSEOMeta({
      text: 'This is an article about search engine optimization and best practices for improving website visibility.',
      url: 'https://example.com/seo-guide',
      keywords: ['SEO', 'optimization'],
    });

    expect(result.seo).toHaveProperty('title');
    expect(result.seo).toHaveProperty('description');
    expect(result.seo).toHaveProperty('keywords');
    expect(result.metadata.url).toBe('https://example.com/seo-guide');
    expect(result.metadata.providedKeywords).toEqual(['SEO', 'optimization']);
  });

  it('handles optional url and keywords', async () => {
    const result = await generateSEOMeta({
      text: 'This is an article about search engine optimization and best practices for improving website visibility.',
    });

    expect(result.metadata.url).toBeNull();
    expect(result.metadata.providedKeywords).toEqual([]);
  });
});
