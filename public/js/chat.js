// Chat client — modern UX (avatars, day separators, toasts, modal for password).
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
  const menuBtn = document.getElementById('menuBtn');
  const menuDropdown = document.getElementById('menuDropdown');
  const nickBtn = document.getElementById('nickBtn');
  const pwBtn = document.getElementById('pwBtn');
  const avatarMenuBtn = document.getElementById('avatarMenuBtn');
  const adminLink = document.getElementById('adminLink');
  const logoutBtn = document.getElementById('logoutBtn');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const toastStack = document.getElementById('toastStack');

  let me = null;
  let myAvatarVersion = 0; // bump on my own avatar change for cache-bust
  let pendingAttachment = null;
  let pendingThumbUrl = null; // blob URL of the current composer preview; revokee'd on clear/replace
  let socket = null;
  const knownMessageIds = new Set();
  let lastDayKey = null;
  let lastRenderedUserId = null;
  let lastRenderedTime = null;
  // Known users keyed by id — used to update avatars when presence
  // events arrive (e.g. someone uploads a new photo).
  const userById = new Map();

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Stable per-user color from a hash (used for initials fallback).
  function avatarColor(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const hue = Math.abs(h) % 360;
    return `linear-gradient(135deg, hsl(${hue} 70% 60%) 0%, hsl(${(hue + 40) % 360} 70% 50%) 100%)`;
  }
  function initialsOf(name) {
    const s = String(name || '?').trim();
    if (!s) return '?';
    const parts = s.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  // Cache-busted avatar URL for a given user id.
  function avatarUrl(userId) {
    return `/avatars/${encodeURIComponent(userId)}?v=${me && me.id === userId ? myAvatarVersion : 0}`;
  }
  function avatarHtml(user, opts = {}) {
    const display = opts.display_name || user.display_name || user.username || 'user';
    const initial = initialsOf(display);
    const color = avatarColor(String(user.id) + ':' + display);
    if (user.has_avatar) {
      return `<img class="avatar-img" src="${avatarUrl(user.id)}" alt="${escapeHtml(display)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'avatar fallback',textContent:${JSON.stringify(initial)},style:${JSON.stringify('background:' + color)}}))">`;
    }
    return `<div class="avatar fallback" style="background:${color}" aria-hidden="true">${escapeHtml(initial)}</div>`;
  }
  function dayKey(iso) {
    if (!iso) return '';
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : iso.slice(0, 10);
  }
  function dayLabel(iso) {
    if (!iso) return '';
    const today = new Date();
    const d = new Date(iso.replace(' ', 'T') + 'Z'); // treat DB time as UTC
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) return 'Today';
    const y = new Date(today); y.setDate(today.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function timeOf(iso) {
    if (!iso) return '';
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    if (!m) return iso;
    const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
    return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function renderMessage(m) {
    if (knownMessageIds.has(m.id)) return;
    knownMessageIds.add(m.id);

    const dKey = dayKey(m.created_at);
    if (dKey && dKey !== lastDayKey) {
      const sep = document.createElement('div');
      sep.className = 'day-sep';
      sep.textContent = dayLabel(m.created_at);
      messagesEl.appendChild(sep);
      lastDayKey = dKey;
      lastRenderedUserId = null;
      lastRenderedTime = null;
    }

    const isMe = me && m.user_id === me.id;
    // Group: same author as previous message within 2 min
    const sameAuthor = lastRenderedUserId === m.user_id;
    const minutesAgo = lastRenderedTime ? (Date.parse(m.created_at.replace(' ', 'T') + 'Z') - Date.parse(lastRenderedTime.replace(' ', 'T') + 'Z')) / 60000 : Infinity;
    const grouped = sameAuthor && minutesAgo < 2;

    const row = document.createElement('div');
    row.className = 'msg-row' + (isMe ? ' me' : '') + (grouped ? ' grouped' : '');

    const display = m.display_name || m.username || 'user';
    const initial = initialsOf(display);
    const color = avatarColor(String(m.user_id) + ':' + display);
    const userStub = { id: m.user_id, display_name: display, username: m.username, has_avatar: m.has_avatar };

    let avatarHtmlStr;
    if (isMe) {
      // Show the user's own avatar too (was a hidden spacer before).
      avatarHtmlStr = avatarHtml(userStub);
    } else if (grouped) {
      avatarHtmlStr = `<div class="avatar spacer" aria-hidden="true"></div>`;
    } else {
      avatarHtmlStr = avatarHtml(userStub);
    }

    let attachHtml = '';
    if (m.attachment_id && m.attachment_filename) {
      if (m.attachment_mime && m.attachment_mime.startsWith('image/')) {
        attachHtml += `<img class="attachment" src="/uploads/${encodeURIComponent(m.attachment_filename)}" alt="${escapeHtml(m.attachment_original || 'attachment')}" loading="lazy">`;
      } else {
        attachHtml += `<a class="attach-link" href="/uploads/${encodeURIComponent(m.attachment_filename)}" target="_blank" rel="noopener">📎 ${escapeHtml(m.attachment_original || 'file')}</a>`;
      }
    }
    const metaHtml = grouped ? '' : `
      <div class="meta">
        <span class="name">${escapeHtml(display)}</span>
        <span class="time">${timeOf(m.created_at)}</span>
      </div>
    `;

    // Layout: [avatar] [name+time on top, bubble below]. All messages
    // (including the user's own) sit on the left, with the avatar on
    // the far left. The bubble keeps its visual style for the message
    // body; only the body sits inside the bubble now.
    const isGroupedClass = grouped ? ' grouped' : '';
    const ownClass = isMe ? ' me' : '';
    row.className = `msg-row${isGroupedClass}`;
    row.innerHTML = `${avatarHtmlStr}<div class="msg-col${ownClass}">${metaHtml}<div class="body-wrap${ownClass}"><div class="body">${m.body ? escapeHtml(m.body) : ''}${attachHtml}</div></div></div>`;
    messagesEl.appendChild(row);

    lastRenderedUserId = m.user_id;
    lastRenderedTime = m.created_at;
  }

  function scrollToBottom(smooth = true) {
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }

  function toast(msg, kind = 'info') {
    const t = document.createElement('div');
    t.className = 'toast' + (kind === 'error' ? ' error' : kind === 'success' ? ' success' : '');
    t.textContent = msg;
    toastStack.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ---- Modal (used for password change) ----
  function showModal({ title, body, primaryLabel = 'Save', onSubmit }) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <h3>${escapeHtml(title)}</h3>
          <form id="modalForm" autocomplete="off">
            <div class="form-rows">${body}</div>
            <div class="err" id="modalErr"></div>
            <div class="form-actions">
              <button type="button" class="secondary" id="modalCancel">Cancel</button>
              <button type="submit">${escapeHtml(primaryLabel)}</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(backdrop);
      // Wire any password fields inside the modal with the show/hide eye.
      if (window.wirePasswordReveal) window.wirePasswordReveal(backdrop);
      const form = backdrop.querySelector('#modalForm');
      const err = backdrop.querySelector('#modalErr');
      const cancel = backdrop.querySelector('#modalCancel');
      const firstInput = form.querySelector('input,textarea,select');
      if (firstInput) setTimeout(() => firstInput.focus(), 50);

      const close = (val) => { backdrop.remove(); resolve(val); };
      cancel.addEventListener('click', () => close(null));
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(null); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        err.textContent = '';
        const data = {};
        new FormData(form).forEach((v, k) => { data[k] = v; });
        try {
          const result = await onSubmit(data, err);
          if (result === true || result === undefined) close(data);
          else if (typeof result === 'string') err.textContent = result;
        } catch (ex) {
          err.textContent = ex.message || 'Failed.';
        }
      });
    });
  }

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.add('hidden');
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  // Click any image attachment in the message list → open lightbox (not new tab).
  messagesEl.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.classList && t.classList.contains('attachment')) {
      e.preventDefault();
      openLightbox(t.src, t.alt);
    }
  });

  // ---- Menu (hamburger) ----
  function setMenuOpen(open) {
    menuDropdown.classList.toggle('hidden', !open);
    menuBtn.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMenuOpen(menuDropdown.classList.contains('hidden'));
  });
  document.addEventListener('click', (e) => {
    if (!menuDropdown.classList.contains('hidden')
        && !menuDropdown.contains(e.target)
        && !menuBtn.contains(e.target)) {
      setMenuOpen(false);
    }
  });
  // Close menu after clicking any item
  menuDropdown.addEventListener('click', (e) => {
    if (e.target.closest('button, a')) setMenuOpen(false);
  });

  // Global Escape: close lightbox first, then menu
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!lightbox.classList.contains('hidden')) { closeLightbox(); return; }
    if (!menuDropdown.classList.contains('hidden')) { setMenuOpen(false); return; }
  });

  async function loadMe() {
    const r = await fetch('/api/auth/me');
    if (r.status === 401) { window.location.href = '/login'; return null; }
    const data = await r.json();
    me = data.user;
    meLabel.textContent = me.display_name;
    if (me.role === 'admin') adminLink.classList.remove('hidden');
    return me;
  }

  function clearAttachment() {
    pendingAttachment = null;
    photoInput.value = '';
    if (pendingThumbUrl) { URL.revokeObjectURL(pendingThumbUrl); pendingThumbUrl = null; }
    attachPreview.classList.add('hidden');
    attachThumb.removeAttribute('src');
    attachName.textContent = '';
  }

  function setAttachment(file, attachment) {
    pendingAttachment = { file, attachment };
    if (pendingThumbUrl) URL.revokeObjectURL(pendingThumbUrl); // free the previous preview
    pendingThumbUrl = URL.createObjectURL(file);
    attachThumb.src = pendingThumbUrl;
    // NOTE: do NOT revoke the URL on onload — the browser re-decodes the image on
    // every reflow/repaint, and revoking here produces a broken-image icon.
    // The URL is released by clearAttachment() or when a new file replaces it.
    attachName.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
    attachPreview.classList.remove('hidden');
  }

  async function uploadPhoto(file) {
    const fd = new FormData();
    fd.append('photo', file);
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    if (r.status === 401) { window.location.href = '/login'; return null; }
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      if (err.error === 'bad_mime') toast('Only JPG, PNG, GIF, WebP allowed.', 'error');
      else if (err.error === 'too_large') toast('Image too large (max 5MB).', 'error');
      else toast('Upload failed.', 'error');
      return null;
    }
    const data = await r.json();
    return data.attachment;
  }

  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Image too large (max 5MB).', 'error'); photoInput.value = ''; return; }
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) { toast('Only JPG, PNG, GIF, WebP allowed.', 'error'); photoInput.value = ''; return; }
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
    if (!socket || !socket.connected) { toast('Disconnected. Reconnecting…', 'error'); return; }
    socket.emit('message', {
      body: text,
      attachment_id: pendingAttachment ? pendingAttachment.attachment.id : null,
    }, (ack) => {
      if (ack && ack.ok) {
        textInput.value = '';
        autoResize();
        clearAttachment();
      } else if (ack && ack.error) {
        if (ack.error === 'too_long') toast('Message too long.', 'error');
        else if (ack.error === 'bad_attachment') toast('Attachment expired. Re-attach and try again.', 'error');
        else toast('Could not send. Try again.', 'error');
      }
    });
  });

  // Profile photo: open the cropper
  avatarMenuBtn.addEventListener('click', async () => {
    if (typeof window.openAvatarCropper !== 'function') {
      toast('Photo uploader not loaded. Refresh and try again.', 'error');
      return;
    }
    const r = await window.openAvatarCropper({
      title: 'Profile photo',
      onSaved: (url) => {
        myAvatarVersion = Date.now();
        me.has_avatar = 1;
        toast('Profile photo updated.', 'success');
        if (socket && socket.connected) socket.emit('set_avatar', { has_avatar: true });
        // Force every already-rendered avatar image of mine to refresh
        document.querySelectorAll('img.avatar-img').forEach((im) => {
          // Bump the cache-buster query
          try {
            const u = new URL(im.src, location.origin);
            if (u.pathname === avatarUrl(me.id).split('?')[0] || im.alt === me.display_name) {
              im.src = avatarUrl(me.id);
            }
          } catch {}
        });
      },
      onRemoved: () => {
        me.has_avatar = 0;
        myAvatarVersion = Date.now();
        toast('Photo removed. Back to colourful initials.', 'success');
        if (socket && socket.connected) socket.emit('set_avatar', { has_avatar: false });
        document.querySelectorAll('img.avatar-img').forEach((im) => {
          // We can't tell ours apart from others by URL alone (cache-bust
          // differs); refresh any image, the broken ones re-render via
          // the onerror fallback.
          const u = new URL(im.src, location.origin);
          u.searchParams.set('v', '0'); // force 404 → onerror replaces
          im.src = u.toString();
        });
      },
    });
    if (r === null) return; // closed
  });

  // Nickname change via inline prompt (kept simple)
  nickBtn.addEventListener('click', () => {
    const cur = me ? me.display_name : '';
    const next = window.prompt('New nickname:', cur || '');
    if (next == null) return;
    if (!socket) return;
    socket.emit('set_display_name', next, (ack) => {
      if (ack && ack.ok) {
        me.display_name = ack.display_name;
        meLabel.textContent = ack.display_name;
        toast('Nickname updated.', 'success');
      } else toast('Could not change nickname.', 'error');
    });
  });

  // Password change via modal
  pwBtn.addEventListener('click', async () => {
    await showModal({
      title: 'Change your password',
      body: `
        <div class="form-row">
          <label for="pw_old">Current</label>
          <input id="pw_old" name="old_password" type="password" required autocomplete="current-password">
        </div>
        <div class="form-row">
          <label for="pw_new1">New</label>
          <input id="pw_new1" name="new_password" type="password" required minlength="8" autocomplete="new-password">
        </div>
        <div class="form-row">
          <label for="pw_new2">Confirm</label>
          <input id="pw_new2" name="confirm" type="password" required minlength="8" autocomplete="new-password">
        </div>
      `,
      primaryLabel: 'Update',
      onSubmit: async (data) => {
        if (data.new_password !== data.confirm) throw new Error('New passwords do not match.');
        if (data.new_password.length < 8) throw new Error('New password must be at least 8 characters.');
        const r = await fetch('/api/auth/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ old_password: data.old_password, new_password: data.new_password }),
        });
        if (r.ok) return true;
        const j = await r.json().catch(() => ({}));
        // Friendly messages — the raw error code isn't useful to a non-admin.
        if (r.status === 401 && j.error === 'not_authenticated') {
          throw new Error('Your session expired. Sign in again, then try changing your password.');
        }
        if (j.error === 'invalid_credentials') {
          throw new Error("That doesn't match your current password. Use the eye 👁 to double-check what you typed (the field may have been auto-filled).");
        }
        if (j.error === 'password_too_short') throw new Error('New password must be at least 8 characters.');
        throw new Error(j.error ? `Server: ${j.error}` : `Server returned ${r.status}.`);
      },
    });
    toast('Password updated.', 'success');
  });

  logoutBtn.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  });

  function connect() {
    socket = io({ withCredentials: true });
    socket.on('connect', () => { /* noop */ });
    socket.on('disconnect', () => toast('Disconnected. Reconnecting…', 'error'));
    socket.on('history', (rows) => {
      knownMessageIds.clear();
      messagesEl.innerHTML = '';
      lastDayKey = null;
      lastRenderedUserId = null;
      lastRenderedTime = null;
      rows.forEach(renderMessage);
      scrollToBottom(false);
    });
    socket.on('message', (m) => {
      renderMessage(m);
      scrollToBottom();
    });
    // Another user (or me) changed their display name or avatar.
    // Refresh already-rendered avatars for the user whose state changed.
    socket.on('presence', (p) => {
      if (!p || !p.user_id) return;
      // Refresh the avatar <img> for this user (force re-fetch).
      const target = `/avatars/${encodeURIComponent(p.user_id)}`;
      document.querySelectorAll(`img.avatar-img[src^="${target}"]`).forEach((im) => {
        const u = new URL(im.src, location.origin);
        if (p.has_avatar === false) {
          // Force 404 to trigger the onerror fallback
          u.searchParams.set('v', '0');
          im.src = u.toString();
        } else {
          // Re-fetch with cache-bust
          u.searchParams.set('v', String(Date.now()));
          im.src = u.toString();
        }
      });
    });
    socket.on('auth_required', () => { window.location.href = '/login'; });
  }

  (async function init() {
    await loadMe();
    if (me) connect();
  })();
})();
