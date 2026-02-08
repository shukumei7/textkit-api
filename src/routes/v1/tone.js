const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { tone, VALID_TONES } = require('../../services/tone');

const router = Router();

const schema = {
  text: { required: true, type: 'string', minLength: 10, maxLength: 10000 },
  targetTone: { required: true, type: 'string', enum: VALID_TONES },
};

router.post('/translate/tone', validate(schema), async (req, res, next) => {
  try {
    const result = await tone(req.body);
    res.tokensUsed = result.metadata.tokensUsed;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
