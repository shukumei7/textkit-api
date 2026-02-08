process.env.NODE_ENV = 'test';

const { repurpose, VALID_PLATFORMS } = require('../../../src/services/repurpose');
const { setClient } = require('../../../src/services/llm');

describe('Repurpose Service', () => {
  beforeEach(() => {
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify({ twitter: 'Twitter version', linkedin: 'LinkedIn version' }) } }],
            usage: { total_tokens: 150 },
          }),
        },
      },
    };
    setClient(mockClient);
  });

  afterAll(() => {
    setClient(null);
  });

  it('successfully repurposes to requested platforms', async () => {
    const result = await repurpose({
      text: 'This is a long article about artificial intelligence and machine learning.',
      platforms: ['twitter', 'linkedin'],
    });

    expect(result).toHaveProperty('platforms');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata.platformCount).toBe(2);
  });

  it('uses default platforms when none specified', async () => {
    const result = await repurpose({
      text: 'This is a long article about artificial intelligence and machine learning.',
    });

    expect(result).toHaveProperty('platforms');
    expect(result.metadata.platformCount).toBe(2);
    expect(result.metadata.tone).toBe('professional');
  });

  it('rejects invalid platforms', async () => {
    await expect(
      repurpose({
        text: 'This is a long article about artificial intelligence and machine learning.',
        platforms: ['invalid', 'badplatform'],
      })
    ).rejects.toThrow('Invalid platforms');
  });

  it('returns correct metadata structure', async () => {
    const result = await repurpose({
      text: 'This is a long article about artificial intelligence and machine learning.',
      platforms: ['twitter', 'facebook', 'instagram'],
      tone: 'casual',
    });

    expect(result.metadata).toMatchObject({
      platformCount: 3,
      tone: 'casual',
    });
    expect(result.metadata).toHaveProperty('tokensUsed');
  });

  it('filters out invalid platforms while keeping valid ones', async () => {
    const result = await repurpose({
      text: 'This is a long article about artificial intelligence and machine learning.',
      platforms: ['twitter', 'invalid', 'linkedin'],
    });

    expect(result.metadata.platformCount).toBe(2);
  });
});
