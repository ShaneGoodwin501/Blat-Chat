// Real-time chat over Socket.IO.
// Authentication is via the express-session cookie (same site as the page).
// We attach a session parser so each socket knows which user it is.

function attachSockets(io, db, sessionMiddleware) {
  // Wrap session middleware so it works on the upgrade handshake.
  const wrap = sessionMiddleware;
  io.engine.use(wrap);
  io.use((socket, next) => {
    wrap(socket.request, {}, next);
  });

  io.on('connection', (socket) => {
    const sess = socket.request.session;
    if (!sess || !sess.userId) {
      socket.emit('auth_required');
      return socket.disconnect(true);
    }

    // Load current user
    const user = db.prepare('SELECT id, username, display_name, role, active, has_avatar FROM users WHERE id = ?').get(sess.userId);
    if (!user || !user.active) {
      socket.emit('auth_required');
      return socket.disconnect(true);
    }

    socket.data.user = user;

    // On connect, send the most recent 50 messages.
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
    socket.emit('history', recent);

    // Receive a new message
    socket.on('message', (payload, ack) => {
      try {
        const text = String(payload?.body || '').trim();
        const attachmentId = payload?.attachment_id ? Number(payload.attachment_id) : null;
        if (!text && !attachmentId) {
          return ack && ack({ error: 'empty' });
        }
        if (text.length > 4000) {
          return ack && ack({ error: 'too_long' });
        }
        if (attachmentId) {
          const att = db.prepare('SELECT id, filename, original_name, mime FROM attachments WHERE id = ? AND uploaded_by = ?').get(attachmentId, user.id);
          if (!att) return ack && ack({ error: 'bad_attachment' });
        }
        const info = db.prepare('INSERT INTO messages (user_id, body, attachment_id) VALUES (?, ?, ?)').run(user.id, text, attachmentId);
        const row = db.prepare(`
          SELECT m.id, m.user_id, m.body, m.attachment_id, m.created_at,
                 u.display_name, u.username, u.has_avatar,
                 a.filename AS attachment_filename, a.original_name AS attachment_original, a.mime AS attachment_mime
          FROM messages m
          JOIN users u ON u.id = m.user_id
          LEFT JOIN attachments a ON a.id = m.attachment_id
          WHERE m.id = ?
        `).get(info.lastInsertRowid);
        io.emit('message', row);
        ack && ack({ ok: true, id: info.lastInsertRowid });
      } catch (e) {
        console.error('socket message error', e);
        ack && ack({ error: 'server' });
      }
    });

    // Change own nickname
    socket.on('set_display_name', (name, ack) => {
      const clean = String(name || '').trim().slice(0, 32);
      if (!clean) return ack && ack({ error: 'empty' });
      db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(clean, user.id);
      user.display_name = clean;
      io.emit('presence', { user_id: user.id, display_name: clean });
      ack && ack({ ok: true, display_name: clean });
    });

    // Change own avatar (client emits after the upload succeeds)
    socket.on('set_avatar', (state, ack) => {
      const has = !!(state && state.has_avatar);
      db.prepare('UPDATE users SET has_avatar = ? WHERE id = ?').run(has ? 1 : 0, user.id);
      user.has_avatar = has;
      io.emit('presence', { user_id: user.id, has_avatar: has });
      ack && ack({ ok: true });
    });

    socket.on('disconnect', () => {
      // No-op: with HTTP polling + long-lived sessions, the socket can come back.
    });
  });
}

module.exports = { attachSockets };
