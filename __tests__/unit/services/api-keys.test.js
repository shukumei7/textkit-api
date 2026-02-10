process.env.NODE_ENV = 'test';

const { getDb, closeDb } = require('../../../src/db');
const {
  generateApiKey,
  hashApiKey,
  createApiKey,
  listApiKeys,
  deleteApiKey,
  lookupApiKey,
} = require('../../../src/services/api-keys');
const bcrypt = require('bcryptjs');

describe('API Keys Service', () => {
  let db;
  let userId;

  beforeAll(async () => {
    db = getDb();

    const hash = await bcrypt.hash('testpass', 4);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('apikeys-test@example.com');
    if (existing) {
      userId = existing.id;
    } else {
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
      ).run('apikeys-test@example.com', hash, 'API Keys Test');
      userId = result.lastInsertRowid;
    }
  });

  afterAll(() => {
    if (db) {
      db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    }
    closeDb();
  });

  beforeEach(() => {
    db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
  });

  describe('generateApiKey', () => {
    it('returns a string starting with tk_live_', () => {
      const key = generateApiKey();
      expect(key).toMatch(/^tk_live_[a-f0-9]{64}$/);
    });

    it('generates unique keys each time', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey', () => {
    it('returns a 64-char hex SHA-256 hash', () => {
      const hash = hashApiKey('tk_live_abc123');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic — same input gives same hash', () => {
      const h1 = hashApiKey('tk_live_test');
      const h2 = hashApiKey('tk_live_test');
      expect(h1).toBe(h2);
    });

    it('different inputs produce different hashes', () => {
      const h1 = hashApiKey('tk_live_aaa');
      const h2 = hashApiKey('tk_live_bbb');
      expect(h1).not.toBe(h2);
    });
  });

  describe('createApiKey', () => {
    it('returns raw key, prefix, and name', () => {
      const result = createApiKey(userId, 'My Key');
      expect(result.key).toMatch(/^tk_live_/);
      expect(result.prefix).toBe(result.key.substring(0, 12));
      expect(result.name).toBe('My Key');
    });

    it('defaults name to "Default"', () => {
      const result = createApiKey(userId);
      expect(result.name).toBe('Default');
    });

    it('stores the key hash in DB (not the raw key)', () => {
      const result = createApiKey(userId, 'Stored Key');
      const hash = hashApiKey(result.key);
      const row = db.prepare('SELECT key_hash FROM api_keys WHERE user_id = ? AND name = ?')
        .get(userId, 'Stored Key');
      expect(row.key_hash).toBe(hash);
    });
  });

  describe('listApiKeys', () => {
    it('returns empty array for user with no keys', () => {
      const keys = listApiKeys(userId);
      expect(keys).toEqual([]);
    });

    it('returns all keys for user with metadata (no raw key)', () => {
      createApiKey(userId, 'Key A');
      createApiKey(userId, 'Key B');

      const keys = listApiKeys(userId);
      expect(keys).toHaveLength(2);
      expect(keys[0]).toHaveProperty('id');
      expect(keys[0]).toHaveProperty('key_prefix');
      expect(keys[0]).toHaveProperty('name');
      expect(keys[0]).toHaveProperty('is_active');
      expect(keys[0]).toHaveProperty('created_at');
      // Must NOT expose the raw key or hash
      expect(keys[0]).not.toHaveProperty('key_hash');
      expect(keys[0]).not.toHaveProperty('key');
    });

    it('does not return keys from other users', () => {
      createApiKey(userId, 'My Key');
      const otherKeys = listApiKeys(999999);
      expect(otherKeys).toEqual([]);
    });
  });

  describe('deleteApiKey', () => {
    it('deletes an existing key and returns true', () => {
      createApiKey(userId, 'Deletable');
      const keys = listApiKeys(userId);
      const keyId = keys[0].id;

      const deleted = deleteApiKey(userId, keyId);
      expect(deleted).toBe(true);
      expect(listApiKeys(userId)).toHaveLength(0);
    });

    it('returns false for non-existent key', () => {
      const deleted = deleteApiKey(userId, 999999);
      expect(deleted).toBe(false);
    });

    it('returns false when keyId belongs to another user', () => {
      createApiKey(userId, 'Mine');
      const keys = listApiKeys(userId);
      const keyId = keys[0].id;

      // Try deleting with wrong userId
      const deleted = deleteApiKey(999999, keyId);
      expect(deleted).toBe(false);
      // Key should still exist
      expect(listApiKeys(userId)).toHaveLength(1);
    });
  });

  describe('lookupApiKey', () => {
    it('returns userId and tier for valid key with active subscription', () => {
      const { key } = createApiKey(userId, 'Lookup Key');
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, status)
         VALUES (?, ?, ?, ?)`
      ).run(userId, 'PRO', `sub_lookup_${Date.now()}`, 'active');

      const result = lookupApiKey(key);
      expect(result).not.toBeNull();
      expect(result.userId).toBe(String(userId));
      expect(result.tier).toBe('PRO');
    });

    it('returns null tier when no active subscription', () => {
      const { key } = createApiKey(userId, 'No Sub Key');

      const result = lookupApiKey(key);
      expect(result).not.toBeNull();
      expect(result.userId).toBe(String(userId));
      expect(result.tier).toBeNull();
    });

    it('returns tier for trialing subscription', () => {
      const { key } = createApiKey(userId, 'Trial Key');
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, status)
         VALUES (?, ?, ?, ?)`
      ).run(userId, 'MEGA', `sub_trial_${Date.now()}`, 'trialing');

      const result = lookupApiKey(key);
      expect(result.tier).toBe('MEGA');
    });

    it('returns null tier for canceled subscription', () => {
      const { key } = createApiKey(userId, 'Canceled Key');
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, status)
         VALUES (?, ?, ?, ?)`
      ).run(userId, 'PRO', `sub_can_${Date.now()}`, 'canceled');

      const result = lookupApiKey(key);
      expect(result.tier).toBeNull();
    });

    it('returns null for inactive key', () => {
      const { key } = createApiKey(userId, 'Inactive Key');
      db.prepare('UPDATE api_keys SET is_active = 0 WHERE user_id = ?').run(userId);

      const result = lookupApiKey(key);
      expect(result).toBeNull();
    });

    it('returns null for unknown key', () => {
      const result = lookupApiKey('tk_live_0000000000000000000000000000000000000000000000000000000000000000');
      expect(result).toBeNull();
    });

    it('updates last_used_at on successful lookup', () => {
      const { key } = createApiKey(userId, 'Timestamp Key');
      db.prepare(
        `INSERT INTO subscriptions (user_id, tier, stripe_subscription_id, status)
         VALUES (?, ?, ?, ?)`
      ).run(userId, 'BASIC', `sub_ts_${Date.now()}`, 'active');

      lookupApiKey(key);

      const row = db.prepare(
        'SELECT last_used_at FROM api_keys WHERE user_id = ? AND name = ?'
      ).get(userId, 'Timestamp Key');
      expect(row.last_used_at).not.toBeNull();
    });
  });
});
