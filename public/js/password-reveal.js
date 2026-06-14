// Reusable "show password" eye toggle.
// Walks all input[type="password"] in `scope` (defaults to document) and
// wraps each one with a positioned eye button that toggles the field
// between password and text. Idempotent: already-wrapped inputs are skipped.
//
// Usage:
//   <script src="/js/password-reveal.js"></script>  // auto-wires the page
//   window.wirePasswordReveal(modalBackdrop)         // wire modals on creation

(function () {
  const EYE_OPEN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF  = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  function wire(input) {
    if (input.closest('.password-wrap')) return; // already wrapped
    const wrap = document.createElement('div');
    wrap.className = 'password-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'eye';
    btn.title = 'Show password';
    btn.setAttribute('aria-label', 'Show password');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = EYE_OPEN;
    wrap.appendChild(btn);

    function setShowing(show) {
      input.type = show ? 'text' : 'password';
      btn.classList.toggle('showing', show);
      btn.innerHTML = show ? EYE_OFF : EYE_OPEN;
      const label = show ? 'Hide password' : 'Show password';
      btn.title = label;
      btn.setAttribute('aria-label', label);
      // Keep the caret at the end after the type swap (some browsers reset it)
      try {
        const v = input.value;
        input.value = '';
        input.value = v;
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      } catch {}
    }

    btn.addEventListener('click', () => setShowing(input.type === 'password'));
  }

  window.wirePasswordReveal = function (scope) {
    (scope || document).querySelectorAll('input[type="password"]').forEach(wire);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.wirePasswordReveal());
  } else {
    window.wirePasswordReveal();
  }
})();
