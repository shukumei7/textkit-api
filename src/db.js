const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function getDb() {
  if (db) return db;

  const dbDir = path.join(__dirname, '..', 'db');
  fs.mkdirSync(dbDir, { recursive: true });

  db = new Database(path.join(dbDir, 'textkit.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      tier TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      response_time_ms INTEGER DEFAULT 0,
      status_code INTEGER DEFAULT 200,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_usage_user_endpoint
    ON usage_log(user_id, endpoint, created_at)
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      stripe_customer_id TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      key_hash TEXT UNIQUE NOT NULL,
      key_prefix TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Default',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      last_used_at TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      tier TEXT NOT NULL,
      stripe_subscription_id TEXT UNIQUE,
      stripe_price_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      current_period_start TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare('CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)').run();

  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
