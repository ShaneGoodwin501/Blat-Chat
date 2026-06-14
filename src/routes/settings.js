// Server-side settings. Today: just the default UI language (en/ru).
// The settings table is key-value; the language is one row.
//
// Each user can also override the default via users.preferred_language.
// A NULL value means "follow the admin default".
//
// Routes:
//   GET  /api/settings/default-language       — public, no auth. Returns { language: 'en' }.
//   POST /api/settings/preferred-language     — auth. Body { language: 'en'|'ru'|null }. Set or clear the user's own preference.
//   GET  /api/admin/settings                  — admin, returns the full settings map.
//   PUT  /api/admin/settings                  — admin, body { default_language: 'en'|'ru' }.

const express = require('express');
const { requireAuth, requireAdmin } = require('../auth');

const ALLOWED_LANGS = new Set(['en', 'ru']);

function getDefaultLanguage(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'default_language'").get();
  return row ? row.value : 'en';
}

// Resolve a user's effective language: their own preference if set,
// otherwise the global default. Both come from the DB so this is the
// single source of truth (no race with localStorage, no async).
function getEffectiveLanguage(db, userId) {
  if (userId) {
    const row = db.prepare('SELECT preferred_language FROM users WHERE id = ?').get(userId);
    if (row && row.preferred_language && ALLOWED_LANGS.has(row.preferred_language)) {
      return row.preferred_language;
    }
  }
  return getDefaultLanguage(db);
}

function buildPublicSettingsRouter(db) {
  const router = express.Router();
  // No auth — the language is needed by /login and / before the user signs in.
  // If the user has a session, use their effective language; otherwise the
  // global default. (For anonymous routes, this is just the default.)
  router.get('/default-language', (req, res) => {
    const userId = req.session && req.session.userId;
    res.json({ language: getEffectiveLanguage(db, userId) });
  });
  return router;
}

function buildUserLanguageRouter(db) {
  // Mounted under /api/auth so it shares the auth middleware.
  const router = express.Router();
  router.use(requireAuth);

  // POST /api/auth/preferred-language — set or clear the user's own preference.
  // Body: { language: 'en' | 'ru' | null }
  // Pass `null` to clear the override (fall back to the admin default).
  router.post('/preferred-language', express.json(), (req, res) => {
    const lang = req.body?.language == null ? null : String(req.body.language).toLowerCase();
    if (lang !== null && !ALLOWED_LANGS.has(lang)) {
      return res.status(400).json({ error: 'bad_language', allowed: [...ALLOWED_LANGS] });
    }
    db.prepare('UPDATE users SET preferred_language = ? WHERE id = ?').run(lang, req.session.userId);
    res.json({ ok: true, language: lang || getDefaultLanguage(db) });
  });

  return router;
}

function buildAdminSettingsRouter(db) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/settings', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    // Flatten to { default_language: 'en', ... } for easy consumption.
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    res.json({ settings: out });
  });

  router.put('/settings', express.json(), (req, res) => {
    const lang = String(req.body?.default_language || '').toLowerCase();
    if (!ALLOWED_LANGS.has(lang)) {
      return res.status(400).json({ error: 'bad_language', allowed: [...ALLOWED_LANGS] });
    }
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('default_language', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(lang);
    res.json({ ok: true, default_language: lang });
  });

  return router;
}

module.exports = { buildPublicSettingsRouter, buildAdminSettingsRouter, buildUserLanguageRouter, getDefaultLanguage, getEffectiveLanguage };
