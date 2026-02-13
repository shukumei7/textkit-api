const { createApp } = require('./server');
const config = require('./config');
const { getDb } = require('./db');
const { execSync } = require('child_process');
const { version } = require('../package.json');

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown';
  }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function start() {
  const commit = getGitCommit();
  console.log(`TextKit API v${version} (${commit}) starting...`);

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
    console.log(`TextKit API v${version} (${commit}) running on port ${config.port}`);
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
