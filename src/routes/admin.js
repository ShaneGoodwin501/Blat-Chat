// Admin routes: create, update, disable, delete users; bulk message admin.
const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireAdmin, hashPassword } = require('../auth');

function buildAdminRouter(db, getIo, dataDir) {
  const router = express.Router();

  router.use(requireAdmin);

  // Resolve the Socket.IO server lazily — by the time the first request
  // hits this router, `server.js` has already created it. Passing a getter
  // (rather than the instance) avoids a TDZ error during module wiring.
  function io() { return typeof getIo === 'function' ? getIo() : getIo; }

  // ---- Orphan-attachment cleanup helper ----
  // After bulk-deleting messages, find attachment rows that no longer
  // back any remaining message, delete the file on disk, then drop the row.
  // Returns the number of attachment files actually removed.
  function purgeOrphanAttachments() {
    const orphanIds = db.prepare(`
      SELECT id, filename FROM attachments
      WHERE id NOT IN (SELECT DISTINCT attachment_id FROM messages WHERE attachment_id IS NOT NULL)
    `).all();
    if (!orphanIds.length) return 0;
    const uploadsDir = dataDir ? path.join(dataDir, 'uploads') : null;
    const delFile = db.prepare('DELETE FROM attachments WHERE id = ?');
    let removed = 0;
    const tx = db.transaction((rows) => {
      for (const row of rows) {
        if (uploadsDir) {
          const fp = path.join(uploadsDir, row.filename);
          try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch { /* swallow; row still gets deleted */ }
        }
        delFile.run(row.id);
        removed++;
      }
    });
    tx(orphanIds);
    return removed;
  }

  // Emit a fresh "history" snapshot to every connected socket. The chat
  // client already handles this event by replacing the message list, so
  // a bulk delete "just works" on every connected client without any
  // per-message bookkeeping.
  function broadcastHistory() {
    const sio = io();
    if (!sio) return;
    const recent = db.prepare(`
      SELECT m.id, m.user_id, m.body, m.attachment_id, m.created_at,
             u.display_name, u.username, u.has_avatar,
             a.filename AS attachment_filename, a.original_name AS attachment_original, a.mime AS attachment_mime
      FROM messages m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN attachments a ON a.id = m.attachment_id
      ORDER BY m.id DESC
      LIMIT 50
    `).all().reverse();
    sio.emit('history', recent);
  }

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

  // ---- Bulk message admin ----
  // All-or-nothing confirmation token; client must echo it back. Prevents
  // accidental triggers (typos, double-clicks, misbehaving UI).
  // The same token is used for every variant so a stale UI prompt can't
  // approve a different delete by accident.
  function checkConfirmToken(req, res) {
    const expected = req.body?.confirm;
    if (expected !== 'DELETE MESSAGES') {
      res.status(400).json({ error: 'bad_confirm' });
      return false;
    }
    return true;
  }

  // Delete every message in the chat. Returns counts so the UI can
  // confirm what was actually removed.
  router.delete('/messages', express.json(), (req, res) => {
    if (!checkConfirmToken(req, res)) return;
    const before = db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
    db.prepare('DELETE FROM messages').run();
    const attachmentsRemoved = purgeOrphanAttachments();
    broadcastHistory();
    res.json({ ok: true, deleted: before, attachments_removed: attachmentsRemoved });
  });

  // Delete messages older than N days. Hardcoded variants we expose —
  // the client picks one and we validate it server-side. Keeping this
  // explicit (rather than `:days` param) means a client bug or a
  // tampered request can't mass-prune by surprise.
  const ALLOWED_OLDER_THAN = new Set([5, 30, 90, 365]);
  router.delete('/messages/older-than/:days', express.json(), (req, res) => {
    if (!checkConfirmToken(req, res)) return;
    const days = Number(req.params.days);
    if (!ALLOWED_OLDER_THAN.has(days)) return res.status(400).json({ error: 'bad_days' });
    // SQLite's datetime('now', '-N days') gives us a stable UTC string
    // we can compare against the stored datetime('now') default.
    const cutoff = db.prepare(`SELECT datetime('now', ? || ' days') AS c`).get(`-${days}`).c;
    const before = db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
    const info = db.prepare('DELETE FROM messages WHERE created_at < ?').run(cutoff);
    const attachmentsRemoved = purgeOrphanAttachments();
    const kept = before - info.changes;
    broadcastHistory();
    res.json({ ok: true, days, cutoff, deleted: info.changes, kept, attachments_removed: attachmentsRemoved });
  });

  return router;
}

module.exports = { buildAdminRouter };
