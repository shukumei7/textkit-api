const config = require('../config');
const { lookupApiKey } = require('../services/api-keys');

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

  // Static local key fallback (dev only)
  if (apiKey && apiKey === config.auth.localApiKey) {
    req.userId = 'local-dev';
    req.userTier = req.headers['x-tier'] || 'MEGA';
    return next();
  }

  // Test bypass
  if (config.nodeEnv === 'test' && req.headers['x-test-auth'] === 'bypass') {
    req.userId = req.headers['x-test-user'] || 'test-user';
    req.userTier = req.headers['x-test-tier'] || 'MEGA';
    return next();
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
