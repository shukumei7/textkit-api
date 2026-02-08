process.env.NODE_ENV = 'test';

const { keywords } = require('../../../src/services/keywords');
const { setClient } = require('../../../src/services/llm');

describe('Keywords Service', () => {
  beforeEach(() => {
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  keywords: ['keyword1', 'keyword2', 'keyword3'],
                  entities: ['Entity 1', 'Entity 2']
                })
              }
            }],
            usage: { total_tokens: 110 },
          }),
        },
      },
    };
    setClient(mockClient);
  });

  afterAll(() => {
    setClient(null);
  });

  it('extracts keywords successfully', async () => {
    const result = await keywords({
      text: 'This article discusses artificial intelligence, machine learning, and natural language processing technologies.',
    });

    expect(result).toHaveProperty('keywords');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata.maxKeywords).toBe(10);
    expect(result.metadata.includeEntities).toBe(true);
  });

  it('handles maxKeywords parameter', async () => {
    const result = await keywords({
      text: 'This article discusses artificial intelligence, machine learning, and natural language processing technologies.',
      maxKeywords: 5,
    });

    expect(result.metadata.maxKeywords).toBe(5);
  });

  it('handles includeEntities flag', async () => {
    const result = await keywords({
      text: 'This article discusses artificial intelligence, machine learning, and natural language processing technologies.',
      maxKeywords: 15,
      includeEntities: false,
    });

    expect(result.metadata.includeEntities).toBe(false);
  });
});
