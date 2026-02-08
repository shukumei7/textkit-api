process.env.NODE_ENV = 'test';

const { generateSubjectLines, VALID_STYLES } = require('../../../src/services/email');
const { setClient } = require('../../../src/services/llm');

describe('Email Service', () => {
  beforeEach(() => {
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  subjectLines: [
                    'Subject Line 1',
                    'Subject Line 2',
                    'Subject Line 3',
                    'Subject Line 4',
                    'Subject Line 5'
                  ]
                })
              }
            }],
            usage: { total_tokens: 140 },
          }),
        },
      },
    };
    setClient(mockClient);
  });

  afterAll(() => {
    setClient(null);
  });

  it('generates subject lines successfully', async () => {
    const result = await generateSubjectLines({
      text: 'We are excited to announce our new product launch next week with special discounts.',
    });

    expect(result).toHaveProperty('subjectLines');
    expect(Array.isArray(result.subjectLines)).toBe(true);
    expect(result.metadata.count).toBe(5);
  });

  it('rejects invalid style', async () => {
    await expect(
      generateSubjectLines({
        text: 'We are excited to announce our new product launch next week with special discounts.',
        style: 'invalid',
      })
    ).rejects.toThrow('Invalid style');
  });

  it('rejects invalid count (0 or >20)', async () => {
    await expect(
      generateSubjectLines({
        text: 'We are excited to announce our new product launch next week with special discounts.',
        count: 0,
      })
    ).rejects.toThrow('Count must be between 1 and 20');

    await expect(
      generateSubjectLines({
        text: 'We are excited to announce our new product launch next week with special discounts.',
        count: 25,
      })
    ).rejects.toThrow('Count must be between 1 and 20');
  });
});
