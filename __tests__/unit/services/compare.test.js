process.env.NODE_ENV = 'test';

const { compare, VALID_ASPECTS } = require('../../../src/services/compare');
const { setClient } = require('../../../src/services/llm');

describe('Compare Service', () => {
  beforeEach(() => {
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  comparison: {
                    tone: 'Text 1 is more formal while Text 2 is casual',
                    complexity: 'Text 1 has higher complexity',
                    length: 'Text 1 is longer'
                  },
                  summary: 'Overall comparison summary'
                })
              }
            }],
            usage: { total_tokens: 200 },
          }),
        },
      },
    };
    setClient(mockClient);
  });

  afterAll(() => {
    setClient(null);
  });

  it('compares texts successfully', async () => {
    const result = await compare({
      text1: 'This is the first text sample for comparison purposes.',
      text2: 'This is the second text sample that we want to compare.',
    });

    expect(result).toHaveProperty('metadata');
    expect(result.metadata).toHaveProperty('aspectsAnalyzed');
    expect(result.metadata).toHaveProperty('tokensUsed');
  });

  it('handles custom aspects', async () => {
    const result = await compare({
      text1: 'This is the first text sample for comparison purposes.',
      text2: 'This is the second text sample that we want to compare.',
      aspects: ['tone', 'complexity'],
    });

    expect(result.metadata.aspectsAnalyzed).toEqual(['tone', 'complexity']);
  });

  it('rejects invalid aspects', async () => {
    await expect(
      compare({
        text1: 'This is the first text sample for comparison purposes.',
        text2: 'This is the second text sample that we want to compare.',
        aspects: ['invalid', 'badaspect'],
      })
    ).rejects.toThrow('Invalid aspects');
  });
});
