process.env.NODE_ENV = 'test';

const request = require('supertest');
const { createApp } = require('../../src/server');
const { setupMockLLM, resetMockLLM } = require('../helpers/mock-llm');
const { getDb, closeDb } = require('../../src/db');
const { createApiKey } = require('../../src/services/api-keys');
const bcrypt = require('bcryptjs');

const SAMPLE_TEXT = 'This is a comprehensive article about artificial intelligence, machine learning, and the future of technology in modern business environments.';

describe('API Key Auth Flow', () => {
  let app;
  let db;
  let userId;

  beforeAll(async () => {
    setupMockLLM();
    app = createApp();
    db = getDb();

    // Create test user
    const hash = await bcrypt.hash('testpass123', 4);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('apitest@example.com');
    if (existing) {
      userId = existing.id;
      // Clean up any leftover keys/subs from previous runs
      db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
    } else {
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
      ).run('apitest@example.com', hash, 'API Test User');
      userId = result.lastInsertRowid;
    }
  });

  afterAll(() => {
    // Clean up
    if (db) {
      db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    }
    resetMockLLM();
    closeDb();
  });

  describe('with active subscription + valid API key', () => {
    let apiKey;

    beforeAll(() => {
      // Create active subscription
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, status)
         VALUES (?, ?, ?, ?)`
      ).run(userId, 'PRO', `sub_authtest_${Date.now()}`, 'active');

      // Generate API key
      const result = createApiKey(userId, 'Auth Test Key');
      apiKey = result.key;
    });

    afterAll(() => {
      db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
    });

    it('calls /api/v1/summarize successfully', async () => {
      const res = await request(app)
        .post('/api/v1/summarize')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
    });

    it('calls /api/v1/extract/keywords successfully', async () => {
      const res = await request(app)
        .post('/api/v1/extract/keywords')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('keywords');
    });

    it('calls /api/v1/rewrite successfully', async () => {
      const res = await request(app)
        .post('/api/v1/rewrite')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT, tone: 'formal' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('rewritten');
    });

    it('calls /api/v1/repurpose successfully', async () => {
      const res = await request(app)
        .post('/api/v1/repurpose')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT, platforms: ['twitter', 'linkedin'] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('platforms');
    });

    it('calls /api/v1/seo/meta successfully', async () => {
      const res = await request(app)
        .post('/api/v1/seo/meta')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('seo');
    });

    it('calls /api/v1/email/subject-lines successfully', async () => {
      const res = await request(app)
        .post('/api/v1/email/subject-lines')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('subjectLines');
    });

    it('calls /api/v1/headlines successfully', async () => {
      const res = await request(app)
        .post('/api/v1/headlines')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('headlines');
    });

    it('calls /api/v1/translate/tone successfully', async () => {
      const res = await request(app)
        .post('/api/v1/translate/tone')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT, targetTone: 'formal' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('translated');
    });

    it('calls /api/v1/compare successfully', async () => {
      const res = await request(app)
        .post('/api/v1/compare')
        .set('x-api-key', apiKey)
        .send({
          text1: SAMPLE_TEXT,
          text2: 'A different article about technology trends and digital transformation in various industries worldwide.',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('similarity');
    });

    it('updates last_used_at on the API key', () => {
      const keys = db.prepare(
        'SELECT last_used_at FROM api_keys WHERE user_id = ?'
      ).all(userId);

      expect(keys.length).toBeGreaterThan(0);
      expect(keys[0].last_used_at).not.toBeNull();
    });
  });

  describe('with no subscription', () => {
    let apiKey;

    beforeAll(() => {
      // Create key but NO subscription
      const result = createApiKey(userId, 'No Sub Key');
      apiKey = result.key;
    });

    afterAll(() => {
      db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
    });

    it('returns 401 INVALID_API_KEY', async () => {
      const res = await request(app)
        .post('/api/v1/summarize')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_API_KEY');
    });
  });

  describe('with canceled subscription', () => {
    let apiKey;

    beforeAll(() => {
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, status)
         VALUES (?, ?, ?, ?)`
      ).run(userId, 'PRO', `sub_canceled_${Date.now()}`, 'canceled');

      const result = createApiKey(userId, 'Canceled Sub Key');
      apiKey = result.key;
    });

    afterAll(() => {
      db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
    });

    it('returns 401 — canceled sub is not active', async () => {
      const res = await request(app)
        .post('/api/v1/summarize')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_API_KEY');
    });
  });

  describe('with past_due subscription', () => {
    let apiKey;

    beforeAll(() => {
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, status)
         VALUES (?, ?, ?, ?)`
      ).run(userId, 'ULTRA', `sub_pastdue_${Date.now()}`, 'past_due');

      const result = createApiKey(userId, 'Past Due Key');
      apiKey = result.key;
    });

    afterAll(() => {
      db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
    });

    it('returns 401 — past_due sub is not active', async () => {
      const res = await request(app)
        .post('/api/v1/summarize')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_API_KEY');
    });
  });

  describe('with inactive API key', () => {
    let apiKey;

    beforeAll(() => {
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, status)
         VALUES (?, ?, ?, ?)`
      ).run(userId, 'PRO', `sub_inactive_${Date.now()}`, 'active');

      const result = createApiKey(userId, 'Inactive Key');
      apiKey = result.key;

      // Deactivate the key
      db.prepare('UPDATE api_keys SET is_active = 0 WHERE user_id = ?').run(userId);
    });

    afterAll(() => {
      db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
    });

    it('returns 401 — deactivated key is rejected', async () => {
      const res = await request(app)
        .post('/api/v1/summarize')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_API_KEY');
    });
  });

  describe('with invalid or missing key', () => {
    it('returns 401 for bogus tk_live_ key', async () => {
      const res = await request(app)
        .post('/api/v1/summarize')
        .set('x-api-key', 'tk_live_000000000000000000000000000000000000000000000000000000000000dead')
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_API_KEY');
    });

    it('returns 401 with no auth header at all', async () => {
      const res = await request(app)
        .post('/api/v1/summarize')
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('tier-based access', () => {
    let basicKey;

    beforeAll(() => {
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, status)
         VALUES (?, ?, ?, ?)`
      ).run(userId, 'BASIC', `sub_basic_${Date.now()}`, 'active');

      const result = createApiKey(userId, 'Basic Tier Key');
      basicKey = result.key;
    });

    afterAll(() => {
      db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
    });

    it('authenticates as BASIC tier and can call endpoints', async () => {
      const res = await request(app)
        .post('/api/v1/summarize')
        .set('x-api-key', basicKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
    });
  });

  describe('trialing subscription', () => {
    let apiKey;

    beforeAll(() => {
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, status)
         VALUES (?, ?, ?, ?)`
      ).run(userId, 'MEGA', `sub_trial_${Date.now()}`, 'trialing');

      const result = createApiKey(userId, 'Trial Key');
      apiKey = result.key;
    });

    afterAll(() => {
      db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
    });

    it('allows access — trialing is treated as active', async () => {
      const res = await request(app)
        .post('/api/v1/summarize')
        .set('x-api-key', apiKey)
        .send({ text: SAMPLE_TEXT });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
    });
  });
});
