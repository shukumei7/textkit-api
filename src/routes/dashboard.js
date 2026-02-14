const { Router } = require('express');
const { jwtAuth } = require('../middleware/jwt-auth');
const { createApiKey, listApiKeys, deleteApiKey } = require('../services/api-keys');
const { getActiveSubscription } = require('../services/subscription');
const { getDb } = require('../db');
const config = require('../config');

const router = Router();

// All dashboard routes require JWT auth
router.use('/dashboard', jwtAuth);

// List API keys
router.get('/dashboard/api-keys', (req, res) => {
  const keys = listApiKeys(req.user.id);
  res.json({ keys });
});

// Create API key
router.post('/dashboard/api-keys', (req, res) => {
  const { name } = req.body;
  const result = createApiKey(req.user.id, name);
  res.status(201).json({
    message: 'API key created. Save it now — it will not be shown again.',
    ...result,
  });
});

// Delete API key
router.delete('/dashboard/api-keys/:id', (req, res) => {
  const deleted = deleteApiKey(req.user.id, parseInt(req.params.id, 10));
  if (!deleted) {
    return res.status(404).json({ error: 'API key not found' });
  }
  res.json({ message: 'API key deleted' });
});

// Get subscription info
router.get('/dashboard/subscription', (req, res) => {
  const sub = getActiveSubscription(req.user.id);
  res.json({ subscription: sub });
});

// Get usage stats (last 30 days)
router.get('/dashboard/usage', (req, res) => {
  const db = getDb();
  const userId = String(req.user.id);

  const stats = db.prepare(
    `SELECT endpoint, COUNT(*) as count, SUM(tokens_used) as total_tokens
     FROM usage_log
     WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
     GROUP BY endpoint
     ORDER BY count DESC`
  ).all(userId);

  const daily = db.prepare(
    `SELECT date(created_at) as date, COUNT(*) as count
     FROM usage_log
     WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
     GROUP BY date(created_at)
     ORDER BY date DESC`
  ).all(userId);

  res.json({ stats, daily });
});

/**
 * Get Studio usage statistics
 * Returns the user's current tier, today's usage count, and rate limits.
 * Used by TextKit Studio (/studio.html) to display real-time usage tracking.
 *
 * @route GET /dashboard/studio/usage
 * @returns {Object} Usage data - { tier, usedToday, limitToday, limitPerMinute }
 */
router.get('/dashboard/studio/usage', (req, res) => {
  const db = getDb();
  const userId = String(req.user.id);

  const sub = getActiveSubscription(req.user.id);
  const tier = (sub && ['active', 'trialing'].includes(sub.status)) ? sub.tier : 'FREE';
  const limits = config.rateLimits[tier];

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayCount = db.prepare(
    'SELECT COUNT(*) as count FROM usage_log WHERE user_id = ? AND created_at >= ?'
  ).get(userId, dayStart.toISOString());

  res.json({
    tier,
    usedToday: dayCount.count,
    limitToday: limits.perDay === Infinity ? null : limits.perDay,
    limitPerMinute: limits.perMinute,
  });
});

module.exports = router;
