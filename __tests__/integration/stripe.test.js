process.env.NODE_ENV = 'test';
process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_fake_key';
process.env.STRIPE_TEST_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.STRIPE_TEST_PRICE_BASIC = 'price_test_basic';
process.env.STRIPE_TEST_PRICE_PRO = 'price_test_pro';
process.env.STRIPE_TEST_PRICE_ULTRA = 'price_test_ultra';
process.env.STRIPE_TEST_PRICE_MEGA = 'price_test_mega';

// Mock stripe module
const mockStripe = {
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
  subscriptions: { retrieve: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
};
jest.mock('stripe', () => jest.fn(() => mockStripe));

const request = require('supertest');
const { createApp } = require('../../src/server');
const { closeDb, getDb } = require('../../src/db');
const { signToken } = require('../../src/services/auth');

describe('Stripe Routes Integration Tests', () => {
  let app;
  let testUserId;
  let jwtToken;

  beforeAll(() => {
    app = createApp();

    // Create test user
    const db = getDb();

    // Check if user exists, otherwise create it
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('stripe-test@example.com');
    if (existing) {
      testUserId = existing.id;
    } else {
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
      ).run('stripe-test@example.com', 'hashedpass', 'Stripe Test User');
      testUserId = result.lastInsertRowid;
    }

    // Generate JWT token
    jwtToken = signToken({ id: testUserId, email: 'stripe-test@example.com' });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset user's stripe_customer_id to null before each test
    const db = getDb();
    db.prepare('UPDATE users SET stripe_customer_id = NULL WHERE id = ?').run(testUserId);
  });

  afterAll(() => {
    closeDb();
  });

  describe('POST /stripe/create-checkout', () => {
    it('returns 401 without auth cookie', async () => {
      const res = await request(app)
        .post('/stripe/create-checkout')
        .send({ tier: 'PRO' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('returns 400 for missing tier', async () => {
      const res = await request(app)
        .post('/stripe/create-checkout')
        .set('Cookie', [`token=${jwtToken}`])
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_TIER');
    });

    it('returns 400 for invalid tier', async () => {
      const res = await request(app)
        .post('/stripe/create-checkout')
        .set('Cookie', [`token=${jwtToken}`])
        .send({ tier: 'INVALID' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_TIER');
    });

    it('returns 200 with valid tier', async () => {
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_test_123' });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });

      const res = await request(app)
        .post('/stripe/create-checkout')
        .set('Cookie', [`token=${jwtToken}`])
        .send({ tier: 'PRO' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
    });
  });

  describe('POST /stripe/webhook', () => {
    it('returns 400 without stripe-signature header', async () => {
      const res = await request(app)
        .post('/stripe/webhook')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify({ type: 'test.event' })));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing stripe-signature header');
    });

    it('returns 400 when constructEvent throws', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const res = await request(app)
        .post('/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'invalid_sig')
        .send(Buffer.from(JSON.stringify({ type: 'test.event' })));

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Webhook Error');
    });

    it('returns 200 with valid webhook', async () => {
      // Use unique subscription ID based on timestamp to avoid conflicts
      const uniqueSubId = `sub_integration_test_${Date.now()}`;

      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            subscription: uniqueSubId,
            metadata: { userId: String(testUserId), tier: 'PRO' },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: uniqueSubId,
        status: 'active',
        items: { data: [{ price: { id: 'price_test_pro' } }] },
        current_period_start: 1704067200,
        current_period_end: 1706745600,
      });

      const res = await request(app)
        .post('/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig')
        .send(Buffer.from(JSON.stringify(mockEvent)));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    });
  });

  describe('POST /stripe/create-portal', () => {
    it('returns 401 without auth cookie', async () => {
      const res = await request(app)
        .post('/stripe/create-portal')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('returns 400 when user has no stripe_customer_id', async () => {
      const res = await request(app)
        .post('/stripe/create-portal')
        .set('Cookie', [`token=${jwtToken}`])
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('NO_SUBSCRIPTION');
    });

    it('returns 200 when user has stripe_customer_id', async () => {
      // Update user to have stripe_customer_id
      const db = getDb();
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run('cus_test_portal_123', testUserId);

      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal/test',
      });

      const res = await request(app)
        .post('/stripe/create-portal')
        .set('Cookie', [`token=${jwtToken}`])
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ url: 'https://billing.stripe.com/portal/test' });
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_portal_123',
        return_url: expect.stringContaining('/dashboard.html'),
      });
    });
  });
});
