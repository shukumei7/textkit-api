const { version } = require('./package.json');
const { version: platformVersion } = require('zapier-platform-core');

const authentication = require('./authentication');
const summarize = require('./actions/summarize');
const rewrite = require('./actions/rewrite');
const extractKeywords = require('./actions/extract-keywords');
const seoMeta = require('./actions/seo-meta');
const translateTone = require('./actions/translate-tone');

module.exports = {
  version,
  platformVersion,
  authentication,
  creates: {
    [summarize.key]: summarize,
    [rewrite.key]: rewrite,
    [extractKeywords.key]: extractKeywords,
    [seoMeta.key]: seoMeta,
    [translateTone.key]: translateTone,
  },
};
