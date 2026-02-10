process.env.NODE_ENV = 'test';
process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_fake_key';
process.env.STRIPE_TEST_WEBHOOK_SECRET = 'whsec_test_fake';

// Mock stripe module
const mockStripe = {
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
  subscriptions: { retrieve: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
};
jest.mock('stripe', () => jest.fn(() => mockStripe));

// Mock auth service
jest.mock('../../../src/services/auth', () => ({
  getUserById: jest.fn(),
  updateStripeCustomerId: jest.fn(),
}));

// Mock subscription service
jest.mock('../../../src/services/subscription', () => ({
  createSubscription: jest.fn(),
  updateSubscriptionByStripeId: jest.fn(),
  getSubscriptionByStripeId: jest.fn(),
  resolveTierFromPriceId: jest.fn(),
}));

// Mock db
jest.mock('../../../src/db', () => ({ getDb: jest.fn() }));

// Mock config
jest.mock('../../../src/config', () => ({
  stripe: {
    secretKey: 'sk_test_fake',
    webhookSecret: 'whsec_test_fake',
    prices: { BASIC: 'price_basic', PRO: 'price_pro', ULTRA: 'price_ultra', MEGA: 'price_mega' },
  },
  jwt: { secret: 'test-secret', expiresIn: '1h' },
  nodeEnv: 'test',
}));

const {
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
} = require('../../../src/services/stripe');

const { getUserById, updateStripeCustomerId } = require('../../../src/services/auth');
const {
  createSubscription,
  updateSubscriptionByStripeId,
  getSubscriptionByStripeId,
  resolveTierFromPriceId,
} = require('../../../src/services/subscription');

describe('Stripe Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('creates customer when user has no stripe_customer_id', async () => {
      getUserById.mockReturnValue({ id: 1, email: 'test@example.com', stripe_customer_id: null });
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_test_123' });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });

      const result = await createCheckoutSession({
        userId: 1,
        email: 'test@example.com',
        tier: 'PRO',
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
      });

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { userId: '1' },
      });
      expect(updateStripeCustomerId).toHaveBeenCalledWith(1, 'cus_test_123');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: 'price_pro', quantity: 1 }],
        success_url: 'http://localhost/success',
        cancel_url: 'http://localhost/cancel',
        metadata: { userId: '1', tier: 'PRO' },
      });
      expect(result).toEqual({ sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/test' });
    });

    it('reuses existing stripe_customer_id', async () => {
      getUserById.mockReturnValue({ id: 2, email: 'existing@example.com', stripe_customer_id: 'cus_existing_456' });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/test2',
      });

      const result = await createCheckoutSession({
        userId: 2,
        email: 'existing@example.com',
        tier: 'BASIC',
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
      });

      expect(mockStripe.customers.create).not.toHaveBeenCalled();
      expect(updateStripeCustomerId).not.toHaveBeenCalled();
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_existing_456' })
      );
      expect(result).toEqual({ sessionId: 'cs_test_456', url: 'https://checkout.stripe.com/test2' });
    });

    it('throws 400 for invalid tier', async () => {
      getUserById.mockReturnValue({ id: 3, email: 'test@example.com', stripe_customer_id: null });

      await expect(
        createCheckoutSession({
          userId: 3,
          email: 'test@example.com',
          tier: 'INVALID',
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        })
      ).rejects.toThrow('No price configured for tier: INVALID');
    });
  });

  describe('createPortalSession', () => {
    it('creates portal session', async () => {
      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal/test',
      });

      const result = await createPortalSession({
        stripeCustomerId: 'cus_test_789',
        returnUrl: 'http://localhost/dashboard',
      });

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_789',
        return_url: 'http://localhost/dashboard',
      });
      expect(result).toEqual({ url: 'https://billing.stripe.com/portal/test' });
    });
  });

  describe('constructWebhookEvent', () => {
    it('calls stripe.webhooks.constructEvent with correct args', () => {
      const rawBody = Buffer.from('test-body');
      const signature = 'test-signature';
      const mockEvent = { type: 'test.event' };
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = constructWebhookEvent(rawBody, signature);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
        'whsec_test_fake'
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('handleWebhookEvent', () => {
    it('handles checkout.session.completed', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            subscription: 'sub_test_123',
            metadata: { userId: '10', tier: 'PRO' },
          },
        },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test_123',
        status: 'active',
        items: { data: [{ price: { id: 'price_pro' } }] },
        current_period_start: 1704067200, // 2024-01-01 00:00:00 UTC
        current_period_end: 1706745600,   // 2024-02-01 00:00:00 UTC
      });

      await handleWebhookEvent(event);

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test_123');
      expect(createSubscription).toHaveBeenCalledWith({
        userId: 10,
        tier: 'PRO',
        stripeSubscriptionId: 'sub_test_123',
        stripePriceId: 'price_pro',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00.000Z',
        currentPeriodEnd: '2024-02-01T00:00:00.000Z',
      });
    });

    it('handles customer.subscription.updated', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_456',
            status: 'active',
            items: { data: [{ price: { id: 'price_ultra' } }] },
            current_period_start: 1706745600, // 2024-02-01
            current_period_end: 1709251200,   // 2024-03-01
            cancel_at_period_end: false,
          },
        },
      };

      getSubscriptionByStripeId.mockReturnValue({ id: 1, stripe_subscription_id: 'sub_test_456' });
      resolveTierFromPriceId.mockReturnValue('ULTRA');

      await handleWebhookEvent(event);

      expect(getSubscriptionByStripeId).toHaveBeenCalledWith('sub_test_456');
      expect(resolveTierFromPriceId).toHaveBeenCalledWith('price_ultra');
      expect(updateSubscriptionByStripeId).toHaveBeenCalledWith('sub_test_456', {
        status: 'active',
        tier: 'ULTRA',
        stripePriceId: 'price_ultra',
        currentPeriodStart: '2024-02-01T00:00:00.000Z',
        currentPeriodEnd: '2024-03-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      });
    });

    it('handles customer.subscription.updated with unknown subscription', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_unknown_999',
            status: 'active',
            items: { data: [{ price: { id: 'price_pro' } }] },
            current_period_start: 1704067200,
            current_period_end: 1706745600,
            cancel_at_period_end: false,
          },
        },
      };

      getSubscriptionByStripeId.mockReturnValue(null);

      await handleWebhookEvent(event);

      expect(getSubscriptionByStripeId).toHaveBeenCalledWith('sub_unknown_999');
      expect(resolveTierFromPriceId).not.toHaveBeenCalled();
      expect(updateSubscriptionByStripeId).not.toHaveBeenCalled();
    });

    it('handles customer.subscription.deleted', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_789',
          },
        },
      };

      await handleWebhookEvent(event);

      expect(updateSubscriptionByStripeId).toHaveBeenCalledWith('sub_test_789', { status: 'canceled' });
    });

    it('handles invoice.payment_failed with subscription', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            subscription: 'sub_test_101',
          },
        },
      };

      await handleWebhookEvent(event);

      expect(updateSubscriptionByStripeId).toHaveBeenCalledWith('sub_test_101', { status: 'past_due' });
    });

    it('handles invoice.payment_failed without subscription', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            subscription: null,
          },
        },
      };

      await handleWebhookEvent(event);

      expect(updateSubscriptionByStripeId).not.toHaveBeenCalled();
    });
  });
});
