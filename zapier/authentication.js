const BASE_URL = 'https://www.textkitapi.com';

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'string',
      helpText:
        'Find your API key in your [TextKit dashboard](https://www.textkitapi.com/dashboard.html).',
    },
  ],
  test: {
    url: `${BASE_URL}/auth/verify`,
    method: 'GET',
    headers: {
      'x-api-key': '{{bundle.authData.api_key}}',
    },
  },
  connectionLabel: '{{email}} ({{tier}} tier)',
  customConfig: {},
};
