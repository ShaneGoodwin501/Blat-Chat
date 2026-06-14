// SQLite schema + connection. Uses better-sqlite3 (synchronous, fast, embedded).
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function init(dataDir) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'blatchat.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      display_name  TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      active        INTEGER NOT NULL DEFAULT 1,
      has_avatar    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body         TEXT    NOT NULL,
      attachment_id INTEGER REFERENCES attachments(id) ON DELETE SET NULL,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

    CREATE TABLE IF NOT EXISTS attachments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      filename      TEXT    NOT NULL UNIQUE,
      original_name TEXT    NOT NULL,
      mime          TEXT    NOT NULL,
      size          INTEGER NOT NULL,
      uploaded_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default settings. Idempotent — INSERT OR IGNORE skips existing keys.
  db.exec(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('default_language', 'en');
  `);

  // Lightweight migration: add has_avatar to existing installs.
  const userCols = db.pragma('table_info(users)');
  if (!userCols.some(c => c.name === 'has_avatar')) {
    db.exec('ALTER TABLE users ADD COLUMN has_avatar INTEGER NOT NULL DEFAULT 0');
  }

  return db;
}

module.exports = { init };
