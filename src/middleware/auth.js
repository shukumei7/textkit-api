const config = require('../config');

function auth(req, res, next) {
  // RapidAPI proxy-secret authentication (primary)
  const proxySecret = req.headers['x-rapidapi-proxy-secret'];
  if (proxySecret && proxySecret === config.auth.rapidApiProxySecret) {
    // Extract user info from RapidAPI headers
    req.userId = req.headers['x-rapidapi-user'] || 'rapidapi-user';
    req.userTier = mapSubscription(req.headers['x-rapidapi-subscription'] || 'BASIC');
    return next();
  }

  // Local API key fallback (development)
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.auth.localApiKey) {
    req.userId = 'local-dev';
    req.userTier = req.headers['x-tier'] || 'MEGA'; // Dev gets full access
    return next();
  }

  // No auth in test mode with test header
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
