process.env.NODE_ENV = 'test';

const request = require('supertest');
const { createApp } = require('../../src/server');
const { closeDb, getDb } = require('../../src/db');
const { signToken } = require('../../src/services/auth');

describe('Dashboard Routes Integration Tests', () => {
  let app;
  let testUserId;
  let jwtToken;

  // Helper to format dates in SQLite-compatible format (YYYY-MM-DD HH:MM:SS)
  function sqliteDatetime(date) {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }

  beforeAll(() => {
    app = createApp();

    // Create test user
    const db = getDb();

    // Check if user exists, otherwise create it
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('dashboard-test@example.com');
    if (existing) {
      testUserId = existing.id;
    } else {
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
      ).run('dashboard-test@example.com', 'hashedpass', 'Dashboard Test User');
      testUserId = result.lastInsertRowid;
    }

    // Generate JWT token
    jwtToken = signToken({ id: testUserId, email: 'dashboard-test@example.com' });
  });

  beforeEach(() => {
    // Clean up subscriptions and usage_log for this user before each test
    const db = getDb();
    db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM usage_log WHERE user_id = ?').run(testUserId);
  });

  afterAll(() => {
    closeDb();
  });

  describe('GET /dashboard/studio/usage', () => {
    it('requires authentication', async () => {
      const res = await request(app)
        .get('/dashboard/studio/usage');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('returns usage for free user', async () => {
      const res = await request(app)
        .get('/dashboard/studio/usage')
        .set('Cookie', [`token=${jwtToken}`]);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        tier: 'FREE',
        usedToday: 0,
        limitToday: 10,
        limitPerMinute: 2,
      });
    });

    it('returns usage for subscribed user', async () => {
      // Create active PRO subscription
      const db = getDb();
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, stripe_price_id, status)
         VALUES (?, ?, ?, ?, ?)`
      ).run(testUserId, 'PRO', `sub_pro_test_${Date.now()}`, 'price_test_pro', 'active');

      const res = await request(app)
        .get('/dashboard/studio/usage')
        .set('Cookie', [`token=${jwtToken}`]);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        tier: 'PRO',
        limitToday: 500,
        limitPerMinute: 30,
      });
      expect(res.body.usedToday).toBeGreaterThanOrEqual(0);
    });

    it('returns null limitToday for MEGA tier', async () => {
      // Create active MEGA subscription
      const db = getDb();
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, stripe_price_id, status)
         VALUES (?, ?, ?, ?, ?)`
      ).run(testUserId, 'MEGA', `sub_mega_test_${Date.now()}`, 'price_test_mega', 'active');

      const res = await request(app)
        .get('/dashboard/studio/usage')
        .set('Cookie', [`token=${jwtToken}`]);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        tier: 'MEGA',
        limitToday: null,
        limitPerMinute: 120,
      });
    });

    it('returns FREE tier for canceled subscription', async () => {
      // Create canceled subscription
      const db = getDb();
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, stripe_price_id, status)
         VALUES (?, ?, ?, ?, ?)`
      ).run(testUserId, 'PRO', `sub_canceled_test_${Date.now()}`, 'price_test_pro', 'canceled');

      const res = await request(app)
        .get('/dashboard/studio/usage')
        .set('Cookie', [`token=${jwtToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.tier).toBe('FREE');
      expect(res.body.limitToday).toBe(10);
    });

    it('returns correct usedToday count', async () => {
      const db = getDb();

      // Insert usage records for today
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const today = sqliteDatetime(dayStart);

      db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, tokens_used, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(String(testUserId), '/api/v1/summarize', 'FREE', 100, today);

      db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, tokens_used, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(String(testUserId), '/api/v1/rewrite', 'FREE', 50, today);

      // Insert old usage (should not count)
      const yesterday = new Date(dayStart);
      yesterday.setDate(yesterday.getDate() - 1);
      db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, tokens_used, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(String(testUserId), '/api/v1/summarize', 'FREE', 200, sqliteDatetime(yesterday));

      const res = await request(app)
        .get('/dashboard/studio/usage')
        .set('Cookie', [`token=${jwtToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.usedToday).toBe(2); // Only today's 2 records
    });
  });
});
