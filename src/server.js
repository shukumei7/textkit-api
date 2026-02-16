const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');
const { errorHandler } = require('./middleware/error-handler');
const routes = require('./routes');
const { pageTracker } = require('./middleware/page-tracker');

function createApp() {
  const app = express();

  // Trust first proxy (Railway, Render, etc.) for correct IP detection in rate limiting
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // CSP breaks Swagger UI inline scripts
  }));

  // Core middleware
  app.use(cors());

  // Stripe webhook needs raw body BEFORE json parsing
  app.use('/stripe/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());

  // Brute-force protection on auth routes (15 attempts per 15 min per IP)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts', code: 'AUTH_RATE_LIMIT', details: 'Try again in 15 minutes' },
  });
  app.use('/auth/login', authLimiter);
  app.use('/auth/register', authLimiter);
  app.use('/auth/forgot-password', authLimiter);
  app.use('/auth/reset-password', authLimiter);

  // Page view tracking (before static files)
  app.use(pageTracker);

  // Static files
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // API Documentation
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TextKit API Documentation',
  }));

  // Routes
  app.use(routes);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
