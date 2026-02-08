const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { generateSEOMeta } = require('../../services/seo');

const router = Router();

const schema = {
  text: { required: true, type: 'string', minLength: 50, maxLength: 10000 },
  url: { type: 'string' },
  keywords: { type: 'array', maxItems: 10 },
};

router.post('/seo/meta', validate(schema), async (req, res, next) => {
  try {
    const result = await generateSEOMeta(req.body);
    res.tokensUsed = result.metadata.tokensUsed;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
