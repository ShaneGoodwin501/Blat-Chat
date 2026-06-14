// Server-side settings. Today: just the default UI language (en/ru).
// The settings table is key-value; the language is one row.
//
// Routes:
//   GET  /api/settings/default-language  — public, no auth. Returns { language: 'en' }.
//   GET  /api/admin/settings             — admin, returns the full settings map.
//   PUT  /api/admin/settings             — admin, body { default_language: 'en'|'ru' }.

const express = require('express');
const { requireAdmin } = require('../auth');

const ALLOWED_LANGS = new Set(['en', 'ru']);

function getDefaultLanguage(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'default_language'").get();
  return row ? row.value : 'en';
}

function buildPublicSettingsRouter(db) {
  const router = express.Router();
  // No auth — the language is needed by /login and / before the user signs in.
  router.get('/default-language', (req, res) => {
    res.json({ language: getDefaultLanguage(db) });
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

module.exports = { buildPublicSettingsRouter, buildAdminSettingsRouter, getDefaultLanguage };
