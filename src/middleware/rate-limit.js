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
  // IMPORTANT: Use SQLite datetime() functions instead of JS Date.toISOString()
  // because formats differ: SQLite uses '2026-02-14 00:00:00' (space separator)
  // while JS uses '2026-02-14T00:00:00.000Z' (T separator). String comparison
  // fails because 'T' > ' ' in ASCII, causing rate limits to never trigger.
  const minuteCount = db.prepare(
    "SELECT COUNT(*) as count FROM usage_log WHERE user_id = ? AND created_at > datetime('now', '-1 minute')"
  ).get(userId);

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
    const dayCount = db.prepare(
      "SELECT COUNT(*) as count FROM usage_log WHERE user_id = ? AND created_at >= datetime('now', 'start of day')"
    ).get(userId);

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
