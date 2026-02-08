const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { compare } = require('../../services/compare');

const router = Router();

const schema = {
  text1: { required: true, type: 'string', minLength: 10, maxLength: 10000 },
  text2: { required: true, type: 'string', minLength: 10, maxLength: 10000 },
  aspects: { type: 'array', maxItems: 5 },
};

router.post('/compare', validate(schema), async (req, res, next) => {
  try {
    const result = await compare(req.body);
    res.tokensUsed = result.metadata.tokensUsed;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
