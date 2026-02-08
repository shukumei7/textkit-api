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

  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
