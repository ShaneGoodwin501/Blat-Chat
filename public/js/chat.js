// Chat client. Loads /api/auth/me, connects Socket.IO, renders messages,
// handles text + photo attachments, nickname change, sign-out.
(function () {
  const messagesEl = document.getElementById('messages');
  const composer = document.getElementById('composer');
  const textInput = document.getElementById('textInput');
  const photoInput = document.getElementById('photoInput');
  const attachPreview = document.getElementById('attachPreview');
  const attachThumb = document.getElementById('attachThumb');
  const attachName = document.getElementById('attachName');
  const attachClear = document.getElementById('attachClear');
  const meLabel = document.getElementById('meLabel');
  const nickBtn = document.getElementById('nickBtn');
  const adminLink = document.getElementById('adminLink');
  const logoutBtn = document.getElementById('logoutBtn');

  let me = null;
  let pendingAttachment = null;
  let socket = null;
  const knownMessageIds = new Set();

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(iso) {
    if (!iso) return '';
    // 'YYYY-MM-DD HH:MM:SS' (UTC) — render in local time
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    if (!m) return iso;
    const [, y, mo, d, h, mi] = m;
    const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
    const now = new Date();
    const sameDay = dt.toDateString() === now.toDateString();
    if (sameDay) {
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return dt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function renderMessage(m) {
    if (knownMessageIds.has(m.id)) return;
    knownMessageIds.add(m.id);
    const isMe = me && m.user_id === me.id;
    const div = document.createElement('div');
    div.className = 'msg' + (isMe ? ' me' : '');

    let attachHtml = '';
    if (m.attachment_id && m.attachment_filename) {
      if (m.attachment_mime && m.attachment_mime.startsWith('image/')) {
        attachHtml += `<img class="attachment" src="/uploads/${encodeURIComponent(m.attachment_filename)}" alt="${escapeHtml(m.attachment_original || 'attachment')}" loading="lazy">`;
      } else {
        attachHtml += `<a class="attach-link" href="/uploads/${encodeURIComponent(m.attachment_filename)}" target="_blank" rel="noopener">📎 ${escapeHtml(m.attachment_original || 'file')}</a>`;
      }
    }

    const safeBody = m.body ? `<div class="body">${escapeHtml(m.body)}${attachHtml}</div>` : (attachHtml ? `<div class="body">${attachHtml}</div>` : '');

    div.innerHTML = `
      <div class="meta">
        <span class="name">${escapeHtml(m.display_name || m.username || 'user')}</span>
        <span class="time">${formatTime(m.created_at)}</span>
      </div>
      ${safeBody}
    `;
    messagesEl.appendChild(div);
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  async function loadMe() {
    const r = await fetch('/api/auth/me');
    if (r.status === 401) { window.location.href = '/login'; return null; }
    const data = await r.json();
    me = data.user;
    meLabel.textContent = `Hi, ${me.display_name}`;
    if (me.role === 'admin') adminLink.classList.remove('hidden');
    return me;
  }

  function clearAttachment() {
    pendingAttachment = null;
    photoInput.value = '';
    attachPreview.classList.add('hidden');
    attachThumb.src = '';
    attachName.textContent = '';
  }

  function setAttachment(file, attachment) {
    pendingAttachment = { file, attachment };
    const url = URL.createObjectURL(file);
    attachThumb.src = url;
    attachThumb.onload = () => URL.revokeObjectURL(url);
    attachName.textContent = file.name;
    attachPreview.classList.remove('hidden');
  }

  async function uploadPhoto(file) {
    const fd = new FormData();
    fd.append('photo', file);
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    if (r.status === 401) { window.location.href = '/login'; return null; }
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      if (err.error === 'bad_mime') toast('Only image files (JPG/PNG/GIF/WebP) are allowed.');
      else if (err.error === 'too_large') toast('Image too large (max 5MB).');
      else toast('Upload failed.');
      return null;
    }
    const data = await r.json();
    return data.attachment;
  }

  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('Image too large (max 5MB).');
      photoInput.value = '';
      return;
    }
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
      toast('Only JPG, PNG, GIF, WebP allowed.');
      photoInput.value = '';
      return;
    }
    const att = await uploadPhoto(file);
    if (att) setAttachment(file, att);
    else photoInput.value = '';
  });

  attachClear.addEventListener('click', clearAttachment);

  function autoResize() {
    textInput.style.height = 'auto';
    textInput.style.height = Math.min(textInput.scrollHeight, 140) + 'px';
  }
  textInput.addEventListener('input', autoResize);
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      composer.requestSubmit();
    }
  });

  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text && !pendingAttachment) return;
    if (!socket || !socket.connected) {
      toast('Disconnected. Reconnecting…');
      return;
    }
    socket.emit('message', {
      body: text,
      attachment_id: pendingAttachment ? pendingAttachment.attachment.id : null,
    }, (ack) => {
      if (ack && ack.ok) {
        textInput.value = '';
        autoResize();
        clearAttachment();
      } else if (ack && ack.error) {
        if (ack.error === 'too_long') toast('Message too long.');
        else if (ack.error === 'bad_attachment') toast('Attachment expired. Re-attach and try again.');
        else toast('Could not send. Try again.');
      }
    });
  });

  nickBtn.addEventListener('click', () => {
    const cur = me ? me.display_name : '';
    const next = window.prompt('Set your nickname in chat:', cur || '');
    if (next == null) return;
    if (!socket) return;
    socket.emit('set_display_name', next, (ack) => {
      if (ack && ack.ok) {
        me.display_name = ack.display_name;
        meLabel.textContent = `Hi, ${me.display_name}`;
        toast('Nickname updated.');
      } else {
        toast('Could not change nickname.');
      }
    });
  });

  logoutBtn.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  });

  function connect() {
    socket = io({ withCredentials: true });
    socket.on('connect', () => { /* noop */ });
    socket.on('disconnect', () => toast('Disconnected.'));
    socket.on('history', (rows) => {
      knownMessageIds.clear();
      messagesEl.innerHTML = '';
      rows.forEach(renderMessage);
      scrollToBottom();
    });
    socket.on('message', (m) => {
      renderMessage(m);
      scrollToBottom();
    });
    socket.on('auth_required', () => { window.location.href = '/login'; });
  }

  (async function init() {
    await loadMe();
    if (me) connect();
  })();
})();
