const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { rewrite } = require('../../services/rewrite');

const router = Router();

const schema = {
  text: { required: true, type: 'string', minLength: 10, maxLength: 10000 },
  tone: { type: 'string', enum: ['formal', 'casual', 'persuasive', 'academic', 'friendly', 'professional', 'humorous', 'empathetic'] },
  preserveLength: { type: 'boolean' },
};

router.post('/rewrite', validate(schema), async (req, res, next) => {
  try {
    const result = await rewrite(req.body);
    res.tokensUsed = result.metadata.tokensUsed;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
