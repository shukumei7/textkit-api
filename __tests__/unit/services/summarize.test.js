process.env.NODE_ENV = 'test';

const { summarize, VALID_LENGTHS, VALID_FORMATS } = require('../../../src/services/summarize');
const { setClient } = require('../../../src/services/llm');

describe('Summarize Service', () => {
  beforeEach(() => {
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  summary: 'Brief summary of the text',
                  wordCount: 50,
                  keyPoints: ['Point 1', 'Point 2', 'Point 3']
                })
              }
            }],
            usage: { total_tokens: 120 },
          }),
        },
      },
    };
    setClient(mockClient);
  });

  afterAll(() => {
    setClient(null);
  });

  it('successfully summarizes text', async () => {
    const result = await summarize({
      text: 'This is a long article about artificial intelligence and machine learning that needs to be summarized into a shorter form.',
    });

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('wordCount');
    expect(result).toHaveProperty('keyPoints');
    expect(Array.isArray(result.keyPoints)).toBe(true);
  });

  it('rejects invalid length option', async () => {
    await expect(
      summarize({
        text: 'This is a long article about artificial intelligence and machine learning that needs to be summarized into a shorter form.',
        length: 'invalid',
      })
    ).rejects.toThrow('Invalid length');
  });

  it('rejects invalid format option', async () => {
    await expect(
      summarize({
        text: 'This is a long article about artificial intelligence and machine learning that needs to be summarized into a shorter form.',
        format: 'invalid',
      })
    ).rejects.toThrow('Invalid format');
  });

  it('returns summary, wordCount, keyPoints', async () => {
    const result = await summarize({
      text: 'This is a long article about artificial intelligence and machine learning that needs to be summarized into a shorter form.',
      length: 'brief',
      format: 'bullets',
    });

    expect(result.summary).toBeDefined();
    expect(typeof result.wordCount).toBe('number');
    expect(Array.isArray(result.keyPoints)).toBe(true);
    expect(result.metadata.length).toBe('brief');
    expect(result.metadata.format).toBe('bullets');
  });

  it('uses default values when options not provided', async () => {
    const result = await summarize({
      text: 'This is a long article about artificial intelligence and machine learning that needs to be summarized into a shorter form.',
    });

    expect(result.metadata.length).toBe('medium');
    expect(result.metadata.format).toBe('paragraph');
  });
});
