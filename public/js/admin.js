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
  const langBtns = document.querySelectorAll('.lang-btn');

  const { escapeHtml, avatarColor, initialsOf, toast, showModal, api } = window.UI;

  function render(users) {
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--text-faint)">${escapeHtml(t('admin.no_users'))}</td></tr>`;
      usersCount.textContent = t('admin.users_count_one', { n: 0 });
      return;
    }
    usersCount.textContent = t(users.length === 1 ? 'admin.users_count_one' : 'admin.users_count_other', { n: users.length });
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
                <div style="font-size:12px;color:var(--text-faint)">@${escapeHtml(u.username)} &middot; id ${u.id}</div>
              </div>
            </div>
          </td>
          <td><span class="pill ${u.role}">${escapeHtml(t(u.role === 'admin' ? 'admin.role.admin' : 'admin.role.user'))}</span></td>
          <td>${u.active ? `<span class="pill on">${escapeHtml(t('admin.pill.active'))}</span>` : `<span class="pill off">${escapeHtml(t('admin.pill.disabled'))}</span>`}</td>
          <td style="color:var(--text-dim);font-size:12px">${escapeHtml((u.created_at || '').slice(0, 10))}</td>
          <td>
            <div class="row-actions" style="justify-content:flex-end">
              <button data-act="rename" class="ghost">${escapeHtml(t('admin.act.rename'))}</button>
              <button data-act="reset"  class="ghost">${escapeHtml(t('admin.act.reset_pw'))}</button>
              <button data-act="role"   class="ghost">${escapeHtml(t(u.role === 'admin' ? 'admin.act.demote' : 'admin.act.promote'))}</button>
              <button data-act="toggle" class="ghost">${escapeHtml(t(u.active ? 'admin.act.disable' : 'admin.act.enable'))}</button>
              <button data-act="delete" class="danger">${escapeHtml(t('admin.act.delete'))}</button>
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
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger)">${escapeHtml(t('admin.err.load_failed', { err: e.message }))}</td></tr>`;
    }
  }
  async function patch(id, body) {
    try { await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); await load(); }
    catch (e) { toast(t('admin.toast.update_failed', { err: e.message }), 'error'); }
  }
  async function del(id) {
    await showModal({
      title: t('admin.modal.delete.title'),
      body: `
        <p style="color:var(--text-dim);margin:0 0 12px">${escapeHtml(t('admin.modal.delete.body'))}</p>
        <div class="form-row"><label>${t('admin.modal.delete.confirm')}</label><input name="confirm" required pattern="DELETE"></div>
      `,
      primaryLabel: t('admin.modal.delete.primary'),
      onSubmit: async (data) => {
        if (data.confirm !== 'DELETE') throw new Error(t('admin.modal.delete.err_mismatch'));
        try {
          await api(`/api/admin/users/${id}`, { method: 'DELETE' });
          return true;
        } catch (e) {
          if (e.message === 'cannot_delete_self') throw new Error(t('admin.modal.delete.err_self'));
          if (e.message === 'last_admin') throw new Error(t('admin.modal.delete.err_last_admin'));
          throw new Error(t('admin.modal.delete.err_generic'));
        }
      },
    });
    toast(t('admin.toast.deleted'), 'success');
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
      toast(t('admin.toast.user_created', { name: body.username }), 'success');
      await load();
    } catch (e) {
      const map = {
        bad_username: t('admin.err.bad_username'),
        password_too_short: t('admin.err.password_too_short'),
        username_taken: t('admin.err.username_taken'),
      };
      addErr.textContent = map[e.message] || t('admin.toast.create_failed', { err: e.message });
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
        title: t('admin.modal.rename.title'),
        body: `<div class="form-row"><label>${escapeHtml(t('admin.modal.rename.label'))}</label><input name="display_name" required maxlength="32"></div>`,
        primaryLabel: t('common.save'),
        onSubmit: async (data) => { await patch(id, { display_name: data.display_name.trim() }); return true; },
      });
      if (r) toast(t('admin.toast.renamed'), 'success');
    } else if (act === 'reset') {
      const r = await showModal({
        title: t('admin.modal.reset.title'),
        body: `<div class="form-row"><label>${escapeHtml(t('admin.modal.reset.label'))}</label><input name="password" type="password" required minlength="8" autocomplete="new-password"></div>`,
        primaryLabel: t('admin.modal.reset.primary'),
        onSubmit: async (data) => {
          if (data.password.length < 8) throw new Error(t('admin.modal.reset.err_short'));
          await patch(id, { password: data.password });
          return true;
        },
      });
      if (r) toast(t('admin.toast.password_reset'), 'success');
    } else if (act === 'role') {
      const cur = tr.querySelector('.pill').textContent.trim();
      const next = cur === t('admin.role.admin') ? 'user' : 'admin';
      if (next === 'user') {
        await showModal({
          title: t('admin.modal.demote.title'),
          body: `<p style="color:var(--text-dim);margin:0 0 8px">${escapeHtml(t('admin.modal.demote.body'))}</p>`,
          primaryLabel: t('admin.modal.demote.primary'),
          onSubmit: async () => { await patch(id, { role: 'user' }); return true; },
        });
        toast(t('admin.toast.demoted'), 'success');
      } else {
        await patch(id, { role: 'admin' });
        toast(t('admin.toast.promoted'), 'success');
      }
    } else if (act === 'toggle') {
      const isActive = tr.querySelectorAll('.pill')[1]?.textContent.trim() === t('admin.pill.active');
      if (isActive) {
        await showModal({
          title: t('admin.modal.disable.title'),
          body: `<p style="color:var(--text-dim);margin:0 0 8px">${escapeHtml(t('admin.modal.disable.body'))}</p>`,
          primaryLabel: t('admin.modal.disable.primary'),
          onSubmit: async () => { await patch(id, { active: false }); return true; },
        });
        toast(t('admin.toast.disabled'), 'success');
      } else {
        await patch(id, { active: true });
        toast(t('admin.toast.enabled'), 'success');
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

  // ---- Language toggle ----
  function markActiveLang(lang) {
    langBtns.forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
  }
  langBtns.forEach((b) => {
    b.addEventListener('click', async () => {
      const lang = b.dataset.lang;
      try {
        const r = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ default_language: lang }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        window.setLang(lang);
        window.callI18n();
        markActiveLang(lang);
        toast(t('settings.saved'), 'success');
        // Re-render the table so the language switch is reflected in
        // role/active pills and action buttons.
        await load();
      } catch (e) {
        toast(t('admin.toast.update_failed', { err: e.message }), 'error');
      }
    });
  });

  // ---- Danger zone: bulk message admin ----
  // Two destructive operations gated by typed confirmation. We make the
  // user spell out the literal "DELETE MESSAGES" so a stray click on a
  // modal can't wipe history. The server enforces the same token.
  async function purgeMessages(act) {
    const isAll = act === 'purge-all';
    const title = t(isAll ? 'admin.danger.modal.all.title' : 'admin.danger.modal.keep5d.title');
    const bodyText = t(isAll ? 'admin.danger.modal.all.body' : 'admin.danger.modal.keep5d.body');
    const confirmKey = isAll ? 'admin.danger.modal.all.confirm' : 'admin.danger.modal.keep5d.confirm';
    const primary = t(isAll ? 'admin.danger.modal.all.primary' : 'admin.danger.modal.keep5d.primary');
    const endpoint = isAll ? '/api/admin/messages' : '/api/admin/messages/older-than/5';
    const bodyHtml = `
      <p style="color:var(--text-dim);margin:0 0 12px">${escapeHtml(bodyText)}</p>
      <div class="form-row">
        <label>${t(confirmKey)}</label>
        <input name="confirm" required pattern="DELETE MESSAGES" autocomplete="off">
      </div>
    `;
    let successResult = null;
    const result = await showModal({
      title, body: bodyHtml, primaryLabel: primary,
      onSubmit: async (data) => {
        if (data.confirm !== 'DELETE MESSAGES') throw new Error(t('admin.danger.modal.err_mismatch'));
        try {
          successResult = await api(endpoint, { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE MESSAGES' }) });
          return true; // truthy -> close the modal
        } catch (e) {
          if (e.message === 'bad_confirm') throw new Error(t('admin.danger.modal.err_mismatch'));
          if (e.message === 'bad_days') throw new Error(t('admin.danger.modal.err_bad_days'));
          throw new Error(t('admin.danger.modal.err_generic', { err: e.message }));
        }
      },
    });
    if (!result || !successResult) return; // cancelled
    // Show a success toast with what was actually removed.
    if (isAll) {
      toast(t('admin.danger.toast.all_done', { n: successResult.deleted, att: successResult.attachments_removed }), 'success');
    } else {
      toast(t('admin.danger.toast.keep5d_done', { n: successResult.deleted, kept: successResult.kept, att: successResult.attachments_removed }), 'success');
    }
  }

  document.querySelector('.admin .card.danger')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'purge-all' || act === 'purge-keep5d') purgeMessages(act);
  });

  // Highlight the current language as the default.
  markActiveLang(window.getLang());

  load();
})();
