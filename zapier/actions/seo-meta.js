const BASE_URL = 'https://www.textkitapi.com';

module.exports = {
  key: 'seo_meta',
  noun: 'SEO Metadata',
  display: {
    label: 'Generate SEO Metadata',
    description:
      'Generate SEO metadata (meta description, title tag, Open Graph tags) from content.',
  },
  operation: {
    inputFields: [
      {
        key: 'text',
        label: 'Text',
        required: true,
        type: 'text',
        helpText:
          'The content to generate SEO metadata for (minimum 50 characters).',
      },
      {
        key: 'url',
        label: 'URL',
        required: false,
        type: 'string',
        helpText:
          'The URL this content will be published at (helps with SEO optimization).',
      },
      {
        key: 'focusKeywords',
        label: 'Focus Keywords',
        required: false,
        type: 'string',
        helpText:
          "Comma-separated keywords to target (e.g. 'machine learning, AI tools').",
      },
    ],
    perform: async (z, bundle) => {
      const body = {
        text: bundle.inputData.text,
        url: bundle.inputData.url || undefined,
        keywords: bundle.inputData.focusKeywords
          ? bundle.inputData.focusKeywords
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean)
          : undefined,
      };
      const response = await z.request({
        url: `${BASE_URL}/api/v1/seo/meta`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': bundle.authData.api_key,
        },
        body: JSON.stringify(body),
      });
      const seo = response.data.seo;
      return [
        {
          metaDescription: seo.metaDescription,
          titleTag: seo.titleTag,
          ogTitle: seo.ogTitle,
          ogDescription: seo.ogDescription,
          seoKeywords: Array.isArray(seo.keywords)
            ? seo.keywords.join(', ')
            : seo.keywords,
        },
      ];
    },
    outputFields: [
      { key: 'metaDescription', label: 'Meta Description', type: 'string' },
      { key: 'titleTag', label: 'Title Tag', type: 'string' },
      { key: 'ogTitle', label: 'OG Title', type: 'string' },
      { key: 'ogDescription', label: 'OG Description', type: 'string' },
      { key: 'seoKeywords', label: 'SEO Keywords', type: 'string' },
    ],
    sample: {
      metaDescription: 'Optimized description for search engines...',
      titleTag: 'SEO Title | Site Name',
      ogTitle: 'Social Media Title',
      ogDescription: 'Description for social sharing',
      seoKeywords: 'keyword1, keyword2',
    },
  },
};
