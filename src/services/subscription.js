const { getDb } = require('../db');

function getActiveSubscription(userId) {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM subscriptions
     WHERE user_id = ? AND status IN ('active', 'trialing')
     ORDER BY created_at DESC LIMIT 1`
  ).get(userId) || null;
}

function createSubscription({ userId, tier, stripeSubscriptionId, stripePriceId, status, currentPeriodStart, currentPeriodEnd }) {
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, stripe_price_id, status, current_period_start, current_period_end)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, tier, stripeSubscriptionId, stripePriceId, status || 'active', currentPeriodStart || null, currentPeriodEnd || null);
  return result.lastInsertRowid;
}

function updateSubscriptionByStripeId(stripeSubscriptionId, updates) {
  const db = getDb();
  const fields = [];
  const values = [];

  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.tier !== undefined) { fields.push('tier = ?'); values.push(updates.tier); }
  if (updates.currentPeriodStart !== undefined) { fields.push('current_period_start = ?'); values.push(updates.currentPeriodStart); }
  if (updates.currentPeriodEnd !== undefined) { fields.push('current_period_end = ?'); values.push(updates.currentPeriodEnd); }
  if (updates.cancelAtPeriodEnd !== undefined) { fields.push('cancel_at_period_end = ?'); values.push(updates.cancelAtPeriodEnd ? 1 : 0); }
  if (updates.stripePriceId !== undefined) { fields.push('stripe_price_id = ?'); values.push(updates.stripePriceId); }

  fields.push("updated_at = datetime('now')");
  values.push(stripeSubscriptionId);

  db.prepare(
    `UPDATE subscriptions SET ${fields.join(', ')} WHERE stripe_subscription_id = ?`
  ).run(...values);
}

function getSubscriptionByStripeId(stripeSubscriptionId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM subscriptions WHERE stripe_subscription_id = ?'
  ).get(stripeSubscriptionId) || null;
}

// Map Stripe price ID to tier name
function resolveTierFromPriceId(priceId) {
  const config = require('../config');
  const priceToTier = {};
  for (const [tier, id] of Object.entries(config.stripe.prices)) {
    if (id) priceToTier[id] = tier;
  }
  return priceToTier[priceId] || 'BASIC';
}

module.exports = {
  getActiveSubscription,
  createSubscription,
  updateSubscriptionByStripeId,
  getSubscriptionByStripeId,
  resolveTierFromPriceId,
};
