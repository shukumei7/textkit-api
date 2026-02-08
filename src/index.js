const { createApp } = require('./server');
const config = require('./config');
const { getDb } = require('./db');

const app = createApp();

// Initialize database on startup
getDb();

const server = app.listen(config.port, () => {
  console.log(`TextKit API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health check: http://localhost:${config.port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  const { closeDb } = require('./db');
  closeDb();
  server.close(() => process.exit(0));
});

module.exports = server;
