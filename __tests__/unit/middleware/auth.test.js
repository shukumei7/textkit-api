process.env.NODE_ENV = 'test';
process.env.RAPIDAPI_PROXY_SECRET = 'test-proxy-secret';
process.env.LOCAL_API_KEY = 'test-local-key';

const express = require('express');
const request = require('supertest');
const { auth } = require('../../../src/middleware/auth');
const config = require('../../../src/config');

describe('Auth Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(auth);
    app.get('/test', (req, res) => {
      res.json({
        userId: req.userId,
        userTier: req.userTier,
      });
    });
  });

  describe('RapidAPI proxy-secret authentication', () => {
    it('accepts valid RapidAPI proxy-secret', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-rapidapi-proxy-secret', config.auth.rapidApiProxySecret)
        .set('x-rapidapi-user', 'rapidapi-user-123')
        .set('x-rapidapi-subscription', 'PRO');

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('rapidapi-user-123');
      expect(response.body.userTier).toBe('PRO');
    });

    it('sets correct userId and userTier from RapidAPI headers', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-rapidapi-proxy-secret', config.auth.rapidApiProxySecret)
        .set('x-rapidapi-user', 'user-456')
        .set('x-rapidapi-subscription', 'ULTRA');

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('user-456');
      expect(response.body.userTier).toBe('ULTRA');
    });

    it('maps subscription tiers correctly', async () => {
      const tiers = ['BASIC', 'PRO', 'ULTRA', 'MEGA'];

      for (const tier of tiers) {
        const response = await request(app)
          .get('/test')
          .set('x-rapidapi-proxy-secret', config.auth.rapidApiProxySecret)
          .set('x-rapidapi-user', 'test-user')
          .set('x-rapidapi-subscription', tier.toLowerCase());

        expect(response.status).toBe(200);
        expect(response.body.userTier).toBe(tier);
      }
    });

    it('defaults to BASIC for unknown subscription tiers', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-rapidapi-proxy-secret', config.auth.rapidApiProxySecret)
        .set('x-rapidapi-user', 'test-user')
        .set('x-rapidapi-subscription', 'UNKNOWN_TIER');

      expect(response.status).toBe(200);
      expect(response.body.userTier).toBe('BASIC');
    });
  });

  describe('Local API key authentication', () => {
    it('accepts valid local API key', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-api-key', config.auth.localApiKey);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('local-dev');
      expect(response.body.userTier).toBe('MEGA');
    });

    it('allows custom tier with local API key', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-api-key', config.auth.localApiKey)
        .set('x-tier', 'PRO');

      expect(response.status).toBe(200);
      expect(response.body.userTier).toBe('PRO');
    });
  });

  describe('Test mode authentication', () => {
    it('accepts test bypass header in test mode', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-test-auth', 'bypass')
        .set('x-test-user', 'test-user-xyz')
        .set('x-test-tier', 'BASIC');

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('test-user-xyz');
      expect(response.body.userTier).toBe('BASIC');
    });

    it('defaults to test-user and MEGA tier with test bypass', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-test-auth', 'bypass');

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('test-user');
      expect(response.body.userTier).toBe('MEGA');
    });
  });

  describe('Unauthorized requests', () => {
    it('rejects requests with no auth headers', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.code).toBe('AUTH_REQUIRED');
      expect(response.body.details).toContain('x-rapidapi-proxy-secret');
      expect(response.body.details).toContain('x-api-key');
    });

    it('rejects requests with invalid proxy-secret', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-rapidapi-proxy-secret', 'invalid-secret');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('rejects requests with invalid API key', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-api-key', 'invalid-key');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });
  });
});
