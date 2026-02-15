const config = require('../config');
const { lookupApiKey } = require('../services/api-keys');
const { verifyToken, getUserById } = require('../services/auth');
const { getActiveSubscription } = require('../services/subscription');

function auth(req, res, next) {
  // RapidAPI proxy-secret authentication (primary)
  const proxySecret = req.headers['x-rapidapi-proxy-secret'];
  if (proxySecret && proxySecret === config.auth.rapidApiProxySecret) {
    // Extract user info from RapidAPI headers
    req.userId = req.headers['x-rapidapi-user'] || 'rapidapi-user';
    req.userTier = mapSubscription(req.headers['x-rapidapi-subscription'] || 'BASIC');
    return next();
  }

  // Database API key lookup (tk_live_* keys)
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey.startsWith('tk_live_')) {
    const result = lookupApiKey(apiKey);
    if (result && result.tier) {
      req.userId = result.userId;
      req.userTier = result.tier;
      return next();
    }
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_API_KEY',
      details: 'Invalid API key or no active subscription',
    });
  }

  // Demo key for public "Try It" widget (restricted DEMO tier)
  if (apiKey === 'demo') {
    req.userId = 'demo-user';
    req.userTier = 'DEMO';
    return next();
  }

  // Static local key fallback (dev only)
  if (apiKey && apiKey === config.auth.localApiKey) {
    req.userId = 'local-dev';
    req.userTier = req.headers['x-tier'] || 'MEGA';
    return next();
  }

  // Bearer JWT token auth (for Chrome extension and external clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyToken(token);
      const user = getUserById(payload.userId);
      if (user) {
        const sub = getActiveSubscription(user.id);
        req.userId = String(user.id);
        req.userTier = (sub && ['active', 'trialing'].includes(sub.status)) ? sub.tier : 'FREE';
        return next();
      }
    } catch (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'INVALID_TOKEN',
        details: 'Invalid or expired Bearer token',
      });
    }
  }

  // Test bypass
  if (config.nodeEnv === 'test' && req.headers['x-test-auth'] === 'bypass') {
    req.userId = req.headers['x-test-user'] || 'test-user';
    req.userTier = req.headers['x-test-tier'] || 'MEGA';
    return next();
  }

  // JWT cookie auth (for Studio web app and dashboard)
  // This allows web users to make authenticated API calls via cookie instead of API key header
  const token = req.cookies?.token;
  if (token) {
    try {
      const payload = verifyToken(token);
      const user = getUserById(payload.userId);
      if (user) {
        const sub = getActiveSubscription(user.id);
        req.userId = String(user.id);
        req.userTier = (sub && ['active', 'trialing'].includes(sub.status)) ? sub.tier : 'FREE';
        return next();
      }
    } catch (err) { /* fall through to 401 */ }
  }

  return res.status(401).json({
    error: 'Unauthorized',
    code: 'AUTH_REQUIRED',
    details: 'Provide x-rapidapi-proxy-secret or x-api-key header',
  });
}

function mapSubscription(subscription) {
  const map = {
    'BASIC': 'BASIC',
    'PRO': 'PRO',
    'ULTRA': 'ULTRA',
    'MEGA': 'MEGA',
  };
  return map[subscription.toUpperCase()] || 'BASIC';
}

module.exports = { auth };
