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
    btn.textContent = 'Signing in…';
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
      if (data.error === 'invalid_credentials') setError('Invalid username or password.');
      else if (data.error === 'too_many_attempts') setError('Too many attempts. Try again in a few minutes.');
      else if (data.error === 'missing_fields') setError('Please enter both username and password.');
      else setError('Sign-in failed. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Sign in';
    } catch (err) {
      setError('Network error. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });
})();
