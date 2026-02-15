const { Router } = require('express');
const { adminAuth } = require('../middleware/admin-auth');
const { getDb } = require('../db');

const router = Router();

router.use('/admin', adminAuth);

// Overview stats
router.get('/admin/overview', (req, res) => {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as count FROM usage_log').get();
  const last30 = db.prepare("SELECT COUNT(*) as count FROM usage_log WHERE created_at >= datetime('now', '-30 days')").get();
  const today = db.prepare("SELECT COUNT(*) as count FROM usage_log WHERE created_at >= datetime('now', 'start of day')").get();
  const users = db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM usage_log').get();
  const tokens = db.prepare('SELECT COALESCE(SUM(tokens_used), 0) as total FROM usage_log').get();
  const errors = db.prepare("SELECT COUNT(*) as count FROM usage_log WHERE status_code >= 400").get();
  const errorRate = total.count > 0 ? ((errors.count / total.count) * 100).toFixed(1) : '0.0';

  res.json({
    totalRequests: total.count,
    last30Days: last30.count,
    today: today.count,
    uniqueUsers: users.count,
    totalTokens: tokens.total,
    errorRate: parseFloat(errorRate),
  });
});

// Daily trend (last 30 days)
router.get('/admin/daily', (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT date(created_at) as date, COUNT(*) as count
     FROM usage_log
     WHERE created_at >= datetime('now', '-30 days')
     GROUP BY date(created_at)
     ORDER BY date ASC`
  ).all();
  res.json({ daily: rows });
});

// Endpoint breakdown
router.get('/admin/endpoints', (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT
       endpoint,
       COUNT(*) as count,
       ROUND(AVG(response_time_ms)) as avg_response_ms,
       ROUND(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as error_rate,
       COALESCE(SUM(tokens_used), 0) as total_tokens
     FROM usage_log
     GROUP BY endpoint
     ORDER BY count DESC`
  ).all();
  res.json({ endpoints: rows });
});

// Tier distribution
router.get('/admin/tiers', (req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM usage_log').get();
  const rows = db.prepare(
    `SELECT tier, COUNT(*) as count
     FROM usage_log
     GROUP BY tier
     ORDER BY count DESC`
  ).all();
  const tiers = rows.map(r => ({
    ...r,
    share: total.count > 0 ? parseFloat(((r.count / total.count) * 100).toFixed(1)) : 0,
  }));
  res.json({ tiers });
});

// Top users
router.get('/admin/top-users', (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT
       ul.user_id,
       u.email,
       COUNT(*) as request_count,
       COALESCE(SUM(ul.tokens_used), 0) as total_tokens
     FROM usage_log ul
     LEFT JOIN users u ON ul.user_id = CAST(u.id AS TEXT)
     GROUP BY ul.user_id
     ORDER BY request_count DESC
     LIMIT 20`
  ).all();
  res.json({ users: rows });
});

// Recent requests
router.get('/admin/recent', (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 500);
  const rows = db.prepare(
    `SELECT
       ul.created_at,
       ul.user_id,
       u.email,
       ul.endpoint,
       ul.tier,
       ul.status_code,
       ul.response_time_ms,
       ul.tokens_used
     FROM usage_log ul
     LEFT JOIN users u ON ul.user_id = CAST(u.id AS TEXT)
     ORDER BY ul.id DESC
     LIMIT ?`
  ).all(limit);
  res.json({ requests: rows });
});

// Purge test data (usage_log entries with no matching user)
router.delete('/admin/test-data', (req, res) => {
  const db = getDb();
  const result = db.prepare(
    `DELETE FROM usage_log
     WHERE user_id NOT IN (SELECT CAST(id AS TEXT) FROM users)`
  ).run();
  res.json({ deleted: result.changes });
});

// Registration stats
router.get('/admin/registrations', (req, res) => {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const last30 = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-30 days')").get();
  const today = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', 'start of day')").get();

  const daily = db.prepare(
    `SELECT date(created_at) as date, COUNT(*) as count
     FROM users
     WHERE created_at >= datetime('now', '-30 days')
     GROUP BY date(created_at)
     ORDER BY date ASC`
  ).all();

  const recent = db.prepare(
    `SELECT id, email, name, created_at
     FROM users
     ORDER BY id DESC
     LIMIT 10`
  ).all();

  res.json({
    total: total.count,
    last30Days: last30.count,
    today: today.count,
    daily,
    recent,
  });
});

// Page view stats
router.get('/admin/page-views', (req, res) => {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as count FROM page_views').get();
  const today = db.prepare("SELECT COUNT(*) as count FROM page_views WHERE created_at >= datetime('now', 'start of day')").get();

  const byPage = db.prepare(
    `SELECT path, COUNT(*) as count
     FROM page_views
     GROUP BY path
     ORDER BY count DESC`
  ).all();

  const daily = db.prepare(
    `SELECT date(created_at) as date, COUNT(*) as count
     FROM page_views
     WHERE created_at >= datetime('now', '-30 days')
     GROUP BY date(created_at)
     ORDER BY date ASC`
  ).all();

  res.json({
    total: total.count,
    today: today.count,
    byPage,
    daily,
  });
});

module.exports = router;
