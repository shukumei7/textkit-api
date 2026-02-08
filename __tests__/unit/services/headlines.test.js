process.env.NODE_ENV = 'test';

const { generateHeadlines, VALID_TYPES } = require('../../../src/services/headlines');
const { setClient } = require('../../../src/services/llm');

describe('Headlines Service', () => {
  beforeEach(() => {
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  headlines: [
                    'Headline 1',
                    'Headline 2',
                    'Headline 3',
                    'Headline 4',
                    'Headline 5'
                  ]
                })
              }
            }],
            usage: { total_tokens: 130 },
          }),
        },
      },
    };
    setClient(mockClient);
  });

  afterAll(() => {
    setClient(null);
  });

  it('generates headlines successfully', async () => {
    const result = await generateHeadlines({
      text: 'An in-depth analysis of the latest trends in artificial intelligence and their impact on the technology industry.',
    });

    expect(result).toHaveProperty('headlines');
    expect(Array.isArray(result.headlines)).toBe(true);
    expect(result.metadata.count).toBe(5);
    expect(result.metadata.type).toBe('article');
  });

  it('rejects invalid type', async () => {
    await expect(
      generateHeadlines({
        text: 'An in-depth analysis of the latest trends in artificial intelligence and their impact on the technology industry.',
        type: 'invalid',
      })
    ).rejects.toThrow('Invalid type');
  });

  it('rejects invalid count', async () => {
    await expect(
      generateHeadlines({
        text: 'An in-depth analysis of the latest trends in artificial intelligence and their impact on the technology industry.',
        count: 0,
      })
    ).rejects.toThrow('Count must be between 1 and 20');

    await expect(
      generateHeadlines({
        text: 'An in-depth analysis of the latest trends in artificial intelligence and their impact on the technology industry.',
        count: 30,
      })
    ).rejects.toThrow('Count must be between 1 and 20');
  });
});
