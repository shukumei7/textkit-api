const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { generateHeadlines, VALID_TYPES } = require('../../services/headlines');

const router = Router();

const schema = {
  text: { required: true, type: 'string', minLength: 20, maxLength: 5000 },
  count: { type: 'number' },
  type: { type: 'string', enum: VALID_TYPES },
};

router.post('/headlines', validate(schema), async (req, res, next) => {
  try {
    const result = await generateHeadlines(req.body);
    res.tokensUsed = result.metadata.tokensUsed;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
