const { Router } = require('express');
const { getDb } = require('../db');
const config = require('../config');

const router = Router();

// GET /health - basic health check (no auth)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /status - detailed status (no auth)
router.get('/status', (req, res) => {
  let dbOk = false;
  let totalRequests = 0;
  try {
    const db = getDb();
    const result = db.prepare('SELECT COUNT(*) as count FROM usage_log').get();
    totalRequests = result.count;
    dbOk = true;
  } catch (err) {
    dbOk = false;
  }

  res.json({
    status: 'ok',
    version: '1.0.0',
    environment: config.nodeEnv,
    database: dbOk ? 'connected' : 'error',
    totalRequests,
    endpoints: 9,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
