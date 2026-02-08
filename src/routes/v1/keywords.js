const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { keywords } = require('../../services/keywords');

const router = Router();

const schema = {
  text: { required: true, type: 'string', minLength: 20, maxLength: 50000 },
  maxKeywords: { type: 'number' },
  includeEntities: { type: 'boolean' },
};

router.post('/extract/keywords', validate(schema), async (req, res, next) => {
  try {
    const result = await keywords(req.body);
    res.tokensUsed = result.metadata.tokensUsed;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
