const BASE_URL = 'https://www.textkitapi.com';

module.exports = {
  key: 'rewrite',
  noun: 'Rewritten Text',
  display: {
    label: 'Rewrite Text',
    description: 'Rewrite text in a different tone or style using AI.',
  },
  operation: {
    inputFields: [
      {
        key: 'text',
        label: 'Text',
        required: true,
        type: 'text',
        helpText: 'The text to rewrite.',
      },
      {
        key: 'tone',
        label: 'Tone',
        required: false,
        type: 'string',
        choices: [
          'formal',
          'casual',
          'persuasive',
          'academic',
          'friendly',
          'professional',
          'humorous',
          'empathetic',
        ],
        helpText: 'Target writing tone.',
      },
      {
        key: 'preserveLength',
        label: 'Preserve Length',
        required: false,
        type: 'boolean',
        default: 'false',
        helpText:
          'Try to keep the rewritten text the same length as the original.',
      },
    ],
    perform: async (z, bundle) => {
      const body = {
        text: bundle.inputData.text,
        tone: bundle.inputData.tone || undefined,
        preserveLength: bundle.inputData.preserveLength || undefined,
      };
      const response = await z.request({
        url: `${BASE_URL}/api/v1/rewrite`,
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
      { key: 'rewritten', label: 'Rewritten Text', type: 'string' },
      { key: 'tone', label: 'Tone', type: 'string' },
      { key: 'changes', label: 'Changes Made' },
    ],
    sample: {
      rewritten: 'The content has been rewritten...',
      tone: 'professional',
      changes: ['Formalized language', 'Removed contractions'],
    },
  },
};
