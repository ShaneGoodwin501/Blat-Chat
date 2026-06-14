// Auth routes: login, logout, current user.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { hashPassword, verifyPassword, requireAuth } = require('../auth');

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

    const user = db.prepare('SELECT id, username, password_hash, display_name, role, active, has_avatar FROM users WHERE username = ?').get(username);
    if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.displayName = user.display_name;
    res.json({ ok: true, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role, has_avatar: !!user.has_avatar } });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, username, display_name, role, active, has_avatar FROM users WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(401).json({ error: 'not_authenticated' });
    res.json({ user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role, active: user.active, has_avatar: !!user.has_avatar } });
  });

  // POST /api/auth/password — change your own password.
  // Admins use the admin page; this is for self-service.
  router.post('/password', requireAuth, express.json(), (req, res) => {
    const oldPw = String(req.body?.old_password || '');
    const newPw = String(req.body?.new_password || '');
    if (newPw.length < 8) return res.status(400).json({ error: 'password_too_short' });
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.userId);
    if (!user || !verifyPassword(oldPw, user.password_hash)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPw), req.session.userId);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { buildAuthRouter };
