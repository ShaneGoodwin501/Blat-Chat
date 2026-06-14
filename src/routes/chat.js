// REST endpoints for chat history and the bootstrap admin (if env-driven).
const express = require('express');
const { requireAuth } = require('../auth');

function buildChatRouter(db) {
  const router = express.Router();

  // GET /api/messages?before=<id>&limit=<n>
  // Returns up to `limit` messages older than `before` (or the latest if absent), ascending.
  router.get('/messages', requireAuth, (req, res) => {
    const before = req.query.before ? Number(req.query.before) : null;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    let rows;
    if (before) {
      rows = db.prepare(`
        SELECT m.id, m.user_id, m.body, m.attachment_id, m.created_at,
               u.display_name, u.username,
               a.filename AS attachment_filename, a.original_name AS attachment_original, a.mime AS attachment_mime
        FROM messages m
        JOIN users u ON u.id = m.user_id
        LEFT JOIN attachments a ON a.id = m.attachment_id
        WHERE m.id < ?
        ORDER BY m.id DESC
        LIMIT ?
      `).all(before, limit).reverse();
    } else {
      rows = db.prepare(`
        SELECT m.id, m.user_id, m.body, m.attachment_id, m.created_at,
               u.display_name, u.username,
               a.filename AS attachment_filename, a.original_name AS attachment_original, a.mime AS attachment_mime
        FROM messages m
        JOIN users u ON u.id = m.user_id
        LEFT JOIN attachments a ON a.id = m.attachment_id
        ORDER BY m.id DESC
        LIMIT ?
      `).all(limit).reverse();
    }
    res.json({ messages: rows });
  });

  return router;
}

module.exports = { buildChatRouter };
