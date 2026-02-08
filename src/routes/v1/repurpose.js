const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { repurpose } = require('../../services/repurpose');

const router = Router();

const schema = {
  text: { required: true, type: 'string', minLength: 50, maxLength: 10000 },
  platforms: { type: 'array', maxItems: 6 },
  tone: { type: 'string', enum: ['professional', 'casual', 'humorous', 'inspirational', 'educational'] },
};

router.post('/repurpose', validate(schema), async (req, res, next) => {
  try {
    const result = await repurpose(req.body);
    res.tokensUsed = result.metadata.tokensUsed;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
