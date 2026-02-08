const { getDb } = require('../db');

function trackUsage(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO usage_log (user_id, endpoint, tier, tokens_used, response_time_ms, status_code)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        req.userId || 'unknown',
        req.originalUrl,
        req.userTier || 'BASIC',
        res.tokensUsed || 0,
        Date.now() - startTime,
        res.statusCode
      );
    } catch (err) {
      console.error('Usage tracking error:', err.message);
    }
  });

  next();
}

module.exports = { trackUsage };
