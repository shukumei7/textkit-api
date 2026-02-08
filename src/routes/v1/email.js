const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { generateSubjectLines, VALID_STYLES } = require('../../services/email');

const router = Router();

const schema = {
  text: { required: true, type: 'string', minLength: 20, maxLength: 5000 },
  count: { type: 'number' },
  style: { type: 'string', enum: VALID_STYLES },
};

router.post('/email/subject-lines', validate(schema), async (req, res, next) => {
  try {
    const result = await generateSubjectLines(req.body);
    res.tokensUsed = result.metadata.tokensUsed;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
