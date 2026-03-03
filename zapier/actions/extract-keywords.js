const BASE_URL = 'https://www.textkitapi.com';

module.exports = {
  key: 'extract_keywords',
  noun: 'Keywords',
  display: {
    label: 'Extract Keywords',
    description:
      'Extract keywords, named entities, and topics from text using AI.',
  },
  operation: {
    inputFields: [
      {
        key: 'text',
        label: 'Text',
        required: true,
        type: 'text',
        helpText: 'The text to extract keywords from (minimum 20 characters).',
      },
      {
        key: 'maxKeywords',
        label: 'Max Keywords',
        required: false,
        type: 'integer',
        default: '10',
        helpText: 'Maximum number of keywords to return (1-50).',
      },
      {
        key: 'includeEntities',
        label: 'Include Named Entities',
        required: false,
        type: 'boolean',
        default: 'true',
        helpText: 'Whether to include named entities (people, places, brands).',
      },
    ],
    perform: async (z, bundle) => {
      const body = {
        text: bundle.inputData.text,
        maxKeywords: bundle.inputData.maxKeywords || undefined,
        includeEntities: bundle.inputData.includeEntities || undefined,
      };
      const response = await z.request({
        url: `${BASE_URL}/api/v1/extract/keywords`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': bundle.authData.api_key,
        },
        body: JSON.stringify(body),
      });
      return [response.data];
    },
    outputFields: [
      { key: 'keywords', label: 'Keywords' },
      { key: 'entities', label: 'Named Entities' },
      { key: 'topics', label: 'Topics' },
    ],
    sample: {
      keywords: ['machine learning', 'artificial intelligence'],
      entities: ['OpenAI', 'Google'],
      topics: ['Technology', 'AI'],
    },
  },
};
