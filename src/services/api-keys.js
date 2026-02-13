const crypto = require('crypto');
const { getDb } = require('../db');

function generateApiKey() {
  const random = crypto.randomBytes(32).toString('hex');
  return `tk_live_${random}`;
}

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function createApiKey(userId, name) {
  const db = getDb();
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12); // "tk_live_xxxx"

  db.prepare(
    'INSERT INTO api_keys (user_id, key_hash, key_prefix, name) VALUES (?, ?, ?, ?)'
  ).run(userId, keyHash, keyPrefix, name || 'Default');

  // Return raw key only once — never stored
  return { key: rawKey, prefix: keyPrefix, name: name || 'Default' };
}

function listApiKeys(userId) {
  const db = getDb();
  return db.prepare(
    'SELECT id, key_prefix, name, is_active, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
}

function deleteApiKey(userId, keyId) {
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM api_keys WHERE id = ? AND user_id = ?'
  ).run(keyId, userId);
  return result.changes > 0;
}

function lookupApiKey(rawKey) {
  const db = getDb();
  const keyHash = hashApiKey(rawKey);
  const row = db.prepare(
    `SELECT ak.id AS key_id, ak.user_id, ak.is_active,
            s.tier, s.status AS sub_status
     FROM api_keys ak
     LEFT JOIN subscriptions s ON s.user_id = ak.user_id
       AND s.status IN ('active', 'trialing')
     WHERE ak.key_hash = ?
     ORDER BY s.created_at DESC
     LIMIT 1`
  ).get(keyHash);

  if (!row || !row.is_active) return null;

  // Update last_used_at
  db.prepare(
    "UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?"
  ).run(row.key_id);

  return {
    userId: String(row.user_id),
    tier: (row.sub_status === 'active' || row.sub_status === 'trialing') ? row.tier : 'FREE',
  };
}

module.exports = {
  generateApiKey,
  hashApiKey,
  createApiKey,
  listApiKeys,
  deleteApiKey,
  lookupApiKey,
};
