const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { summarize } = require('../../services/summarize');

const router = Router();

const schema = {
  text: { required: true, type: 'string', minLength: 50, maxLength: 50000 },
  length: { type: 'string', enum: ['brief', 'medium', 'detailed'] },
  format: { type: 'string', enum: ['paragraph', 'bullets', 'numbered'] },
};

router.post('/summarize', validate(schema), async (req, res, next) => {
  try {
    const result = await summarize(req.body);
    res.tokensUsed = result.metadata.tokensUsed;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
