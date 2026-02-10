process.env.NODE_ENV = 'test';
process.env.STRIPE_TEST_PRICE_BASIC = 'price_test_basic';
process.env.STRIPE_TEST_PRICE_PRO = 'price_test_pro';
process.env.STRIPE_TEST_PRICE_ULTRA = 'price_test_ultra';
process.env.STRIPE_TEST_PRICE_MEGA = 'price_test_mega';

const { getDb, closeDb } = require('../../../src/db');
const {
  createSubscription,
  getActiveSubscription,
  getSubscriptionByStripeId,
  updateSubscriptionByStripeId,
  resolveTierFromPriceId,
} = require('../../../src/services/subscription');

describe('Subscription Service', () => {
  let testUserId;

  beforeAll(() => {
    // Create a test user for foreign key constraints
    const db = getDb();

    // Check if user exists, otherwise create it
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('test-subscription@example.com');
    if (existing) {
      testUserId = existing.id;
    } else {
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
      ).run('test-subscription@example.com', 'hashedpass', 'Test User');
      testUserId = result.lastInsertRowid;
    }
  });

  afterAll(() => {
    closeDb();
  });

  describe('createSubscription', () => {
    it('creates a subscription and returns lastInsertRowid', () => {
      const uniqueSubId = `sub_test_create_${Date.now()}_${Math.random()}`;

      const subId = createSubscription({
        userId: testUserId,
        tier: 'PRO',
        stripeSubscriptionId: uniqueSubId,
        stripePriceId: 'price_test_pro',
        status: 'active',
        currentPeriodStart: '2026-01-01T00:00:00.000Z',
        currentPeriodEnd: '2026-02-01T00:00:00.000Z',
      });

      expect(subId).toBeGreaterThan(0);

      // Verify it was created
      const db = getDb();
      const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subId);
      expect(sub).toBeDefined();
      expect(sub.user_id).toBe(testUserId);
      expect(sub.tier).toBe('PRO');
      expect(sub.stripe_subscription_id).toBe(uniqueSubId);
      expect(sub.status).toBe('active');
    });
  });

  describe('getActiveSubscription', () => {
    let activeSubId;

    beforeAll(() => {
      // Create an active subscription
      activeSubId = `sub_active_${Date.now()}_${Math.random()}`;
      createSubscription({
        userId: testUserId,
        tier: 'ULTRA',
        stripeSubscriptionId: activeSubId,
        stripePriceId: 'price_test_ultra',
        status: 'active',
      });
    });

    it('returns active subscription for user', () => {
      const sub = getActiveSubscription(testUserId);
      expect(sub).toBeDefined();
      expect(sub.user_id).toBe(testUserId);
      expect(sub.status).toBe('active');
    });

    it('returns null for non-existent user', () => {
      const sub = getActiveSubscription(99999);
      expect(sub).toBeNull();
    });
  });

  describe('getSubscriptionByStripeId', () => {
    let testSubId;

    beforeAll(() => {
      testSubId = `sub_get_${Date.now()}_${Math.random()}`;
      createSubscription({
        userId: testUserId,
        tier: 'PRO',
        stripeSubscriptionId: testSubId,
        stripePriceId: 'price_test_pro',
        status: 'active',
      });
    });

    it('returns subscription by stripe_subscription_id', () => {
      const sub = getSubscriptionByStripeId(testSubId);
      expect(sub).toBeDefined();
      expect(sub.stripe_subscription_id).toBe(testSubId);
    });

    it('returns null for unknown stripe_subscription_id', () => {
      const sub = getSubscriptionByStripeId('sub_unknown_999');
      expect(sub).toBeNull();
    });
  });

  describe('updateSubscriptionByStripeId', () => {
    let updateSubId;

    beforeAll(() => {
      updateSubId = `sub_update_${Date.now()}_${Math.random()}`;
      createSubscription({
        userId: testUserId,
        tier: 'PRO',
        stripeSubscriptionId: updateSubId,
        stripePriceId: 'price_test_pro',
        status: 'active',
      });
    });

    it('updates status, tier, period dates, cancelAtPeriodEnd, stripePriceId', () => {
      updateSubscriptionByStripeId(updateSubId, {
        status: 'past_due',
        tier: 'BASIC',
        currentPeriodStart: '2026-02-01T00:00:00.000Z',
        currentPeriodEnd: '2026-03-01T00:00:00.000Z',
        cancelAtPeriodEnd: true,
        stripePriceId: 'price_test_basic',
      });

      const sub = getSubscriptionByStripeId(updateSubId);
      expect(sub.status).toBe('past_due');
      expect(sub.tier).toBe('BASIC');
      expect(sub.current_period_start).toBe('2026-02-01T00:00:00.000Z');
      expect(sub.current_period_end).toBe('2026-03-01T00:00:00.000Z');
      expect(sub.cancel_at_period_end).toBe(1);
      expect(sub.stripe_price_id).toBe('price_test_basic');
    });
  });

  describe('resolveTierFromPriceId', () => {
    it('maps price IDs to tiers', () => {
      expect(resolveTierFromPriceId('price_test_basic')).toBe('BASIC');
      expect(resolveTierFromPriceId('price_test_pro')).toBe('PRO');
      expect(resolveTierFromPriceId('price_test_ultra')).toBe('ULTRA');
      expect(resolveTierFromPriceId('price_test_mega')).toBe('MEGA');
    });

    it('defaults to BASIC for unknown price ID', () => {
      expect(resolveTierFromPriceId('price_unknown_999')).toBe('BASIC');
    });
  });
});
