// Chat client — modern UX (avatars, day separators, toasts, modal for password).
(function () {
  const messagesEl = document.getElementById('messages');
  const composer = document.getElementById('composer');
  const textInput = document.getElementById('textInput');
  const photoInput = document.getElementById('photoInput');
  const emojiBtn = document.getElementById('emojiBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const recordingIndicator = document.getElementById('recordingIndicator');
  const recordingTime = document.getElementById('recordingTime');
  const recordingCancel = document.getElementById('recordingCancel');
  const attachPreview = document.getElementById('attachPreview');
  const attachThumb = document.getElementById('attachThumb');
  const attachName = document.getElementById('attachName');
  const attachClear = document.getElementById('attachClear');
  const meAvatar = document.getElementById('meAvatar');
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
  // Render the current user's avatar into the header circle. Photo if
  // one is set, otherwise a coloured initial. Mirrors the same
  // fallback pattern as avatarHtml() so a 404 on the image is
  // handled gracefully.
  function renderMeAvatar() {
    if (!me) return;
    const display = me.display_name || me.username || 'user';
    const initial = initialsOf(display);
    const color = avatarColor(String(me.id) + ':' + display);
    meAvatar.style.background = color;
    if (me.has_avatar) {
      meAvatar.innerHTML = `<img src="${avatarUrl(me.id)}" alt="${escapeHtml(display)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:${JSON.stringify(initial)}}))">`;
    } else {
      meAvatar.textContent = initial;
    }
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

  // Format seconds as M:SS. Used by the voice player. Returns "0:00"
  // for non-finite or negative inputs (browser quirk for some codecs
  // before metadata loads).
  function formatDuration(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    const total = Math.floor(s);
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return m + ':' + (sec < 10 ? '0' + sec : sec);
  }

  // Update a voice player's visual state in sync with the <audio>
  // element. Called from the play/pause click and from the audio
  // element's native 'ended' / 'pause' / 'play' events (wired up in
  // wireVoicePlayer()).
  function setVoiceState(player, state) {
    if (!player) return;
    player.dataset.state = state;
    const btn = player.querySelector('.vp-btn');
    if (btn) {
      btn.dataset.state = state;
      btn.textContent = state === 'playing' ? '\u23F8' : '\u25B6';
      btn.setAttribute('aria-label', state === 'playing' ? 'Pause' : 'Play');
    }
  }

  // Pause every voice <audio> on the page except the one given. Called
  // before starting a new one, so we don't end up with two voice
  // messages playing on top of each other.
  function pauseAllVoiceExcept(except) {
    document.querySelectorAll('.voice-player audio').forEach((a) => {
      if (a !== except && !a.paused) {
        a.pause();
        const p = a.closest('.voice-player');
        if (p) setVoiceState(p, 'paused');
      }
    });
  }

  // Wire up the native <audio> events (timeupdate, ended, loadedmetadata)
  // to drive the visible UI. Called from a MutationObserver that
  // picks up voice players added by renderMessage(). This avoids
  // re-binding on every render — just bind once per player.
  function wireVoicePlayer(player) {
    if (!player || player._wired) return;
    player._wired = true;
    const audio = player.querySelector('audio');
    if (!audio) return;
    const btn = player.querySelector('.vp-btn');
    const timeEl = player.querySelector('[data-act="voice-time"]');
    const fillEl = player.querySelector('.vp-bar-fill');
    const trackEl = player.querySelector('[data-act="voice-seek"]');
    audio.addEventListener('loadedmetadata', () => {
      // Some browsers report NaN/Infinity for very short WebM blobs
      // until you seek to a real position. The duration label is
      // safe to update here; the seek bar's `duration` guard
      // already handles the NaN case.
      if (timeEl) timeEl.textContent = formatDuration(audio.duration);
    });
    audio.addEventListener('timeupdate', () => {
      if (timeEl) timeEl.textContent = formatDuration(audio.currentTime);
      if (fillEl && audio.duration && isFinite(audio.duration)) {
        const pct = (audio.currentTime / audio.duration) * 100;
        fillEl.style.width = pct + '%';
      }
      if (trackEl) trackEl.setAttribute('aria-valuenow', String(Math.floor((audio.currentTime / (audio.duration || 1)) * 100)));
    });
    audio.addEventListener('ended', () => {
      setVoiceState(player, 'paused');
      if (fillEl) fillEl.style.width = '0%';
      if (timeEl) timeEl.textContent = formatDuration(audio.duration);
      if (trackEl) trackEl.setAttribute('aria-valuenow', '0');
    });
    audio.addEventListener('play', () => { if (btn) btn.textContent = '\u23F8'; });
    audio.addEventListener('pause', () => { if (btn) btn.textContent = '\u25B6'; });
  }

  // Watch for new voice players being added (initial history + new
  // live messages) and wire them up.
  const voiceObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (!(n instanceof HTMLElement)) return;
        if (n.classList && n.classList.contains('voice-player')) {
          wireVoicePlayer(n);
        }
        // Also pick up nested players (shouldn't happen, but be safe).
        n.querySelectorAll && n.querySelectorAll('.voice-player').forEach(wireVoicePlayer);
      });
    }
  });
  voiceObserver.observe(messagesEl, { childList: true, subtree: true });

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
    const userStub = { id: m.user_id, display_name: display, username: m.username, has_avatar: m.has_avatar, online: m.online };
    // Small avatar that lives inside the bubble header. The shared
    // avatarHtml() builds the same 32px element; the bubble-header CSS
    // shrinks it to 20px so it sits neatly next to the nickname.
    const bubbleAvatarHtml = avatarHtml(userStub);

    let attachHtml = '';
    if (m.attachment_id && m.attachment_filename) {
      if (m.attachment_mime && m.attachment_mime.startsWith('image/')) {
        attachHtml += `<img class="attachment" src="/uploads/${encodeURIComponent(m.attachment_filename)}" alt="${escapeHtml(m.attachment_original || 'attachment')}" loading="lazy">`;
      } else if (m.attachment_mime && m.attachment_mime.startsWith('audio/')) {
        // Inline voice-message player. A hidden <audio> does the actual
        // playback (browsers handle codec, streaming, scrubbing, and
        // audio focus across tabs) — the visible UI is our own
        // play/pause button, progress bar, and duration label. The
        // clientId is the message ID, used so multiple players on the
        // page can be paused when a new one starts.
        const src = `/uploads/${encodeURIComponent(m.attachment_filename)}`;
        attachHtml += `
          <div class="voice-player" data-state="paused" data-msg-id="${m.id}">
            <button type="button" class="vp-btn" data-act="voice-toggle" data-state="paused" aria-label="Play">\u25B6</button>
            <div class="vp-track" data-act="voice-seek" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
              <div class="vp-bar"><div class="vp-bar-fill"></div></div>
            </div>
            <span class="vp-time" data-act="voice-time">0:00</span>
            <audio preload="metadata" src="${src}" data-msg-id="${m.id}"></audio>
          </div>
        `;
      } else {
        attachHtml += `<a class="attach-link" href="/uploads/${encodeURIComponent(m.attachment_filename)}" target="_blank" rel="noopener">\uD83D\uDCCE ${escapeHtml(m.attachment_original || 'file')}</a>`;
      }
    }

    // Layout: a single chat bubble per message. Own messages sit on the
    // right, others on the left (driven by .bubble.me). The bubble's
    // header carries a small avatar + nickname + time, so everything the
    // reader needs is contained inside one tidy card. No external avatar
    // column, no action chip, no hover buttons. For grouped messages
    // (same author within 2 min) the header is suppressed so consecutive
    // bubbles stack into a clean column.
    const isGroupedClass = grouped ? ' grouped' : '';
    const ownClass = isMe ? ' me' : '';
    const headerHtml = `
      <div class="bubble-header">
        ${bubbleAvatarHtml}
        <span class="bubble-name">${escapeHtml(display)}</span>
        <span class="bubble-time">${timeOf(m.created_at)}</span>
      </div>
    `;
    const row = document.createElement('div');
    row.className = `msg-row${isGroupedClass}${ownClass}`;
    row.dataset.id = m.id;
    row.dataset.userId = m.user_id;
    row.innerHTML = `<div class="bubble${ownClass}">${headerHtml}<div class="body">${m.body ? escapeHtml(m.body) : ''}${attachHtml}</div></div>`;
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
    renderMeAvatar();
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

  // Try to convert an image File to a compressed JPEG via canvas.
  // Returns a new File, or the original on failure (HEIC on Chrome, etc).
  // This bypasses the server-side sharp pipeline for the common case and
  // lets the browser handle whatever formats it can decode (incl. HEIC on
  // iOS Safari, which sharp can't).
  async function canvasCompress(file, maxEdge = 1600, quality = 0.85) {
    if (!file.type || !file.type.startsWith('image/')) return file;
    // Use a data: URL (not blob:) — our CSP has img-src 'self' data: only,
    // so blob: URLs get blocked when the canvas tries to load the image.
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('read failed'));
      r.readAsDataURL(file);
    });
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error('decode failed'));
        im.src = dataUrl;
      });
      let w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return file;
      if (w > maxEdge || h > maxEdge) {
        if (w >= h) { h = Math.round(h * maxEdge / w); w = maxEdge; }
        else { w = Math.round(w * maxEdge / h); h = maxEdge; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', quality);
      });
      const newName = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], newName, { type: 'image/jpeg' });
    } catch (e) {
      console.warn('[composer] canvas compress failed, uploading original', e);
      return file;
    }
  }

  // Show a quick "Uploading…" overlay on the composer preview while we POST.
  // Targets .composer-stack (the wrapper) because the attach-preview now
  // lives outside the <form> — see the HTML comment in index.html. The
  // disabled-state CSS is also re-scoped to .composer-stack (see style.css).
  function setUploadingState(on) {
    const stack = document.querySelector('.composer-stack');
    if (stack) stack.classList.toggle('uploading', !!on);
  }

  async function uploadPhoto(file) {
    const fd = new FormData();
    fd.append('photo', file, file.name || 'photo.jpg');
    setUploadingState(true);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
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
    } catch (e) {
      console.error('[composer] upload fetch failed', e);
      toast(t('chat.err.network'), 'error');
      return null;
    } finally {
      setUploadingState(false);
    }
  }

  // Show the preview IMMEDIATELY (using a data URL, not blob: URL — iOS
  // Safari often refuses to decode blob: URLs from <input type=file>).
  // Then upload in the background. If the upload fails, clear the preview.
  async function pickAndAttach(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast(t('chat.err.image_too_large'), 'error');
      photoInput.value = '';
      return;
    }
    // Quick preview so the user gets feedback that something happened.
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    if (!dataUrl) {
      toast(t('chat.err.read_failed'), 'error');
      photoInput.value = '';
      return;
    }
    pendingThumbUrl = dataUrl;
    attachThumb.onerror = () => {
      console.warn('[composer] preview failed to decode', file.type, file.size);
    };
    attachThumb.src = dataUrl;
    attachName.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
    attachPreview.classList.remove('hidden');

    // Try to compress via canvas (works for any browser-decodable format,
    // including HEIC on iOS Safari). Falls back to the original file.
    const toUpload = await canvasCompress(file);

    // Hold the preview in place until the upload completes; if the upload
    // fails, clear it so the user can try again.
    setUploadingState(true);
    let att = null;
    try {
      att = await uploadPhoto(toUpload);
    } finally {
      setUploadingState(false);
    }
    if (att) {
      pendingAttachment = { file, attachment: att };
    } else {
      clearAttachment();
    }
  }

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    pickAndAttach(file).catch((err) => {
      console.error('[composer] pickAndAttach failed', err);
      toast(t('chat.err.upload_failed'), 'error');
      clearAttachment();
    });
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
  messagesContainer.addEventListener('drop', (e) => {
    if (!isImageDrag(e)) return;
    e.preventDefault();
    dragDepth = 0;
    messagesEl.classList.remove('drag-over');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    pickAndAttach(file).catch((err) => {
      console.error('[composer] drop upload failed', err);
      toast(t('chat.err.upload_failed'), 'error');
      clearAttachment();
    });
  });

  // Paste-image support: paste a screenshot from clipboard.
  textInput.addEventListener('paste', (e) => {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items || []);
    const imageItem = items.find((it) => it.kind === 'file' && it.type && it.type.startsWith('image/'));
    if (!imageItem) return; // let the default paste behaviour handle text
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    pickAndAttach(file).catch((err) => {
      console.error('[composer] paste upload failed', err);
      toast(t('chat.err.upload_failed'), 'error');
      clearAttachment();
    });
  });

  attachClear.addEventListener('click', clearAttachment);

  // ---- Voice message recording ----
  // Mic button starts a recording immediately (no press-and-hold — tap
  // once to start, hit Send or the cancel ✕ to finish). The recording
  // state lives in `voiceState` so the submit handler can tell what's
  // happening. The audio is captured via MediaRecorder, uploaded as a
  // multipart Blob to /api/upload-audio, then sent through the same
  // `message` socket event as a photo attachment.
  const voiceState = {
    active: false,         // true between startRecording and stop/abort
    recorder: null,        // MediaRecorder instance
    stream: null,          // MediaStream (so we can stop the mic tracks)
    chunks: [],            // recorded Blob chunks
    startedAt: 0,          // performance.now() at start, for the timer
    tickHandle: null,      // setInterval handle for the timer label
    mime: '',              // MIME that MediaRecorder is actually using
    maxDurationMs: 5 * 60 * 1000, // hard cap = 5 minutes
  };

  // Pick the first supported MIME from this priority list. Different
  // browsers support different codecs; we record in whatever the
  // browser actually supports, then save that exact MIME in the
  // attachment row so the same <audio> element plays it back.
  function pickAudioMime() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    if (typeof MediaRecorder === 'undefined') return null;
    for (const m of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(m)) return m;
      } catch {}
    }
    return ''; // let MediaRecorder pick its default
  }

  function setRecordingUi(on) {
    const stack = document.querySelector('.composer-stack');
    if (stack) stack.classList.toggle('recording', !!on);
    if (recordingIndicator) recordingIndicator.classList.toggle('hidden', !on);
    if (voiceBtn) voiceBtn.classList.toggle('recording', !!on);
  }

  function startRecordingTimer() {
    voiceState.startedAt = performance.now();
    if (recordingTime) recordingTime.textContent = '0:00';
    if (voiceState.tickHandle) clearInterval(voiceState.tickHandle);
    voiceState.tickHandle = setInterval(() => {
      const elapsed = performance.now() - voiceState.startedAt;
      if (recordingTime) recordingTime.textContent = formatDuration(elapsed / 1000);
      // Auto-stop at the duration cap. The user could lose their
      // message if the timer stops the recorder and we don't catch
      // the resulting 'stop' event, but the catch is unconditional.
      if (elapsed >= voiceState.maxDurationMs) {
        stopRecordingAndSend();
      }
    }, 250);
  }

  function stopRecordingTimer() {
    if (voiceState.tickHandle) {
      clearInterval(voiceState.tickHandle);
      voiceState.tickHandle = null;
    }
  }

  function releaseMic() {
    if (voiceState.stream) {
      voiceState.stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      voiceState.stream = null;
    }
  }

  async function startRecording() {
    if (voiceState.active) return;
    if (pendingAttachment) {
      // Don't allow mixing a photo + voice message — clear the photo
      // first. (Voice messages don't carry a text body either.)
      clearAttachment();
    }
    if (textInput.value) {
      // Discard any typed text — the send button means "send voice",
      // not "send text". Visually clear it so the user sees the state.
      textInput.value = '';
      autoResize();
    }
    if (!window.isSecureContext) {
      toast(t('chat.voice.insecure_context'), 'error');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast(t('chat.voice.not_supported'), 'error');
      return;
    }
    const mime = pickAudioMime();
    if (mime === null) {
      toast(t('chat.voice.not_supported'), 'error');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      // NotAllowedError = user denied. NotFoundError = no mic.
      console.warn('[voice] getUserMedia failed', e);
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) {
        toast(t('chat.voice.permission_denied'), 'error');
      } else {
        toast(t('chat.voice.err.mic'), 'error');
      }
      return;
    }
    let recorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e) {
      // Some browsers throw if the mimeType isn't actually supported,
      // even when isTypeSupported returned true earlier. Fall back
      // with no mime and let the browser pick.
      console.warn('[voice] MediaRecorder ctor failed, retrying without mime', e);
      try { recorder = new MediaRecorder(stream); }
      catch (e2) {
        releaseMic();
        toast(t('chat.voice.not_supported'), 'error');
        return;
      }
    }
    voiceState.active = true;
    voiceState.recorder = recorder;
    voiceState.stream = stream;
    voiceState.chunks = [];
    voiceState.mime = recorder.mimeType || mime || 'audio/webm';
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) voiceState.chunks.push(e.data);
    };
    recorder.onstop = () => onRecorderStop();
    recorder.onerror = (e) => {
      console.error('[voice] MediaRecorder error', e);
      toast(t('chat.voice.err.mic'), 'error');
      cancelRecording();
    };
    setRecordingUi(true);
    startRecordingTimer();
    // Start without an explicit timeslice so we get a single blob on
    // stop (cleaner than slicing every second). The 5-minute cap is
    // enforced by the timer above, which calls stopRecordingAndSend().
    recorder.start();
  }

  function stopRecordingAndSend() {
    if (!voiceState.active || !voiceState.recorder) return;
    if (voiceState.recorder.state !== 'inactive') {
      try { voiceState.recorder.stop(); } catch (e) { console.warn('[voice] stop failed', e); }
    }
  }

  function cancelRecording() {
    if (!voiceState.active) return;
    if (voiceState.recorder && voiceState.recorder.state !== 'inactive') {
      try { voiceState.recorder.stop(); } catch {}
    }
    // Discard whatever chunks we accumulated.
    voiceState.chunks = [];
    voiceState.active = false;
    stopRecordingTimer();
    releaseMic();
    setRecordingUi(false);
  }

  async function onRecorderStop() {
    // Called once the recorder has flushed its last chunk and is
    // inactive. Upload what we have, then send the message. Always
    // clean up state, even on errors, so the user isn't stuck with
    // the recording UI.
    const chunks = voiceState.chunks;
    const mime = voiceState.mime || 'audio/webm';
    const duration = (performance.now() - voiceState.startedAt) / 1000;
    voiceState.active = false;
    voiceState.recorder = null;
    stopRecordingTimer();
    releaseMic();
    setRecordingUi(false);

    if (!chunks.length) {
      // User cancelled before any data, or browser produced no audio.
      return;
    }
    const blob = new Blob(chunks, { type: mime });
    if (blob.size > 10 * 1024 * 1024) {
      toast(t('chat.voice.too_long'), 'error');
      return;
    }
    if (!socket || !socket.connected) {
      toast(t('chat.err.disconnected'), 'error');
      return;
    }
    // Upload as multipart/form-data. The server will store the blob
    // and return an attachment row, which we then attach to a regular
    // chat message — same code path as a photo.
    const ext = (() => {
      const m = mime.toLowerCase();
      if (m.includes('webm')) return 'webm';
      if (m.includes('mp4')) return 'm4a';
      if (m.includes('ogg')) return 'ogg';
      if (m.includes('mpeg')) return 'mp3';
      if (m.includes('wav')) return 'wav';
      if (m.includes('aac')) return 'aac';
      return 'bin';
    })();
    const fd = new FormData();
    fd.append('audio', blob, `voice-${Date.now()}.${ext}`);
    fd.append('duration', String(Math.max(0, Math.round(duration))));
    fd.append('original_name', 'Voice message');
    let data;
    try {
      const r = await fetch('/api/upload-audio', { method: 'POST', body: fd, credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        console.error('[voice] upload failed', err);
        toast(t('chat.voice.err.upload_failed'), 'error');
        return;
      }
      data = await r.json();
    } catch (e) {
      console.error('[voice] upload fetch failed', e);
      toast(t('chat.voice.err.upload_failed'), 'error');
      return;
    }
    if (!data || !data.attachment || !data.attachment.id) {
      toast(t('chat.voice.err.upload_failed'), 'error');
      return;
    }
    // Send the message with the new attachment id, no body.
    socket.emit('message', { body: '', attachment_id: data.attachment.id }, (ack) => {
      if (ack && !ack.ok && ack.error) {
        if (ack.error === 'bad_attachment') toast(t('chat.err.bad_attachment'), 'error');
        else toast(t('chat.err.could_not_send'), 'error');
      }
    });
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      if (voiceState.active) {
        // Tap-during-recording: treat as stop+send. (The user can hit
        // Send or the cancel ✕ to abort, but tapping the mic again
        // should still be a sensible shortcut to finish.)
        stopRecordingAndSend();
      } else {
        startRecording();
      }
    });
  }
  if (recordingCancel) {
    recordingCancel.addEventListener('click', () => {
      cancelRecording();
    });
  }

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
    // Position above the composer so the popover shows just above the message
    // input row, never covering the messages. Anchor: popover's bottom edge sits
    // a few pixels above the composer's top edge; horizontally, align the left
    // edge with the emoji button.
    const btnRect = emojiBtn.getBoundingClientRect();
    const composerRect = composer.getBoundingClientRect();
    pop.style.left = btnRect.left + 'px';
    pop.style.bottom = (window.innerHeight - composerRect.top + 6) + 'px';
    // If the popover would overflow the right edge, push it back inside.
    const popRect = pop.getBoundingClientRect();
    if (popRect.right > window.innerWidth - 4) {
      pop.style.left = (window.innerWidth - popRect.width - 4) + 'px';
    }
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
    // If we're recording, the form submit is the user saying "I'm done,
    // send the voice message." Stop the recorder; the resulting
    // recording will be uploaded and sent via the MediaRecorder's
    // 'stop' handler (see startRecording()).
    if (voiceState.active) {
      stopRecordingAndSend();
      return;
    }
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
        renderMeAvatar();
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
        renderMeAvatar();
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
  const typingIndicator = document.getElementById('typingIndicator');

  // Track which message IDs we know about and the oldest we've seen.
  let oldestId = null;
  let isLoadingOlder = false;
  let noMoreHistory = false;

  function isAtBottom() {
    // 24px tolerance so we still treat "almost at the bottom" as at-bottom.
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 24;
  }

  const scrollBottomBtn = document.getElementById('scrollBottomBtn');

  function updateScrollBottomBtn() {
    if (isAtBottom()) {
      scrollBottomBtn.classList.add('hidden');
    } else {
      scrollBottomBtn.classList.remove('hidden');
    }
  }

  // Scroll to the bottom, but only after any pending <img> elements in
  // the messages container finish loading. Each image that loads grows
  // scrollHeight, which would otherwise strand the user mid-chat.
  // Used both for the initial history load and for new image messages.
  function scrollToBottomWhenReady() {
    const pending = [...messagesEl.querySelectorAll('img')].filter(img => !img.complete);
    if (pending.length === 0) {
      scrollToBottom(false);
      scrollBottomBtn.classList.add('hidden');
      return;
    }
    let remaining = pending.length;
    const onSettle = () => {
      if (--remaining > 0) return;
      scrollToBottom(false);
      scrollBottomBtn.classList.add('hidden');
    };
    pending.forEach(img => {
      img.addEventListener('load', onSettle, { once: true });
      img.addEventListener('error', onSettle, { once: true });
    });
    // Safety net: if an image never fires load/error (rare, but
    // happens with data: URLs on some browsers), settle after 1.5s.
    setTimeout(() => {
      if (remaining > 0) {
        remaining = 0;
        scrollToBottom(false);
        scrollBottomBtn.classList.add('hidden');
      }
    }, 1500);
  }

  messagesEl.addEventListener('scroll', () => {
    // If the user scrolls all the way to the top, show the "Load older" button.
    if (messagesEl.scrollTop < 40 && oldestId && !isLoadingOlder && !noMoreHistory) {
      loadOlderBtn.classList.remove('hidden');
    } else {
      loadOlderBtn.classList.add('hidden');
    }
    // Show the round "scroll to latest" button whenever the user has
    // scrolled away from the bottom. Clicking it snaps back down and
    // re-engages auto-scroll.
    updateScrollBottomBtn();
  });

  scrollBottomBtn.addEventListener('click', () => {
    scrollToBottom();
    // After scrolling, the user is at the bottom — hide the button.
    scrollBottomBtn.classList.add('hidden');
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
        // If we were at the bottom before loading older, stay glued.
        if (isAtBottom()) scrollToBottom(false);
      });
    } else {
      isLoadingOlder = false;
      loadOlderBtn.disabled = false;
      loadOlderBtn.textContent = originalText;
    }
  });

  // ---- Per-message action wiring (copy, delete, voice player) ----
  messagesEl.addEventListener('click', (e) => {
    // Lightbox for image attachments
    const tImg = e.target;
    if (tImg && tImg.tagName === 'IMG' && tImg.classList && tImg.classList.contains('attachment')) {
      e.preventDefault();
      openLightbox(tImg.src, tImg.alt);
      return;
    }
    // Voice message play/pause toggle
    const voiceBtn = e.target.closest('button[data-act="voice-toggle"]');
    if (voiceBtn) {
      const player = voiceBtn.closest('.voice-player');
      if (!player) return;
      const audio = player.querySelector('audio');
      if (!audio) return;
      if (audio.paused) {
        // Pause any other playing voice messages first — only one
        // voice message plays at a time (matches WhatsApp / iMessage).
        pauseAllVoiceExcept(audio);
        audio.play().then(() => {
          setVoiceState(player, 'playing');
        }).catch((err) => {
          // Autoplay can fail if the user hasn't interacted with the
          // document yet. The first play needs a user gesture, which
          // a click satisfies, so this is rare — log for debugging.
          console.warn('[voice] play() rejected', err);
        });
      } else {
        audio.pause();
        setVoiceState(player, 'paused');
      }
      return;
    }
    // Voice message seek bar
    const seekTrack = e.target.closest('[data-act="voice-seek"]');
    if (seekTrack) {
      const player = seekTrack.closest('.voice-player');
      if (!player) return;
      const audio = player.querySelector('audio');
      if (!audio || !audio.duration || !isFinite(audio.duration)) return;
      const rect = seekTrack.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * audio.duration;
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
      // Wait for the DOM to be laid out, then for any inline images
      // to load, before scrolling to the bottom.
      requestAnimationFrame(scrollToBottomWhenReady);
      // Show the "Load older" button if we got the full page of history.
      if (rows.length >= 50 && !noMoreHistory) {
        loadOlderBtn.classList.remove('hidden');
      }
    });
    socket.on('message', (m) => {
      // Capture the user's scroll position BEFORE adding the new
      // message — adding it grows scrollHeight, which would make
      // isAtBottom() return false even if the user was pinned to
      // the bottom. The fix is to check first, then render, then
      // scroll if appropriate.
      const wasAtBottom = isAtBottom();
      renderMessage(m);
      oldestId = oldestId == null ? m.id : Math.min(oldestId, m.id);
      if (wasAtBottom) {
        // Use the image-aware scroll so the user lands on the bottom
        // of the fully-loaded image, not the bottom of the not-yet-
        // loaded placeholder.
        requestAnimationFrame(scrollToBottomWhenReady);
      } else {
        scrollBottomBtn.classList.remove('hidden');
      }
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
