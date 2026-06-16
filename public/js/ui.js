// Shared UI primitives used across chat.js, admin.js, avatar-crop.js.
// Exposed on window.UI so all pages can use them without a module loader.
//
// Each function is small and well-tested in its original location; this
// file is a pure extract, not a behaviour change.

(function () {
  // ---- HTML escaping ----
  // Used everywhere a server-supplied string is rendered. We escape the
  // 5 XML entities; that's enough to defeat every XSS vector a chat
  // message can carry (no SVG, no MathML, no script).
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---- Avatar fallbacks (initials + stable colour from a seed) ----
  // The colour is deterministic per (user_id + display_name) so the
  // gradient stays the same across renders.
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

  // ---- Toasts ----
  // Push a transient message into the .toast-stack. Self-dismisses after
  // 3.2s. `kind` is 'info' (default), 'error', or 'success'.
  // The stack must contain one element with id 'toastStack'.
  function toast(msg, kind = 'info') {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const t = document.createElement('div');
    t.className = 'toast' + (kind === 'error' ? ' error' : kind === 'success' ? ' success' : '');
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ---- Modal: info / simple confirm (no form) ----
  // Single OK button. Used by the "Install app" instructions, the PWA
  // hint (legacy), and any "just a message" prompt. Returns a Promise
  // that resolves when the user dismisses (any way).
  //
  // IMPORTANT: the Escape listener is wired before the promise is
  // returned, and removed in the close() path. The previous version only
  // removed it on Escape press, so clicking outside or the OK button
  // leaked a document-level keydown handler every time a modal was
  // dismissed that way.
  function showInfoModal({ title, body }) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <h3>${escapeHtml(title)}</h3>
          <div class="form-rows">${body}</div>
          <div class="form-actions">
            <button type="button" class="secondary" id="infoModalOk">${escapeHtml(t('pwa.install.got_it'))}</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      function close() {
        document.removeEventListener('keydown', onKey);
        backdrop.remove();
        resolve();
      }
      backdrop.querySelector('#infoModalOk').addEventListener('click', close);
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
      document.addEventListener('keydown', onKey);
    });
  }

  // ---- Modal: form-based (used by change-password, rename, danger zone) ----
  // Returns a Promise that resolves with the FormData on submit, or
  // null on cancel.
  //
  // onSubmit(data, errEl) -> true | undefined => close with data
  //                       -> string           => show in errEl, keep open
  //                       -> throws Error     => show message, keep open
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
      if (window.wirePasswordReveal) window.wirePasswordReveal(backdrop);
      const form = backdrop.querySelector('#modalForm');
      const err = backdrop.querySelector('#modalErr');
      const cancel = backdrop.querySelector('#modalCancel');
      const firstInput = form.querySelector('input,textarea,select');
      if (firstInput) setTimeout(() => firstInput.focus(), 50);

      const onKey = (e) => { if (e.key === 'Escape') close(null); };
      function close(val) {
        document.removeEventListener('keydown', onKey);
        backdrop.remove();
        resolve(val);
      }
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
      document.addEventListener('keydown', onKey);
    });
  }

  // ---- API helper ----
  // Wraps fetch() with JSON content type, handles 401/403 redirects,
  // and throws on non-OK responses. The error message is the body's
  // `error` field so the caller can match on it.
  async function api(path, opts = {}) {
    const r = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (r.status === 401) { window.location.href = '/login'; throw new Error('not_authenticated'); }
    if (r.status === 403) { window.location.href = '/403'; throw new Error('forbidden'); }
    let data = {};
    try { data = await r.json(); } catch (_) { /* empty body */ }
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }

  window.UI = {
    escapeHtml,
    avatarColor,
    initialsOf,
    toast,
    showInfoModal,
    showModal,
    api,
  };
})();
