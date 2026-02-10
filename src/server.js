const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');
const { errorHandler } = require('./middleware/error-handler');
const routes = require('./routes');
const { pageTracker } = require('./middleware/page-tracker');

function createApp() {
  const app = express();

  // Core middleware
  app.use(cors());

  // Stripe webhook needs raw body BEFORE json parsing
  app.use('/stripe/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());

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
