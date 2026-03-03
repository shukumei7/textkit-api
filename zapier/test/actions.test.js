const summarize = require('../actions/summarize');
const rewrite = require('../actions/rewrite');
const extractKeywords = require('../actions/extract-keywords');
const seoMeta = require('../actions/seo-meta');
const translateTone = require('../actions/translate-tone');

const actions = [summarize, rewrite, extractKeywords, seoMeta, translateTone];

describe('actions', () => {
  actions.forEach((action) => {
    describe(action.key, () => {
      it('has required keys', () => {
        expect(action.key).toBeDefined();
        expect(action.noun).toBeDefined();
        expect(action.display.label).toBeDefined();
        expect(action.display.description).toBeDefined();
      });

      it('has at least one required inputField', () => {
        const required = action.operation.inputFields.filter((f) => f.required);
        expect(required.length).toBeGreaterThan(0);
      });

      it('has a sample', () => {
        expect(action.operation.sample).toBeDefined();
        expect(Object.keys(action.operation.sample).length).toBeGreaterThan(0);
      });

      it('perform is a function', () => {
        expect(typeof action.operation.perform).toBe('function');
      });
    });
  });
});
