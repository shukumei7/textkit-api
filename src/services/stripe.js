const config = require('../config');

function getStripeClient() {
  const stripe = require('stripe');
  return stripe(config.stripe.secretKey);
}

async function createCheckoutSession({ userId, email, tier, successUrl, cancelUrl }) {
  const stripe = getStripeClient();
  const priceId = config.stripe.prices[tier];
  if (!priceId) {
    const err = new Error(`No price configured for tier: ${tier}`);
    err.status = 400;
    throw err;
  }

  const { getUserById, updateStripeCustomerId } = require('./auth');
  const user = getUserById(userId);

  // Reuse or create Stripe customer
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { userId: String(userId) } });
    customerId = customer.id;
    updateStripeCustomerId(userId, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: String(userId), tier },
  });

  return { sessionId: session.id, url: session.url };
}

async function createPortalSession({ stripeCustomerId, returnUrl }) {
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

async function handleWebhookEvent(event) {
  const {
    createSubscription,
    updateSubscriptionByStripeId,
    getSubscriptionByStripeId,
    resolveTierFromPriceId,
  } = require('./subscription');
  const { getDb } = require('../db');

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = parseInt(session.metadata.userId, 10);
      const tier = session.metadata.tier;

      // Get subscription details from Stripe
      const stripe = getStripeClient();
      const sub = await stripe.subscriptions.retrieve(session.subscription);

      createSubscription({
        userId,
        tier,
        stripeSubscriptionId: sub.id,
        stripePriceId: sub.items.data[0].price.id,
        status: sub.status,
        currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const existing = getSubscriptionByStripeId(sub.id);
      if (!existing) break;

      const newPriceId = sub.items.data[0].price.id;
      const tier = resolveTierFromPriceId(newPriceId);

      updateSubscriptionByStripeId(sub.id, {
        status: sub.status,
        tier,
        stripePriceId: newPriceId,
        currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      updateSubscriptionByStripeId(sub.id, { status: 'canceled' });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        updateSubscriptionByStripeId(invoice.subscription, { status: 'past_due' });
      }
      break;
    }
  }
}

module.exports = {
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
};
