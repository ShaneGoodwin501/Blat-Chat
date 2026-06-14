// Chat client — modern UX (avatars, day separators, toasts, modal for password).
(function () {
  const messagesEl = document.getElementById('messages');
  const composer = document.getElementById('composer');
  const textInput = document.getElementById('textInput');
  const photoInput = document.getElementById('photoInput');
  const emojiBtn = document.getElementById('emojiBtn');
  const attachPreview = document.getElementById('attachPreview');
  const attachThumb = document.getElementById('attachThumb');
  const attachName = document.getElementById('attachName');
  const attachClear = document.getElementById('attachClear');
  const meLabel = document.getElementById('meLabel');
  const menuBtn = document.getElementById('menuBtn');
  const menuDropdown = document.getElementById('menuDropdown');
  const nickBtn = document.getElementById('nickBtn');
  const pwBtn = document.getElementById('pwBtn');
  const langBtn = document.getElementById('langBtn');
  const notifBtn = document.getElementById('notifBtn');
  const notifBtnLabel = document.getElementById('notifBtnLabel');
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
  // The composer preview is a base64 data URL (from FileReader) — no manual revoke needed.
  let pendingThumbUrl = null;
  let socket = null;
  const knownMessageIds = new Set();
  let lastDayKey = null;
  let lastRenderedUserId = null;
  let lastRenderedTime = null;

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
    const onlineClass = user.online ? ' online' : '';
    // Wrap the img/initial in a div.avatar so the online dot can be
    // positioned relative to it.
    const inner = user.has_avatar
      ? `<img class="avatar-img" src="${avatarUrl(user.id)}" alt="${escapeHtml(display)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'avatar fallback',textContent:${JSON.stringify(initial)},style:${JSON.stringify('background:' + color)}}))">`
      : `<div class="avatar fallback" style="background:${color}" aria-hidden="true">${escapeHtml(initial)}</div>`;
    return `<div class="avatar avatar-wrap${onlineClass}">${inner}<span class="online-dot" title="${escapeHtml(t('common.online_indicator'))}"></span></div>`;
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
    if (sameDay) return t('chat.day.today');
    const y = new Date(today); y.setDate(today.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return t('chat.day.yesterday');
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

    const display = m.display_name || m.username || 'user';
    const initial = initialsOf(display);
    const color = avatarColor(String(m.user_id) + ':' + display);
    const userStub = { id: m.user_id, display_name: display, username: m.username, has_avatar: m.has_avatar, online: m.online };

    // Every message gets a real avatar. Even grouped (same author, within
    // 2 min) — only the name+time meta gets hidden for grouped messages;
    // the avatar stays so the user can always see who they're looking at.
    const avatarHtmlStr = avatarHtml(userStub);

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

    // Layout: [avatar] [name+time on top, bubble below]. Other users' messages
    // sit on the left with their avatar on the far left. The user's own
    // messages sit on the right (avatar on the right, bubble flush-right);
    // this is driven by the .me class on msg-row, which flex-reverses the row
    // and aligns the column to the right edge via .body-wrap.me and .msg-col.me.
    const isGroupedClass = grouped ? ' grouped' : '';
    const ownClass = isMe ? ' me' : '';
    row.className = `msg-row${isGroupedClass}${ownClass}`;
    row.dataset.id = m.id;
    row.dataset.userId = m.user_id;
    // Action buttons — only for own messages (or for admin, on any message).
    // Hidden by default; shown on row hover.
    const canDelete = isMe || (me && me.role === 'admin');
    const actionsHtml = canDelete ? `
      <div class="msg-actions">
        <button type="button" data-act="copy" title="${escapeHtml(t('chat.copy'))}" aria-label="${escapeHtml(t('chat.copy'))}">⎘</button>
        <button type="button" data-act="delete" class="danger" title="${escapeHtml(t('chat.delete'))}" aria-label="${escapeHtml(t('chat.delete'))}">×</button>
      </div>
    ` : '';
    row.innerHTML = `${actionsHtml}${avatarHtmlStr}<div class="msg-col${ownClass}">${metaHtml}<div class="body-wrap${ownClass}"><div class="body">${m.body ? escapeHtml(m.body) : ''}${attachHtml}</div></div></div>`;
    messagesEl.appendChild(row);

    lastRenderedUserId = m.user_id;
    lastRenderedTime = m.created_at;
  }

  // Render a tombstone for a deleted message.
  function removeMessage(id) {
    const row = messagesEl.querySelector(`.msg-row[data-id="${id}"]`);
    if (row) row.remove();
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
  function showModal({ title, body, primaryLabel, onSubmit }) {
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
              <button type="button" class="secondary" id="modalCancel">${escapeHtml(t('common.cancel'))}</button>
              <button type="submit">${escapeHtml(primaryLabel || t('common.save'))}</button>
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
          err.textContent = ex.message || t('misc.failed');
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
    pendingThumbUrl = null; // data URLs are GC'd with the string, no manual revoke
    attachThumb.onerror = null;
    attachPreview.classList.add('hidden');
    attachThumb.removeAttribute('src');
    attachName.textContent = '';
  }

  function setAttachment(file, attachment) {
    pendingAttachment = { file, attachment };
    pendingThumbUrl = null; // replaced below
    attachThumb.onerror = () => {
      console.warn('[composer] preview failed to decode', file && file.type, file && file.size);
      toast(t('chat.err.preview_failed'), 'error');
    };
    // Use a data URL (FileReader) instead of URL.createObjectURL — iOS Safari
    // frequently refuses to decode blob: URLs created from <input type=file>
    // files, showing a broken-image icon. Inline base64 works reliably.
    const reader = new FileReader();
    reader.onload = () => {
      pendingThumbUrl = reader.result; // data:image/...;base64,xxxx
      attachThumb.src = pendingThumbUrl;
    };
    reader.onerror = () => {
      console.warn('[composer] FileReader failed', file && file.type);
      toast(t('chat.err.read_failed'), 'error');
      clearAttachment();
    };
    reader.readAsDataURL(file);
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
      if (err.error === 'bad_mime') toast(t('chat.err.image_format'), 'error');
      else if (err.error === 'too_large') toast(t('chat.err.image_too_large'), 'error');
      else toast(t('chat.err.upload_failed'), 'error');
      return null;
    }
    const data = await r.json();
    return data.attachment;
  }

  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast(t('chat.err.image_too_large'), 'error'); photoInput.value = ''; return; }
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) { toast(t('chat.err.image_format'), 'error'); photoInput.value = ''; return; }
    const att = await uploadPhoto(file);
    if (att) setAttachment(file, att);
    else photoInput.value = '';
  });

  // ---- Drag-and-drop file upload ----
  // Drop a single image onto the messages area to attach it.
  // We accept image/* files and feed them through the same upload path
  // as the photo button.
  const messagesContainer = messagesEl.parentElement;
  let dragDepth = 0;
  function isImageDrag(e) {
    return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  }
  messagesContainer.addEventListener('dragenter', (e) => {
    if (!isImageDrag(e)) return;
    e.preventDefault();
    dragDepth++;
    messagesEl.classList.add('drag-over');
  });
  messagesContainer.addEventListener('dragover', (e) => {
    if (!isImageDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  messagesContainer.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) messagesEl.classList.remove('drag-over');
  });
  messagesContainer.addEventListener('drop', async (e) => {
    if (!isImageDrag(e)) return;
    e.preventDefault();
    dragDepth = 0;
    messagesEl.classList.remove('drag-over');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast(t('chat.err.image_too_large'), 'error'); return; }
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) { toast(t('chat.err.image_format'), 'error'); return; }
    const att = await uploadPhoto(file);
    if (att) setAttachment(file, att);
  });

  // Paste-image support: paste a screenshot from clipboard.
  textInput.addEventListener('paste', async (e) => {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items || []);
    const imageItem = items.find((it) => it.kind === 'file' && it.type && it.type.startsWith('image/'));
    if (!imageItem) return; // let the default paste behaviour handle text
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast(t('chat.err.image_too_large'), 'error'); return; }
    const att = await uploadPhoto(file);
    if (att) setAttachment(file, att);
  });

  attachClear.addEventListener('click', clearAttachment);

  // ---- Emoji picker ----
  // Common emoji set. The picker is a small popover above the button.
  // Tap an emoji to insert it at the cursor position in the textarea.
  const EMOJIS = [
    '\u{1F600}','\u{1F602}','\u{1F605}','\u{1F60A}','\u{1F60D}','\u{1F618}',
    '\u{1F61B}','\u{1F61C}','\u{1F61D}','\u{1F642}','\u{1F643}','\u{1F644}',
    '\u{1F914}','\u{1F928}','\u{1F62D}','\u{1F60E}','\u{1F913}','\u{1F929}',
    '\u{1F44D}','\u{1F44E}','\u{1F64C}','\u{1F64F}','\u{1F4AF}','\u{1F389}',
    '\u{1F525}','\u{2728}','\u{1F31F}','\u{1F4AA}','\u{1F3AF}','\u{1F680}',
    '\u{1F4AC}','\u{1F4AD}','\u{2764}','\u{1F9E1}','\u{1F49B}','\u{1F499}',
    '\u{1F60E}','\u{1F970}','\u{1F60C}','\u{1F609}','\u{1F60F}','\u{1F612}',
    '\u{1F389}','\u{1F38A}','\u{1F388}','\u{1F381}','\u{1F3B6}','\u{1F3B5}',
    '\u{2615}','\u{1F375}','\u{1F37B}','\u{1F377}','\u{1F354}','\u{1F35D}',
  ];
  let emojiPopover = null;
  function closeEmojiPopover() {
    if (emojiPopover) { emojiPopover.remove(); emojiPopover = null; }
  }
  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (emojiPopover) { closeEmojiPopover(); return; }
    const pop = document.createElement('div');
    pop.className = 'emoji-popover';
    pop.setAttribute('role', 'grid');
    EMOJIS.forEach((em) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emoji-opt';
      b.textContent = em;
      b.setAttribute('aria-label', 'Emoji ' + em);
      b.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        insertAtCursor(textInput, em);
        textInput.focus();
      });
      pop.appendChild(b);
    });
    document.body.appendChild(pop);
    // Position above the button
    const r = emojiBtn.getBoundingClientRect();
    pop.style.right = (window.innerWidth - r.right) + 'px';
    pop.style.bottom = (window.innerHeight - r.top + 6) + 'px';
    emojiPopover = pop;
    setTimeout(() => {
      document.addEventListener('click', closeEmojiPopover, { once: true });
    }, 0);
  });
  function insertAtCursor(input, text) {
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    const pos = start + text.length;
    input.setSelectionRange(pos, pos);
  }

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
    if (!socket || !socket.connected) { toast(t('chat.err.disconnected'), 'error'); return; }
    socket.emit('message', {
      body: text,
      attachment_id: pendingAttachment ? pendingAttachment.attachment.id : null,
    }, (ack) => {
      if (ack && ack.ok) {
        textInput.value = '';
        autoResize();
        clearAttachment();
      } else if (ack && ack.error) {
        if (ack.error === 'too_long') toast(t('chat.err.too_long'), 'error');
        else if (ack.error === 'bad_attachment') toast(t('chat.err.bad_attachment'), 'error');
        else toast(t('chat.err.could_not_send'), 'error');
      }
    });
  });

  // Profile photo: open the cropper
  avatarMenuBtn.addEventListener('click', async () => {
    if (typeof window.openAvatarCropper !== 'function') {
      toast(t('chat.err.avatar_not_loaded'), 'error');
      return;
    }
    const r = await window.openAvatarCropper({
      title: t('avatar.title'),
      onSaved: (url) => {
        myAvatarVersion = Date.now();
        me.has_avatar = 1;
        toast(t('chat.toast.profile_updated'), 'success');
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
        toast(t('chat.toast.profile_removed'), 'success');
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

  // ---- Browser push notifications ----
  // When the tab is hidden and a new message arrives, show a system
  // notification. User must opt in via the menu.
  function notifSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }
  function updateNotifLabel() {
    if (!notifBtn) return;
    if (!notifSupported()) { notifBtn.classList.add('hidden'); return; }
    if (Notification.permission === 'granted') {
      notifBtnLabel.textContent = t('chat.notif.disable');
      notifBtn.classList.add('notif-on');
    } else {
      notifBtnLabel.textContent = t('chat.notif.enable');
      notifBtn.classList.remove('notif-on');
    }
  }
  if (notifBtn) {
    notifBtn.addEventListener('click', async () => {
      if (!notifSupported()) return;
      if (Notification.permission === 'granted') {
        // We can't actually un-grant. Just show a hint.
        toast(t('chat.notif.denied'), 'info');
        return;
      }
      try {
        const r = await Notification.requestPermission();
        if (r === 'granted') {
          toast(t('chat.notif.granted'), 'success');
        } else {
          toast(t('chat.notif.denied'), 'error');
        }
      } catch (e) {
        toast(t('common.error'), 'error');
      }
      updateNotifLabel();
    });
    updateNotifLabel();
  }
  function showMessageNotification(m) {
    if (!notifSupported() || Notification.permission !== 'granted') return;
    // Don't notify for our own messages.
    if (me && m.user_id === me.id) return;
    // Don't notify if the tab is visible.
    if (document.visibilityState === 'visible') return;
    const body = m.body || (m.attachment_id ? t('chat.image_removed').replace('Image removed', 'Sent a photo') : '…');
    const title = t('chat.notif.new_message', { name: m.display_name || '?', body: '' });
    try {
      const n = new Notification(title, { body, tag: 'blatchat-' + (m.id || ''), silent: false });
      n.onclick = () => { window.focus(); n.close(); };
      setTimeout(() => n.close(), 8000);
    } catch {}
  }

  // Language picker — set or clear the per-user preference. The server
  // is the source of truth; the localStorage write in setLang() is just
  // a synchronous first-paint fallback.
  langBtn.addEventListener('click', async () => {
    const current = window.getLang();
    // Show a small picker: 3 options — auto, English, Russian.
    const choice = await showModal({
      title: t('menu.language'),
      body: `
        <div class="lang-picker">
          <button type="button" class="lang-option" data-lang="" data-i18n="menu.language_use_default">Use default</button>
          <button type="button" class="lang-option" data-lang="en">English</button>
          <button type="button" class="lang-option" data-lang="ru">Русский</button>
        </div>
        <p class="settings-help" style="margin-top:8px" data-i18n="settings.language_help">This sets the language used in menus and labels for all users. Messages you type can still be in any language.</p>
      `,
      primaryLabel: t('common.save'),
      onSubmit: async (data) => {
        // This modal returns a "choice" via a side-channel; instead we
        // attach click handlers below and resolve early.
        return false;
      },
    });
    // The modal's primary button is replaced by a custom 3-way picker.
    // Hide the default primary button and use the lang-option buttons.
    document.querySelectorAll('.lang-option').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const lang = btn.dataset.lang || null;
        try {
          const r = await fetch('/api/auth/preferred-language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: lang }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = await r.json();
          // The server returns the effective language (after applying the
          // override or falling back to the default). Apply immediately.
          window.setLang(j.language);
          window.callI18n();
          toast(t('common.saved'), 'success');
          // Close the modal by clicking the cancel button.
          document.getElementById('modalCancel')?.click();
        } catch (e) {
          toast(t('common.error'), 'error');
        }
      });
    });
  });

  // Nickname change via inline prompt (kept simple)
  nickBtn.addEventListener('click', () => {
    const cur = me ? me.display_name : '';
    const next = window.prompt(t('chat.prompt.nickname'), cur || '');
    if (next == null) return;
    if (!socket) return;
    socket.emit('set_display_name', next, (ack) => {
      if (ack && ack.ok) {
        me.display_name = ack.display_name;
        meLabel.textContent = ack.display_name;
        toast(t('chat.toast.nickname_updated'), 'success');
      } else toast(t('chat.toast.nickname_failed'), 'error');
    });
  });

  // Password change via modal
  pwBtn.addEventListener('click', async () => {
    await showModal({
      title: t('menu.change_password'),
      body: `
        <div class="form-row">
          <label for="pw_old">${escapeHtml(t('chat.password.current'))}</label>
          <input id="pw_old" name="old_password" type="password" required autocomplete="current-password">
        </div>
        <div class="form-row">
          <label for="pw_new1">${escapeHtml(t('chat.password.new'))}</label>
          <input id="pw_new1" name="new_password" type="password" required minlength="8" autocomplete="new-password">
        </div>
        <div class="form-row">
          <label for="pw_new2">${escapeHtml(t('chat.password.confirm'))}</label>
          <input id="pw_new2" name="confirm" type="password" required minlength="8" autocomplete="new-password">
        </div>
      `,
      primaryLabel: t('common.update'),
      onSubmit: async (data) => {
        if (data.new_password !== data.confirm) throw new Error(t('chat.password.mismatch'));
        if (data.new_password.length < 8) throw new Error(t('chat.password.too_short'));
        const r = await fetch('/api/auth/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ old_password: data.old_password, new_password: data.new_password }),
        });
        if (r.ok) return true;
        const j = await r.json().catch(() => ({}));
        // Friendly messages — the raw error code isn't useful to a non-admin.
        if (r.status === 401 && j.error === 'not_authenticated') {
          throw new Error(t('chat.password.session_expired'));
        }
        if (j.error === 'invalid_credentials') {
          throw new Error(t('chat.password.wrong_current'));
        }
        if (j.error === 'password_too_short') throw new Error(t('chat.password.too_short'));
        const base = j.error ? t('misc.server_err', { err: j.error }) : t('misc.server_status', { status: r.status });
        throw new Error(base);
      },
    });
    toast(t('chat.toast.password_updated'), 'success');
  });

  // ---- Scroll / load-older wiring ----
  const loadOlderBtn = document.getElementById('loadOlderBtn');
  const scrollBottomBtn = document.getElementById('scrollBottomBtn');
  const typingIndicator = document.getElementById('typingIndicator');

  // Track which message IDs we know about and the oldest we've seen.
  let oldestId = null;
  let isLoadingOlder = false;
  let noMoreHistory = false;
  // Track "stuck at bottom" state for the scroll-to-bottom FAB.
  let stuckAtBottom = true;

  function updateScrollUI() {
    if (stuckAtBottom) scrollBottomBtn.classList.add('hidden');
    else scrollBottomBtn.classList.remove('hidden');
  }

  function isAtBottom() {
    // 24px tolerance so we still treat "almost at the bottom" as at-bottom.
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 24;
  }

  messagesEl.addEventListener('scroll', () => {
    stuckAtBottom = isAtBottom();
    updateScrollUI();
    // If the user scrolls all the way to the top, show the "Load older" button.
    if (messagesEl.scrollTop < 40 && oldestId && !isLoadingOlder && !noMoreHistory) {
      loadOlderBtn.classList.remove('hidden');
    } else {
      loadOlderBtn.classList.add('hidden');
    }
  });

  loadOlderBtn.addEventListener('click', async () => {
    if (isLoadingOlder || !oldestId) return;
    isLoadingOlder = true;
    const originalText = loadOlderBtn.textContent;
    loadOlderBtn.disabled = true;
    loadOlderBtn.textContent = t('chat.loading_older');
    if (socket && socket.connected) {
      socket.emit('load_older', oldestId, (ack) => {
        isLoadingOlder = false;
        loadOlderBtn.disabled = false;
        loadOlderBtn.textContent = originalText;
        if (!ack || !ack.ok) {
          loadOlderBtn.classList.add('hidden');
          return;
        }
        if (!ack.messages || ack.messages.length === 0) {
          noMoreHistory = true;
          loadOlderBtn.classList.add('hidden');
          toast(t('chat.no_more_history'), 'info');
          return;
        }
        // Remember the scroll position so the inserted older messages
        // don't yank the user's view down.
        const prevHeight = messagesEl.scrollHeight;
        const prevTop = messagesEl.scrollTop;
        ack.messages.forEach(renderMessage);
        oldestId = ack.messages[0].id;
        if (ack.messages.length < 50) {
          noMoreHistory = true;
          loadOlderBtn.classList.add('hidden');
        } else {
          loadOlderBtn.classList.remove('hidden');
        }
        // Restore scroll position so the user sees the same messages.
        messagesEl.scrollTop = prevTop + (messagesEl.scrollHeight - prevHeight);
        // If we've never scrolled away from the bottom, stay glued.
        if (stuckAtBottom) scrollToBottom(false);
      });
    } else {
      isLoadingOlder = false;
      loadOlderBtn.disabled = false;
      loadOlderBtn.textContent = originalText;
    }
  });

  scrollBottomBtn.addEventListener('click', () => scrollToBottom(true));

  // ---- Per-message action wiring (copy, delete) ----
  messagesEl.addEventListener('click', (e) => {
    // Lightbox for image attachments
    const tImg = e.target;
    if (tImg && tImg.tagName === 'IMG' && tImg.classList && tImg.classList.contains('attachment')) {
      e.preventDefault();
      openLightbox(tImg.src, tImg.alt);
      return;
    }
    // Action button
    const btn = e.target.closest('button[data-act]');
    if (btn) {
      const row = btn.closest('.msg-row');
      if (!row) return;
      const id = Number(row.dataset.id);
      const act = btn.dataset.act;
      if (act === 'delete') {
        if (!confirm(t('chat.delete_confirm'))) return;
        if (socket && socket.connected) {
          socket.emit('delete_message', id, (ack) => {
            if (ack && ack.ok) {
              removeMessage(id);
            } else if (ack && ack.error) {
              toast(ack.error === 'forbidden' ? t('chat.delete') + ': ' + t('misc.failed') : t('misc.failed'), 'error');
            }
          });
        }
      } else if (act === 'copy') {
        const body = row.querySelector('.body');
        const text = body ? body.innerText.trim() : '';
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            () => toast(t('chat.copied'), 'success'),
            () => toast(t('misc.failed'), 'error')
          );
        } else {
          // Fallback for older browsers.
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); toast(t('chat.copied'), 'success'); }
          catch { toast(t('misc.failed'), 'error'); }
          ta.remove();
        }
      }
    }
  });

  // ---- Typing indicator ----
  // Track who is currently typing (user_id -> display_name + timer).
  const typingUsers = new Map();
  function renderTyping() {
    const list = [...typingUsers.values()];
    let text;
    if (list.length === 0) {
      text = '';
    } else if (list.length === 1) {
      text = t('chat.typing_one', { name: list[0] });
    } else if (list.length === 2) {
      text = t('chat.typing_two', { a: list[0], b: list[1] });
    } else {
      text = t('chat.typing_many');
    }
    if (text) {
      typingIndicator.textContent = text;
      typingIndicator.classList.remove('hidden');
    } else {
      typingIndicator.classList.add('hidden');
    }
  }
  function dropTypingAfter(userId, ms) {
    setTimeout(() => {
      if (typingUsers.delete(userId)) renderTyping();
    }, ms);
  }

  // Emit a typing event 800ms after the user starts typing, then refresh
  // every 2.5s while they continue typing. Stop the heartbeat and emit
  // stop_typing when the input is empty or 3s of inactivity.
  let typingEmitTimer = null;
  let typingHeartbeat = null;
  function emitTyping() {
    if (socket && socket.connected) socket.emit('typing');
  }
  function stopTyping() {
    if (typingHeartbeat) { clearInterval(typingHeartbeat); typingHeartbeat = null; }
    if (typingEmitTimer) { clearTimeout(typingEmitTimer); typingEmitTimer = null; }
    if (socket && socket.connected) socket.emit('stop_typing');
  }
  textInput.addEventListener('input', () => {
    if (!textInput.value.trim()) { stopTyping(); return; }
    if (!typingHeartbeat) {
      // Debounce: don't emit until 800ms of typing.
      if (typingEmitTimer) clearTimeout(typingEmitTimer);
      typingEmitTimer = setTimeout(() => {
        typingEmitTimer = null;
        emitTyping();
        typingHeartbeat = setInterval(emitTyping, 2500);
      }, 800);
    }
  });
  textInput.addEventListener('blur', stopTyping);
  composer.addEventListener('submit', stopTyping);

  logoutBtn.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  });

  function connect() {
    socket = io({ withCredentials: true });
    socket.on('connect', () => { /* noop */ });
    socket.on('disconnect', () => {
      toast(t('chat.err.disconnected'), 'error');
      // Mark all users as offline on disconnect.
      messagesEl.querySelectorAll('.avatar-wrap.online').forEach((el) => el.classList.remove('online'));
    });
    socket.on('history', (rows) => {
      knownMessageIds.clear();
      messagesEl.innerHTML = '';
      lastDayKey = null;
      lastRenderedUserId = null;
      lastRenderedTime = null;
      oldestId = rows.length ? rows[0].id : null;
      noMoreHistory = rows.length < 50;
      rows.forEach(renderMessage);
      scrollToBottom(false);
      stuckAtBottom = true;
      updateScrollUI();
      // Show the "Load older" button if we got the full page of history.
      if (rows.length >= 50 && !noMoreHistory) {
        loadOlderBtn.classList.remove('hidden');
      }
    });
    socket.on('message', (m) => {
      renderMessage(m);
      oldestId = oldestId == null ? m.id : Math.min(oldestId, m.id);
      // Auto-scroll only if the user was already at the bottom.
      if (stuckAtBottom) scrollToBottom();
      // Browser notification if the tab is hidden and user opted in.
      showMessageNotification(m);
    });
    socket.on('message_deleted', ({ id }) => {
      removeMessage(id);
      toast(t('chat.deleted'), 'info');
    });
    socket.on('typing', (p) => {
      if (!p || !p.user_id || (me && p.user_id === me.id)) return;
      typingUsers.set(p.user_id, p.display_name || '…');
      renderTyping();
      dropTypingAfter(p.user_id, 4000);
    });
    socket.on('stop_typing', (p) => {
      if (!p || !p.user_id) return;
      if (typingUsers.delete(p.user_id)) renderTyping();
    });
    socket.on('presence', (p) => {
      if (!p || !p.user_id) return;
      // Toggle the online class on every avatar wrapper for this user.
      const online = !!p.online;
      messagesEl.querySelectorAll(`.avatar-wrap`).forEach((el) => {
        // We don't have a direct user id on the wrapper, so we walk up
        // to the row and match by data-user-id.
        const row = el.closest('.msg-row');
        if (row && Number(row.dataset.userId) === p.user_id) {
          el.classList.toggle('online', online);
        }
      });
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
