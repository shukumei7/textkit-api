process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const { rateLimit } = require('../../../src/middleware/rate-limit');
const { getDb, closeDb } = require('../../../src/db');
const config = require('../../../src/config');

describe('Rate Limit Middleware', () => {
  let app;
  let db;

  // Helper to format dates in SQLite-compatible format (YYYY-MM-DD HH:MM:SS)
  function sqliteDatetime(date) {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }

  beforeAll(() => {
    db = getDb();
  });

  afterAll(() => {
    closeDb();
  });

  beforeEach(() => {
    // Clear usage log before each test
    db.prepare('DELETE FROM usage_log').run();

    // Create test app with rate limit middleware
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
      req.userId = req.headers['x-test-user'] || 'test-user';
      req.userTier = req.headers['x-test-tier'] || 'BASIC';
      next();
    });

    app.use(rateLimit);

    app.get('/test', (req, res) => {
      res.json({ success: true });
    });
  });

  describe('Per-minute rate limits', () => {
    it('allows requests within per-minute limit', async () => {
      const limit = config.rateLimits.BASIC.perMinute;

      // Make requests up to the limit
      for (let i = 0; i < limit; i++) {
        const response = await request(app)
          .get('/test')
          .set('x-test-user', 'user-minute-1')
          .set('x-test-tier', 'BASIC');

        expect(response.status).toBe(200);
      }
    });

    it('returns 429 when per-minute limit exceeded', async () => {
      const limit = config.rateLimits.BASIC.perMinute;
      const userId = 'user-minute-2';

      // Insert usage records up to the limit
      const stmt = db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, created_at) VALUES (?, ?, ?, ?)'
      );

      const now = sqliteDatetime(new Date());
      for (let i = 0; i < limit; i++) {
        stmt.run(userId, '/test', 'BASIC', now);
      }

      // Next request should be rate limited
      const response = await request(app)
        .get('/test')
        .set('x-test-user', userId)
        .set('x-test-tier', 'BASIC');

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Rate limit exceeded');
      expect(response.body.code).toBe('RATE_LIMIT_MINUTE');
      expect(response.body.details).toContain('per minute');
      expect(response.body.retryAfter).toBe(60);
    });

    it('does not count requests from 61+ seconds ago', async () => {
      const userId = 'user-minute-3';
      const oldTimestamp = sqliteDatetime(new Date(Date.now() - 61 * 1000));

      // Insert old usage records (should not count)
      const stmt = db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, created_at) VALUES (?, ?, ?, ?)'
      );

      for (let i = 0; i < 20; i++) {
        stmt.run(userId, '/test', 'BASIC', oldTimestamp);
      }

      // Request should succeed because old records don't count
      const response = await request(app)
        .get('/test')
        .set('x-test-user', userId)
        .set('x-test-tier', 'BASIC');

      expect(response.status).toBe(200);
    });

    it('correctly counts records stored by usage middleware (SQLite datetime format)', async () => {
      const userId = 'user-format-test';
      // Simulate what the usage middleware actually stores: datetime('now') format
      const sqliteNow = new Date().toISOString().replace('T', ' ').slice(0, 19);

      const stmt = db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, created_at) VALUES (?, ?, ?, ?)'
      );

      const limit = config.rateLimits.BASIC.perMinute;
      for (let i = 0; i < limit; i++) {
        stmt.run(userId, '/test', 'BASIC', sqliteNow);
      }

      const response = await request(app)
        .get('/test')
        .set('x-test-user', userId)
        .set('x-test-tier', 'BASIC');

      expect(response.status).toBe(429);
    });
  });

  describe('Per-day rate limits', () => {
    it('allows requests within per-day limit', async () => {
      const userId = 'user-day-1';
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);

      // Insert usage records below daily limit
      const stmt = db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, created_at) VALUES (?, ?, ?, ?)'
      );

      const count = config.rateLimits.BASIC.perDay - 1;
      for (let i = 0; i < count; i++) {
        stmt.run(userId, '/test', 'BASIC', sqliteDatetime(dayStart));
      }

      // Next request should succeed
      const response = await request(app)
        .get('/test')
        .set('x-test-user', userId)
        .set('x-test-tier', 'BASIC');

      expect(response.status).toBe(200);
    });

    it('returns 429 when per-day limit exceeded', async () => {
      const userId = 'user-day-2';
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);

      // Insert usage records up to daily limit
      const stmt = db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, created_at) VALUES (?, ?, ?, ?)'
      );

      const limit = config.rateLimits.BASIC.perDay;
      for (let i = 0; i < limit; i++) {
        stmt.run(userId, '/test', 'BASIC', sqliteDatetime(dayStart));
      }

      // Next request should be rate limited
      const response = await request(app)
        .get('/test')
        .set('x-test-user', userId)
        .set('x-test-tier', 'BASIC');

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Daily limit exceeded');
      expect(response.body.code).toBe('RATE_LIMIT_DAY');
      expect(response.body.details).toContain('per day');
    });

    it('does not count requests from previous days', async () => {
      const userId = 'user-day-3';
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      // Insert old usage records from yesterday
      const stmt = db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, created_at) VALUES (?, ?, ?, ?)'
      );

      for (let i = 0; i < 200; i++) {
        stmt.run(userId, '/test', 'BASIC', sqliteDatetime(yesterday));
      }

      // Request should succeed because yesterday's records don't count
      const response = await request(app)
        .get('/test')
        .set('x-test-user', userId)
        .set('x-test-tier', 'BASIC');

      expect(response.status).toBe(200);
    });

    it('allows unlimited tier (MEGA) for daily limits', async () => {
      const userId = 'user-mega';
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);

      // Insert many usage records (more than any limited tier)
      const stmt = db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, created_at) VALUES (?, ?, ?, ?)'
      );

      for (let i = 0; i < 10000; i++) {
        stmt.run(userId, '/test', 'MEGA', sqliteDatetime(dayStart));
      }

      // Request should still succeed because MEGA has unlimited daily
      const response = await request(app)
        .get('/test')
        .set('x-test-user', userId)
        .set('x-test-tier', 'MEGA');

      expect(response.status).toBe(200);
    });
  });

  describe('Different tier limits', () => {
    it('enforces correct limits for PRO tier', async () => {
      const userId = 'user-pro';
      const limit = config.rateLimits.PRO.perMinute;

      // Insert usage up to PRO limit
      const stmt = db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, created_at) VALUES (?, ?, ?, ?)'
      );

      const now = sqliteDatetime(new Date());
      for (let i = 0; i < limit; i++) {
        stmt.run(userId, '/test', 'PRO', now);
      }

      // Next request should be rate limited
      const response = await request(app)
        .get('/test')
        .set('x-test-user', userId)
        .set('x-test-tier', 'PRO');

      expect(response.status).toBe(429);
      expect(response.body.details).toContain('PRO');
    });

    it('enforces correct limits for ULTRA tier', async () => {
      const userId = 'user-ultra';
      const limit = config.rateLimits.ULTRA.perMinute;

      // Insert usage up to ULTRA limit
      const stmt = db.prepare(
        'INSERT INTO usage_log (user_id, endpoint, tier, created_at) VALUES (?, ?, ?, ?)'
      );

      const now = sqliteDatetime(new Date());
      for (let i = 0; i < limit; i++) {
        stmt.run(userId, '/test', 'ULTRA', now);
      }

      // Next request should be rate limited
      const response = await request(app)
        .get('/test')
        .set('x-test-user', userId)
        .set('x-test-tier', 'ULTRA');

      expect(response.status).toBe(429);
      expect(response.body.details).toContain('ULTRA');
    });
  });

  describe('Error handling', () => {
    it('returns 500 for invalid tier', async () => {
      app = express();
      app.use((req, res, next) => {
        req.userId = 'test-user';
        req.userTier = 'INVALID_TIER';
        next();
      });
      app.use(rateLimit);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Invalid tier');
      expect(response.body.code).toBe('INVALID_TIER');
    });
  });
});
