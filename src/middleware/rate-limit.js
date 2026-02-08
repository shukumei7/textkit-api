const config = require('../config');
const { getDb } = require('../db');

function rateLimit(req, res, next) {
  const db = getDb();
  const userId = req.userId;
  const tier = req.userTier;
  const limits = config.rateLimits[tier];

  if (!limits) {
    return res.status(500).json({ error: 'Invalid tier', code: 'INVALID_TIER' });
  }

  // Check per-minute limit
  const minuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const minuteCount = db.prepare(
    'SELECT COUNT(*) as count FROM usage_log WHERE user_id = ? AND created_at > ?'
  ).get(userId, minuteAgo);

  if (minuteCount.count >= limits.perMinute) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_MINUTE',
      details: `${limits.perMinute} requests per minute allowed for ${tier} tier`,
      retryAfter: 60,
    });
  }

  // Check per-day limit (skip for unlimited)
  if (limits.perDay !== Infinity) {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayCount = db.prepare(
      'SELECT COUNT(*) as count FROM usage_log WHERE user_id = ? AND created_at >= ?'
    ).get(userId, dayStart.toISOString());

    if (dayCount.count >= limits.perDay) {
      return res.status(429).json({
        error: 'Daily limit exceeded',
        code: 'RATE_LIMIT_DAY',
        details: `${limits.perDay} requests per day allowed for ${tier} tier`,
      });
    }
  }

  next();
}

module.exports = { rateLimit };
