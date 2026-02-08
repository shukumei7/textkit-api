const { Router } = require('express');
const { jwtAuth } = require('../middleware/jwt-auth');
const {
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
} = require('../services/stripe');

const router = Router();

// Create Checkout Session (requires login)
router.post('/stripe/create-checkout', jwtAuth, async (req, res, next) => {
  try {
    const { tier } = req.body;
    if (!tier || !['BASIC', 'PRO', 'ULTRA', 'MEGA'].includes(tier)) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'INVALID_TIER',
        details: 'Tier must be one of: BASIC, PRO, ULTRA, MEGA',
      });
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const result = await createCheckoutSession({
      userId: req.user.id,
      email: req.user.email,
      tier,
      successUrl: `${baseUrl}/dashboard.html?session=success`,
      cancelUrl: `${baseUrl}/dashboard.html?session=canceled`,
    });

    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// Stripe Webhook (raw body, no auth)
router.post('/stripe/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const event = constructWebhookEvent(req.body, signature);
    await handleWebhookEvent(event);

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
});

// Create Customer Portal Session (requires login)
router.post('/stripe/create-portal', jwtAuth, async (req, res, next) => {
  try {
    if (!req.user.stripe_customer_id) {
      return res.status(400).json({
        error: 'No subscription found',
        code: 'NO_SUBSCRIPTION',
        details: 'You need an active subscription to manage billing',
      });
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const returnUrl = `${protocol}://${host}/dashboard.html`;

    const result = await createPortalSession({
      stripeCustomerId: req.user.stripe_customer_id,
      returnUrl,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
