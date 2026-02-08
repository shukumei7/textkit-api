process.env.NODE_ENV = 'test';

const { tone, VALID_TONES } = require('../../../src/services/tone');
const { setClient } = require('../../../src/services/llm');

describe('Tone Service', () => {
  beforeEach(() => {
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  detectedTone: 'casual',
                  translated: 'This is the text translated to the target tone.',
                  toneShifts: ['Removed informal language', 'Added formal structure']
                })
              }
            }],
            usage: { total_tokens: 160 },
          }),
        },
      },
    };
    setClient(mockClient);
  });

  afterAll(() => {
    setClient(null);
  });

  it('translates tone successfully', async () => {
    const result = await tone({
      text: 'Hey there! This is a casual message that needs to be more formal.',
      targetTone: 'formal',
    });

    expect(result).toHaveProperty('detectedTone');
    expect(result).toHaveProperty('translated');
    expect(result).toHaveProperty('toneShifts');
    expect(result).toHaveProperty('metadata');
  });

  it('rejects invalid targetTone', async () => {
    await expect(
      tone({
        text: 'Hey there! This is a casual message that needs to be more formal.',
        targetTone: 'invalid',
      })
    ).rejects.toThrow('Invalid tone');
  });

  it('returns detectedTone, translated, toneShifts', async () => {
    const result = await tone({
      text: 'Hey there! This is a casual message that needs to be more formal.',
      targetTone: 'professional',
    });

    expect(typeof result.detectedTone).toBe('string');
    expect(typeof result.translated).toBe('string');
    expect(Array.isArray(result.toneShifts)).toBe(true);
    expect(result.metadata).toHaveProperty('tokensUsed');
  });
});
