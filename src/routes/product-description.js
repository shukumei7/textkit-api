const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { generateProductDescription } = require('../services/product-description');
const { lookupApiKey } = require('../services/api-keys');
const { verifyToken, getUserById } = require('../services/auth');
const { getActiveSubscription } = require('../services/subscription');
const { getDb } = require('../db');
const config = require('../config');

const router = Router();

const schema = {
  name: { required: true, type: 'string', minLength: 2, maxLength: 200 },
  materials: { type: 'string', maxLength: 500 },
  features: { type: 'string', maxLength: 500 },
  style: { type: 'string', enum: ['artisan', 'modern', 'playful', 'professional'] },
  targetBuyer: { type: 'string', maxLength: 200 },
};

// Attempt optional authentication — does not reject unauthenticated requests
function tryAuth(req) {
  // RapidAPI proxy secret
  const proxySecret = req.headers['x-rapidapi-proxy-secret'];
  if (proxySecret && proxySecret === config.auth.rapidApiProxySecret) {
    return {
      userId: req.headers['x-rapidapi-user'] || 'rapidapi-user',
      tier: req.headers['x-rapidapi-subscription']
        ? req.headers['x-rapidapi-subscription'].toUpperCase()
        : 'BASIC',
    };
  }

  const apiKey = req.headers['x-api-key'];

  // Database API key (tk_live_*)
  if (apiKey && apiKey.startsWith('tk_live_')) {
    const result = lookupApiKey(apiKey);
    if (result && result.tier) {
      return { userId: result.userId, tier: result.tier };
    }
    // Invalid live key — treat as anonymous rather than 401 for optional auth
    return null;
  }

  // Demo key
  if (apiKey === 'demo') {
    return { userId: 'demo-user', tier: 'DEMO' };
  }

  // Static local key
  if (apiKey && apiKey === config.auth.localApiKey) {
    return { userId: 'local-dev', tier: req.headers['x-tier'] || 'MEGA' };
  }

  // Test bypass
  if (config.nodeEnv === 'test' && req.headers['x-test-auth'] === 'bypass') {
    return {
      userId: req.headers['x-test-user'] || 'test-user',
      tier: req.headers['x-test-tier'] || 'MEGA',
    };
  }

  // Bearer JWT
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(authHeader.slice(7));
      const user = getUserById(payload.userId);
      if (user) {
        const sub = getActiveSubscription(user.id);
        return {
          userId: String(user.id),
          tier: (sub && ['active', 'trialing'].includes(sub.status)) ? sub.tier : 'FREE',
        };
      }
    } catch (_) { /* fall through */ }
  }

  // JWT cookie
  const cookieToken = req.cookies && req.cookies.token;
  if (cookieToken) {
    try {
      const payload = verifyToken(cookieToken);
      const user = getUserById(payload.userId);
      if (user) {
        const sub = getActiveSubscription(user.id);
        return {
          userId: String(user.id),
          tier: (sub && ['active', 'trialing'].includes(sub.status)) ? sub.tier : 'FREE',
        };
      }
    } catch (_) { /* fall through */ }
  }

  return null;
}

const ANON_DAILY_LIMIT = 3;

router.post('/api/product-description', validate(schema), async (req, res) => {
  const startTime = Date.now();
  const db = getDb();

  // 1. Optional auth
  const authResult = tryAuth(req);
  const isAnon = authResult === null;
  const userId = isAnon ? `anon:${req.ip}` : authResult.userId;
  const tier = isAnon ? 'ANON' : authResult.tier;

  // 2. Rate limit check
  if (isAnon) {
    const dayCount = db.prepare(
      "SELECT COUNT(*) as count FROM usage_log WHERE user_id = ? AND created_at >= datetime('now', 'start of day')"
    ).get(userId);

    if (dayCount.count >= ANON_DAILY_LIMIT) {
      return res.status(429).json({
        error: 'Free limit reached',
        code: 'ANON_LIMIT_REACHED',
        details: 'Sign up for a free account to continue',
        daily_limit: ANON_DAILY_LIMIT,
      });
    }
  } else {
    const limits = config.rateLimits[tier];
    if (limits) {
      // Per-minute check
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

      // Per-day check (skip for unlimited)
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
    }
  }

  // 3. Generate description
  let result;
  try {
    result = await generateProductDescription(req.body);
  } catch (err) {
    const statusCode = err.status || 500;
    const responseTimeMs = Date.now() - startTime;

    db.prepare(
      "INSERT INTO usage_log (user_id, endpoint, tier, status_code, response_time_ms, tokens_used) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(userId, '/api/product-description', tier, statusCode, responseTimeMs, 0);

    return res.status(statusCode).json({
      error: err.expose ? err.message : 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    });
  }

  // 4. Log usage
  const responseTimeMs = Date.now() - startTime;
  db.prepare(
    "INSERT INTO usage_log (user_id, endpoint, tier, status_code, response_time_ms, tokens_used) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, '/api/product-description', tier, 200, responseTimeMs, result.metadata.tokensUsed);

  // 5. Return result
  const response = {
    title: result.title,
    description: result.description,
    tags: result.tags,
    meta: result.meta,
    metadata: result.metadata,
  };

  if (isAnon) {
    // Re-query count after logging to get accurate remaining count
    const updatedCount = db.prepare(
      "SELECT COUNT(*) as count FROM usage_log WHERE user_id = ? AND created_at >= datetime('now', 'start of day')"
    ).get(userId);
    response.tries_remaining = Math.max(0, ANON_DAILY_LIMIT - updatedCount.count);
  }

  res.json(response);
});

module.exports = router;
