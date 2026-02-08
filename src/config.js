require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3100,
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
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Validate required config
if (!config.openai.apiKey && config.nodeEnv === 'production') {
  console.error('FATAL: OPENAI_API_KEY is required in production');
  process.exit(1);
}

module.exports = config;
