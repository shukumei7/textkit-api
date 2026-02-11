const { createApp } = require('./server');
const config = require('./config');
const { getDb } = require('./db');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function start() {
  // Retry DB init to handle volume mount race on Railway
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      getDb();
      console.log('Database initialized');
      break;
    } catch (err) {
      console.log(`DB init attempt ${attempt}/5 failed: ${err.message}`);
      if (attempt === 5) throw err;
      await sleep(2000);
    }
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`TextKit API running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });

  return server;
}

const serverPromise = start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down...');
  const { closeDb } = require('./db');
  closeDb();
  const server = await serverPromise;
  server.close(() => process.exit(0));
});

module.exports = serverPromise;
