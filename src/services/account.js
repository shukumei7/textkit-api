const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const config = require('../config');

function getStripeClient() {
  const stripe = require('stripe');
  return stripe(config.stripe.secretKey);
}

/**
 * Delete user account and all associated data
 * @param {number} userId - User ID
 * @param {string} password - User's password for verification
 * @throws {Error} Error with status property for HTTP status codes
 */
async function deleteAccount(userId, password) {
  const db = getDb();

  // Get user from DB
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    const error = new Error('Invalid password');
    error.status = 401;
    throw error;
  }

  // Cancel any active Stripe subscriptions
  const activeSubscriptions = db.prepare(
    "SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')"
  ).all(userId);

  const stripe = getStripeClient();
  for (const sub of activeSubscriptions) {
    if (sub.stripe_subscription_id) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    }
  }

  // Delete all user data in a transaction
  const deleteAll = db.transaction(() => {
    db.prepare('DELETE FROM usage_log WHERE user_id = ?').run(String(userId));
    db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });
  deleteAll();
}

/**
 * Export all user data
 * @param {number} userId - User ID
 * @returns {Object} User data export
 * @throws {Error} Error with status 404 if user not found
 */
async function exportUserData(userId) {
  const db = getDb();

  // Get user data (exclude password_hash, stripe_customer_id)
  const account = db.prepare(
    'SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?'
  ).get(userId);

  if (!account) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Get API keys (exclude key_hash)
  const apiKeys = db.prepare(
    'SELECT id, key_prefix, name, is_active, created_at, last_used_at FROM api_keys WHERE user_id = ?'
  ).all(userId);

  // Get usage logs
  const usageLogs = db.prepare(
    'SELECT * FROM usage_log WHERE user_id = ?'
  ).all(String(userId));

  // Get subscriptions (exclude stripe_subscription_id, stripe_price_id)
  const subscriptions = db.prepare(
    'SELECT id, tier, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at FROM subscriptions WHERE user_id = ?'
  ).all(userId);

  return {
    account,
    apiKeys,
    usageLogs,
    subscriptions,
    exportedAt: new Date().toISOString(),
  };
}

module.exports = { deleteAccount, exportUserData };
