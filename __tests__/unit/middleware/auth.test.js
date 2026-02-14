process.env.NODE_ENV = 'test';
process.env.RAPIDAPI_PROXY_SECRET = 'test-proxy-secret';
process.env.LOCAL_API_KEY = 'test-local-key';

const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const { auth } = require('../../../src/middleware/auth');
const config = require('../../../src/config');

// Mock dependencies for JWT cookie auth
jest.mock('../../../src/services/auth');
jest.mock('../../../src/services/subscription');

const { verifyToken, getUserById } = require('../../../src/services/auth');
const { getActiveSubscription } = require('../../../src/services/subscription');

describe('Auth Middleware', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(cookieParser());
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

  describe('JWT cookie authentication', () => {
    it('authenticates with valid JWT cookie', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      verifyToken.mockReturnValue({ userId: 1 });
      getUserById.mockReturnValue(mockUser);
      getActiveSubscription.mockReturnValue(null);

      const response = await request(app)
        .get('/test')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('1');
      expect(response.body.userTier).toBe('FREE');
      expect(verifyToken).toHaveBeenCalledWith('valid-jwt-token');
      expect(getUserById).toHaveBeenCalledWith(1);
      expect(getActiveSubscription).toHaveBeenCalledWith(1);
    });

    it('sets tier from active subscription', async () => {
      const mockUser = { id: 2, email: 'pro@example.com', name: 'Pro User' };
      const mockSub = { status: 'active', tier: 'PRO' };
      verifyToken.mockReturnValue({ userId: 2 });
      getUserById.mockReturnValue(mockUser);
      getActiveSubscription.mockReturnValue(mockSub);

      const response = await request(app)
        .get('/test')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(200);
      expect(response.body.userTier).toBe('PRO');
    });

    it('sets tier from trialing subscription', async () => {
      const mockUser = { id: 3, email: 'trial@example.com', name: 'Trial User' };
      const mockSub = { status: 'trialing', tier: 'BASIC' };
      verifyToken.mockReturnValue({ userId: 3 });
      getUserById.mockReturnValue(mockUser);
      getActiveSubscription.mockReturnValue(mockSub);

      const response = await request(app)
        .get('/test')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(200);
      expect(response.body.userTier).toBe('BASIC');
    });

    it('falls through to 401 on invalid JWT', async () => {
      verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/test')
        .set('Cookie', ['token=invalid-jwt-token']);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('falls through to 401 when user not found', async () => {
      verifyToken.mockReturnValue({ userId: 999 });
      getUserById.mockReturnValue(null);

      const response = await request(app)
        .get('/test')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('does not interfere with API key auth', async () => {
      // When both cookie and API key are present, API key should take priority
      const response = await request(app)
        .get('/test')
        .set('Cookie', ['token=jwt-token'])
        .set('x-api-key', config.auth.localApiKey);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('local-dev');
      expect(response.body.userTier).toBe('MEGA');
      // JWT functions should not be called since API key auth happens first
      expect(verifyToken).not.toHaveBeenCalled();
    });

    it('cancelled subscription gets FREE tier', async () => {
      const mockUser = { id: 4, email: 'canceled@example.com', name: 'Canceled User' };
      const mockSub = { status: 'canceled', tier: 'PRO' };
      verifyToken.mockReturnValue({ userId: 4 });
      getUserById.mockReturnValue(mockUser);
      getActiveSubscription.mockReturnValue(mockSub);

      const response = await request(app)
        .get('/test')
        .set('Cookie', ['token=valid-jwt-token']);

      expect(response.status).toBe(200);
      expect(response.body.userTier).toBe('FREE');
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
