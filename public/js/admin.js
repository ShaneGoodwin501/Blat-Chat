// Admin page: list users, create new, edit/reset password, toggle active, delete.
(function () {
  const tbody = document.getElementById('usersBody');
  const addForm = document.getElementById('addUserForm');
  const addErr = document.getElementById('addUserErr');
  const logoutBtn = document.getElementById('logoutBtn');

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function api(path, opts = {}) {
    const r = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (r.status === 401) { window.location.href = '/login'; return null; }
    if (r.status === 403) { window.location.href = '/403'; return null; }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }

  function render(users) {
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text-faint)">No users yet.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr data-id="${u.id}">
        <td>${u.id}</td>
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.display_name)}</td>
        <td><span class="pill ${u.role}">${u.role}</span></td>
        <td>${u.active ? '✅' : '<span class="pill off">off</span>'}</td>
        <td>${escapeHtml((u.created_at || '').slice(0, 10))}</td>
        <td class="row-actions">
          <button data-act="rename">Rename</button>
          <button data-act="reset">Reset PW</button>
          <button data-act="role">${u.role === 'admin' ? 'Demote' : 'Promote'}</button>
          <button data-act="toggle">${u.active ? 'Disable' : 'Enable'}</button>
          <button class="danger" data-act="delete">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  async function load() {
    try {
      const data = await api('/api/admin/users');
      if (data) render(data.users);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger)">Failed to load: ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  async function patch(id, body) {
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      await load();
    } catch (e) {
      alert('Update failed: ' + e.message);
    }
  }

  async function del(id) {
    if (!confirm('Permanently delete this user and all their messages?')) return;
    try {
      await api(`/api/admin/users/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  }

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    addErr.textContent = '';
    const body = {
      username: addForm.username.value.trim(),
      display_name: addForm.display_name.value.trim(),
      password: addForm.password.value,
      role: addForm.role.value,
    };
    try {
      await api('/api/admin/users', { method: 'POST', body: JSON.stringify(body) });
      addForm.reset();
      await load();
    } catch (e) {
      const map = {
        bad_username: 'Username must be 3-32 letters/digits/_.-',
        password_too_short: 'Password must be at least 8 characters.',
        username_taken: 'That username is already in use.',
      };
      addErr.textContent = map[e.message] || ('Failed: ' + e.message);
    }
  });

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const tr = btn.closest('tr');
    const id = Number(tr.dataset.id);

    const act = btn.dataset.act;
    if (act === 'rename') {
      const name = prompt('New display name:');
      if (name != null) await patch(id, { display_name: name.trim() });
    } else if (act === 'reset') {
      const pw = prompt('New password (min 8 chars):');
      if (pw != null) await patch(id, { password: pw });
    } else if (act === 'role') {
      const cur = tr.querySelector('.pill').textContent.trim();
      const next = cur === 'admin' ? 'user' : 'admin';
      if (next === 'admin' || confirm(`Demote this user from admin to ${next}?`)) {
        await patch(id, { role: next });
      }
    } else if (act === 'toggle') {
      const cur = tr.children[4].textContent.trim();
      const nextActive = !(cur === '✅');
      if (!nextActive && !confirm('Disable this user? They will be signed out and unable to log in.')) return;
      await patch(id, { active: nextActive });
    } else if (act === 'delete') {
      await del(id);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  });

  load();
})();
