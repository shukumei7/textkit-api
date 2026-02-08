require('dotenv').config();

const config = {
  port: parseInt(process.env.TEXTKIT_PORT, 10) || 3100,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  auth: {
    rapidApiProxySecret: process.env.RAPIDAPI_PROXY_SECRET,
    localApiKey: process.env.LOCAL_API_KEY,
  },
  rateLimits: {
    BASIC:  { perDay: 100,  perMinute: 10 },
    PRO:    { perDay: 500,  perMinute: 30 },
    ULTRA:  { perDay: 2000, perMinute: 60 },
    MEGA:   { perDay: Infinity, perMinute: 120 },
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      BASIC: process.env.STRIPE_PRICE_BASIC,
      PRO: process.env.STRIPE_PRICE_PRO,
      ULTRA: process.env.STRIPE_PRICE_ULTRA,
      MEGA: process.env.STRIPE_PRICE_MEGA,
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
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
