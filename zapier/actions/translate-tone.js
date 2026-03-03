const BASE_URL = 'https://www.textkitapi.com';

module.exports = {
  key: 'translate_tone',
  noun: 'Tone Translation',
  display: {
    label: 'Translate Tone',
    description: 'Rewrite text in a specific target tone using AI.',
  },
  operation: {
    inputFields: [
      {
        key: 'text',
        label: 'Text',
        required: true,
        type: 'text',
        helpText:
          'The text to rewrite in a different tone (minimum 10 characters).',
      },
      {
        key: 'targetTone',
        label: 'Target Tone',
        required: true,
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
        helpText: 'The tone to translate the text into.',
      },
    ],
    perform: async (z, bundle) => {
      const body = {
        text: bundle.inputData.text,
        targetTone: bundle.inputData.targetTone,
      };
      const response = await z.request({
        url: `${BASE_URL}/api/v1/translate/tone`,
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
      { key: 'translated', label: 'Translated Text', type: 'string' },
      { key: 'detectedTone', label: 'Original Tone', type: 'string' },
      { key: 'targetTone', label: 'Target Tone', type: 'string' },
      { key: 'toneShifts', label: 'Tone Changes' },
    ],
    sample: {
      translated: 'The rewritten text in the new tone...',
      detectedTone: 'casual',
      targetTone: 'formal',
      toneShifts: ['Removed contractions', 'Added formal vocabulary'],
    },
  },
};
