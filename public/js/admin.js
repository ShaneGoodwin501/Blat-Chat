// Admin page: list users, create new, edit/reset password, toggle active, delete.
// All edits use a modal (no more window.prompt chains).
(function () {
  const tbody = document.getElementById('usersBody');
  const addForm = document.getElementById('addUserForm');
  const addErr = document.getElementById('addUserErr');
  const usersCount = document.getElementById('usersCount');
  const menuBtn = document.getElementById('menuBtn');
  const menuDropdown = document.getElementById('menuDropdown');
  const logoutBtn = document.getElementById('logoutBtn');
  const toastStack = document.getElementById('toastStack');

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
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
    return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
  }
  function toast(msg, kind = 'info') {
    const t = document.createElement('div');
    t.className = 'toast' + (kind === 'error' ? ' error' : kind === 'success' ? ' success' : '');
    t.textContent = msg;
    toastStack.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  async function api(path, opts = {}) {
    const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (r.status === 401) { window.location.href = '/login'; return null; }
    if (r.status === 403) { window.location.href = '/403'; return null; }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }
  function showModal({ title, body, primaryLabel = 'Save', onSubmit }) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <h3>${escapeHtml(title)}</h3>
          <form id="modalForm" autocomplete="off">
            <div>${body}</div>
            <div class="err" id="modalErr"></div>
            <div class="form-actions">
              <button type="button" class="secondary" id="modalCancel">Cancel</button>
              <button type="submit">${escapeHtml(primaryLabel)}</button>
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

  function render(users) {
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-faint)">No users yet.</td></tr>';
      usersCount.textContent = '0 users';
      return;
    }
    usersCount.textContent = `${users.length} user${users.length === 1 ? '' : 's'}`;
    tbody.innerHTML = users.map(u => {
      const initial = initialsOf(u.display_name);
      const color = avatarColor(String(u.id) + ':' + u.display_name);
      return `
        <tr data-id="${u.id}">
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar" style="background:${color};width:30px;height:30px;font-size:11px">${escapeHtml(initial)}</div>
              <div>
                <div style="font-weight:500">${escapeHtml(u.display_name)}</div>
                <div style="font-size:12px;color:var(--text-faint)">@${escapeHtml(u.username)} · id ${u.id}</div>
              </div>
            </div>
          </td>
          <td><span class="pill ${u.role}">${u.role}</span></td>
          <td>${u.active ? '<span class="pill on">active</span>' : '<span class="pill off">disabled</span>'}</td>
          <td style="color:var(--text-dim);font-size:12px">${escapeHtml((u.created_at || '').slice(0, 10))}</td>
          <td>
            <div class="row-actions" style="justify-content:flex-end">
              <button data-act="rename" class="ghost">Rename</button>
              <button data-act="reset"  class="ghost">Reset PW</button>
              <button data-act="role"   class="ghost">${u.role === 'admin' ? 'Demote' : 'Promote'}</button>
              <button data-act="toggle" class="ghost">${u.active ? 'Disable' : 'Enable'}</button>
              <button data-act="delete" class="danger">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function load() {
    try {
      const data = await api('/api/admin/users');
      if (data) render(data.users);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger)">Failed to load: ${escapeHtml(e.message)}</td></tr>`;
    }
  }
  async function patch(id, body) {
    try { await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); await load(); }
    catch (e) { toast('Update failed: ' + e.message, 'error'); }
  }
  async function del(id) {
    await showModal({
      title: 'Delete user?',
      body: `
        <p style="color:var(--text-dim);margin:0 0 12px">This permanently removes the user and all their messages. Cannot be undone.</p>
        <div class="form-row"><label>Type <strong>DELETE</strong> to confirm</label><input name="confirm" required pattern="DELETE"></div>
      `,
      primaryLabel: 'Delete',
      onSubmit: async (data) => {
        if (data.confirm !== 'DELETE') throw new Error('Type DELETE to confirm.');
        try {
          await api(`/api/admin/users/${id}`, { method: 'DELETE' });
          return true;
        } catch (e) {
          if (e.message === 'cannot_delete_self') throw new Error('You cannot delete your own account here.');
          if (e.message === 'last_admin') throw new Error('Cannot delete the only remaining admin.');
          throw new Error(e.message || 'Delete failed.');
        }
      },
    });
    toast('User deleted.', 'success');
    await load();
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
      toast(`User '${body.username}' created.`, 'success');
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
      const r = await showModal({
        title: 'Rename user',
        body: `<div class="form-row"><label>Display name</label><input name="display_name" required maxlength="32"></div>`,
        primaryLabel: 'Save',
        onSubmit: async (data) => { await patch(id, { display_name: data.display_name.trim() }); return true; },
      });
      if (r) toast('Renamed.', 'success');
    } else if (act === 'reset') {
      const r = await showModal({
        title: 'Reset password',
        body: `<div class="form-row"><label>New password (min 8)</label><input name="password" type="password" required minlength="8" autocomplete="new-password"></div>`,
        primaryLabel: 'Set password',
        onSubmit: async (data) => {
          if (data.password.length < 8) throw new Error('Min 8 characters.');
          await patch(id, { password: data.password });
          return true;
        },
      });
      if (r) toast('Password reset.', 'success');
    } else if (act === 'role') {
      const cur = tr.querySelector('.pill').textContent.trim();
      const next = cur === 'admin' ? 'user' : 'admin';
      if (next === 'user') {
        await showModal({
          title: 'Demote to user?',
          body: `<p style="color:var(--text-dim);margin:0 0 8px">They'll keep their account but lose admin access (and the Admin link in the header).</p>`,
          primaryLabel: 'Demote',
          onSubmit: async () => { await patch(id, { role: 'user' }); return true; },
        });
        toast('Demoted.', 'success');
      } else {
        await patch(id, { role: 'admin' });
        toast('Promoted to admin.', 'success');
      }
    } else if (act === 'toggle') {
      const isActive = tr.querySelectorAll('.pill')[1]?.textContent.trim() === 'active';
      if (isActive) {
        await showModal({
          title: 'Disable user?',
          body: `<p style="color:var(--text-dim);margin:0 0 8px">They'll be signed out and unable to log in. Their messages stay. You can re-enable later.</p>`,
          primaryLabel: 'Disable',
          onSubmit: async () => { await patch(id, { active: false }); return true; },
        });
        toast('Disabled.', 'success');
      } else {
        await patch(id, { active: true });
        toast('Enabled.', 'success');
      }
    } else if (act === 'delete') {
      await del(id);
    }
  });

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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menuDropdown.classList.contains('hidden')) setMenuOpen(false);
  });

  logoutBtn.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  });

  load();
})();
