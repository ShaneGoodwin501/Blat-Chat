// Login flow. POST /api/auth/login, then redirect to /.
(function () {
  const form = document.getElementById('loginForm');
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  function setError(msg) {
    errEl.textContent = msg || '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');
    btn.disabled = true;
    btn.textContent = t('login.submitting');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: document.getElementById('username').value.trim(),
          password: document.getElementById('password').value,
        }),
      });
      if (r.ok) {
        window.location.href = '/';
        return;
      }
      const data = await r.json().catch(() => ({}));
      if (data.error === 'invalid_credentials') setError(t('login.err.invalid_credentials'));
      else if (data.error === 'too_many_attempts') setError(t('login.err.too_many_attempts'));
      else if (data.error === 'missing_fields') setError(t('login.err.missing_fields'));
      else setError(t('login.err.generic'));
      btn.disabled = false;
      btn.textContent = t('login.submit');
    } catch (err) {
      setError(t('login.err.network'));
      btn.disabled = false;
      btn.textContent = t('login.submit');
    }
  });
})();
