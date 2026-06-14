// Auth routes: login, logout, current user.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { verifyPassword, requireAuth } = require('../auth');

function buildAuthRouter(db) {
  const router = express.Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 20,                  // 20 attempts per window per IP
    message: { error: 'too_many_attempts' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post('/login', loginLimiter, express.json(), (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!username || !password) return res.status(400).json({ error: 'missing_fields' });

    const user = db.prepare('SELECT id, username, password_hash, display_name, role, active FROM users WHERE username = ?').get(username);
    if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.displayName = user.display_name;
    res.json({ ok: true, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, username, display_name, role, active FROM users WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(401).json({ error: 'not_authenticated' });
    res.json({ user });
  });

  return router;
}

module.exports = { buildAuthRouter };
