process.env.NODE_ENV = 'test';

const { rewrite, VALID_TONES } = require('../../../src/services/rewrite');
const { setClient } = require('../../../src/services/llm');

describe('Rewrite Service', () => {
  beforeEach(() => {
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  rewritten: 'This is the rewritten version in the requested tone.',
                  tone: 'formal',
                  changes: ['Made language more formal', 'Removed casual expressions']
                })
              }
            }],
            usage: { total_tokens: 100 },
          }),
        },
      },
    };
    setClient(mockClient);
  });

  afterAll(() => {
    setClient(null);
  });

  it('successfully rewrites in requested tone', async () => {
    const result = await rewrite({
      text: 'Hey there! This is a casual message about our new product.',
      tone: 'formal',
    });

    expect(result).toHaveProperty('rewritten');
    expect(result).toHaveProperty('tone');
    expect(result).toHaveProperty('changes');
    expect(Array.isArray(result.changes)).toBe(true);
  });

  it('rejects invalid tone', async () => {
    await expect(
      rewrite({
        text: 'Hey there! This is a casual message about our new product.',
        tone: 'invalid',
      })
    ).rejects.toThrow('Invalid tone');
  });

  it('returns rewritten text, tone, and changes', async () => {
    const result = await rewrite({
      text: 'Hey there! This is a casual message about our new product.',
      tone: 'professional',
      preserveLength: true,
    });

    expect(typeof result.rewritten).toBe('string');
    expect(typeof result.tone).toBe('string');
    expect(Array.isArray(result.changes)).toBe(true);
    expect(result.metadata).toHaveProperty('originalLength');
    expect(result.metadata).toHaveProperty('rewrittenLength');
  });

  it('handles preserveLength option', async () => {
    const text = 'Hey there! This is a casual message about our new product.';
    const result = await rewrite({
      text,
      tone: 'formal',
      preserveLength: true,
    });

    expect(result.metadata.originalLength).toBe(text.length);
  });

  it('includes metadata with token usage', async () => {
    const result = await rewrite({
      text: 'Hey there! This is a casual message about our new product.',
      tone: 'academic',
    });

    expect(result.metadata).toHaveProperty('tokensUsed');
    expect(typeof result.metadata.tokensUsed).toBe('number');
  });
});
