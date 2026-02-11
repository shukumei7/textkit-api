require('dotenv').config();
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'db'),
  port: parseInt(process.env.TEXTKIT_PORT || process.env.PORT, 10) || 3100,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  auth: {
    rapidApiProxySecret: process.env.RAPIDAPI_PROXY_SECRET,
    localApiKey: process.env.LOCAL_API_KEY,
  },
  rateLimits: {
    DEMO:   { perDay: 20,   perMinute: 5 },
    BASIC:  { perDay: 100,  perMinute: 10 },
    PRO:    { perDay: 500,  perMinute: 30 },
    ULTRA:  { perDay: 2000, perMinute: 60 },
    MEGA:   { perDay: Infinity, perMinute: 120 },
  },
  stripe: {
    secretKey: isProduction
      ? process.env.STRIPE_SECRET_KEY
      : (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY),
    webhookSecret: isProduction
      ? process.env.STRIPE_WEBHOOK_SECRET
      : (process.env.STRIPE_TEST_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET),
    prices: {
      BASIC: isProduction ? process.env.STRIPE_PRICE_BASIC : (process.env.STRIPE_TEST_PRICE_BASIC || process.env.STRIPE_PRICE_BASIC),
      PRO: isProduction ? process.env.STRIPE_PRICE_PRO : (process.env.STRIPE_TEST_PRICE_PRO || process.env.STRIPE_PRICE_PRO),
      ULTRA: isProduction ? process.env.STRIPE_PRICE_ULTRA : (process.env.STRIPE_TEST_PRICE_ULTRA || process.env.STRIPE_PRICE_ULTRA),
      MEGA: isProduction ? process.env.STRIPE_PRICE_MEGA : (process.env.STRIPE_TEST_PRICE_MEGA || process.env.STRIPE_PRICE_MEGA),
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
  adminApiKey: process.env.ADMIN_API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Validate required config
if (!config.openai.apiKey && config.nodeEnv === 'production') {
  console.error('FATAL: OPENAI_API_KEY is required in production');
  process.exit(1);
}

if (!config.jwt.secret || config.jwt.secret === 'dev-jwt-secret-change-in-production') {
  if (config.nodeEnv === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production');
    process.exit(1);
  }
}

module.exports = config;
