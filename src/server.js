const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');
const { errorHandler } = require('./middleware/error-handler');
const routes = require('./routes');

function createApp() {
  const app = express();

  // Core middleware
  app.use(cors());
  app.use(express.json({ limit: '50kb' }));

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
