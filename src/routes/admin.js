// Admin routes: create, update, disable, delete users.
const express = require('express');
const { requireAdmin, hashPassword } = require('../auth');

function buildAdminRouter(db) {
  const router = express.Router();

  router.use(requireAdmin);

  // List users
  router.get('/users', (req, res) => {
    const rows = db.prepare(`
      SELECT id, username, display_name, role, active, has_avatar, created_at
      FROM users ORDER BY id ASC
    `).all();
    res.json({ users: rows });
  });

  // Create user
  router.post('/users', express.json(), (req, res) => {
    const username = String(req.body?.username || '').trim();
    const display_name = String(req.body?.display_name || '').trim() || username;
    const password = String(req.body?.password || '');
    const role = req.body?.role === 'admin' ? 'admin' : 'user';
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) return res.status(400).json({ error: 'bad_username' });
    if (password.length < 8) return res.status(400).json({ error: 'password_too_short' });
    const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
    if (exists) return res.status(409).json({ error: 'username_taken' });
    const info = db.prepare(`
      INSERT INTO users (username, password_hash, display_name, role, active)
      VALUES (?, ?, ?, ?, 1)
    `).run(username, hashPassword(password), display_name, role);
    res.json({ ok: true, id: info.lastInsertRowid });
  });

  // Update user (display name, role, active, password reset)
  router.patch('/users/:id', express.json(), (req, res) => {
    const id = Number(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'not_found' });

    const updates = {};
    if (req.body?.display_name !== undefined) {
      const n = String(req.body.display_name).trim().slice(0, 32);
      if (!n) return res.status(400).json({ error: 'bad_display_name' });
      updates.display_name = n;
    }
    if (req.body?.role !== undefined) {
      if (!['user', 'admin'].includes(req.body.role)) return res.status(400).json({ error: 'bad_role' });
      // Don't allow the last admin to demote themselves
      if (user.role === 'admin' && req.body.role !== 'admin') {
        const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1").get().c;
        if (adminCount <= 1) return res.status(400).json({ error: 'last_admin' });
      }
      updates.role = req.body.role;
    }
    if (req.body?.active !== undefined) {
      const a = req.body.active ? 1 : 0;
      // Don't allow the last admin to disable themselves
      if (user.role === 'admin' && a === 0) {
        const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1").get().c;
        if (adminCount <= 1) return res.status(400).json({ error: 'last_admin' });
      }
      updates.active = a;
    }
    if (req.body?.password !== undefined) {
      const p = String(req.body.password);
      if (p.length < 8) return res.status(400).json({ error: 'password_too_short' });
      updates.password_hash = hashPassword(p);
    }

    const keys = Object.keys(updates);
    if (!keys.length) return res.json({ ok: true, unchanged: true });
    const setSql = keys.map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE users SET ${setSql} WHERE id = ?`).run(...keys.map(k => updates[k]), id);
    res.json({ ok: true });
  });

  // Hard delete (rare; we usually prefer disable)
  router.delete('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'not_found' });
    if (user.id === req.session.userId) return res.status(400).json({ error: 'cannot_delete_self' });
    if (user.role === 'admin') {
      const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
      if (adminCount <= 1) return res.status(400).json({ error: 'last_admin' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { buildAdminRouter };
