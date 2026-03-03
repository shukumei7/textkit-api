const authentication = require('../authentication');

describe('authentication', () => {
  it('has correct test URL', () => {
    expect(authentication.test.url).toBe('https://www.textkitapi.com/auth/verify');
  });

  it('uses api_key header', () => {
    expect(authentication.test.headers['x-api-key']).toContain('api_key');
  });

  it('has required api_key field', () => {
    const field = authentication.fields.find((f) => f.key === 'api_key');
    expect(field).toBeDefined();
    expect(field.required).toBe(true);
  });
});
