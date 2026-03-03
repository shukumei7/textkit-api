const BASE_URL = 'https://www.textkitapi.com';

module.exports = {
  key: 'summarize',
  noun: 'Summary',
  display: {
    label: 'Summarize Text',
    description: 'Generate a concise summary of long-form text using AI.',
  },
  operation: {
    inputFields: [
      {
        key: 'text',
        label: 'Text',
        required: true,
        type: 'text',
        helpText: 'The text to summarize (minimum 50 characters).',
      },
      {
        key: 'length',
        label: 'Summary Length',
        required: false,
        type: 'string',
        choices: ['brief', 'medium', 'detailed'],
        default: 'medium',
        helpText: 'How detailed the summary should be.',
      },
      {
        key: 'format',
        label: 'Output Format',
        required: false,
        type: 'string',
        choices: ['paragraph', 'bullets', 'numbered'],
        default: 'paragraph',
        helpText: 'Output format for the summary.',
      },
    ],
    perform: async (z, bundle) => {
      const body = {
        text: bundle.inputData.text,
        length: bundle.inputData.length || undefined,
        format: bundle.inputData.format || undefined,
      };
      const response = await z.request({
        url: `${BASE_URL}/api/v1/summarize`,
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
      { key: 'summary', label: 'Summary', type: 'string' },
      { key: 'wordCount', label: 'Word Count', type: 'integer' },
      { key: 'keyPoints', label: 'Key Points' },
    ],
    sample: {
      summary: 'The text discusses key concepts...',
      wordCount: 45,
      keyPoints: ['First point', 'Second point'],
    },
  },
};
