import { getState } from '../state.js';
import { fetchAll, insertRecord, updateRecord, deleteRecord, isDemo } from '../api.js';
import { openModal, confirmDialog } from './modal.js';
import { renderForm } from './form.js';
import { showToast } from './toast.js';

export async function renderAnnouncementsPage(container) {
  document.getElementById('page-title').textContent = 'Announcements';
  const profile = getState().profile;
  const admin = profile?.role === 'admin';

  container.innerHTML = `
    <div class="section-header">
      <h2>Announcements</h2>
      ${admin ? '<button class="btn btn-primary" id="add-ann-btn">+ New Announcement</button>' : ''}
    </div>
    <div class="card"><div class="card-body" id="ann-list"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  const { data: list, error } = await fetchAll('announcements', {}, 'id, title, body, audience, published_at, created_at');

  const listEl = document.getElementById('ann-list');
  if (error || !list || !list.length) {
    listEl.innerHTML = '<p style="color:var(--color-gray);">No announcements yet.</p>';
  } else {
    listEl.innerHTML = list
      .sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at))
      .map(a => `
        <div class="announcement-item">
          <div class="recent-icon">📣</div>
          <div class="recent-info" style="flex:1;">
            <div class="recent-title">${a.title}</div>
            <div class="recent-meta">${new Date(a.published_at || a.created_at).toLocaleDateString()} · Audience: ${a.audience || 'all'}</div>
            <p style="margin-top:6px;color:var(--color-dark);">${(a.body || '').replace(/\n/g, '<br>')}</p>
          </div>
          ${admin ? `
            <div style="display:flex;gap:6px;align-self:center;">
              <button class="btn btn-sm btn-secondary" data-edit="${a.id}">Edit</button>
              <button class="btn btn-sm btn-danger" data-del="${a.id}">Delete</button>
            </div>` : ''}
        </div>`).join('');

    if (admin) {
      const listData = list;
      listEl.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => openForm(listData.find(x => x.id === btn.dataset.edit)));
      });
      listEl.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = listData.find(x => x.id === btn.dataset.del);
          confirmDialog('Delete Announcement', `Delete "${item?.title}"?`, async () => {
            if (!isDemo()) {
              const res = await deleteRecord('announcements', btn.dataset.del);
              if (res.error) { showToast(res.error.message || 'Delete failed', 'danger'); return; }
            }
            showToast('Announcement deleted', 'success');
            renderAnnouncementsPage(container);
          });
        });
      });
    }
  }

  document.getElementById('add-ann-btn')?.addEventListener('click', () => openForm());

  function openForm(item = null) {
    if (isDemo()) {
      showToast('Announcements require a configured database', 'info');
      return;
    }
    const formContainer = document.createElement('div');
    const close = openModal({ title: item ? 'Edit Announcement' : 'New Announcement', content: formContainer, size: 'md' });

    renderForm({
      container: formContainer,
      fields: [
        { key: 'title', label: 'Title', required: true },
        { key: 'body', label: 'Message', type: 'textarea', required: true },
        {
          key: 'audience', label: 'Audience', type: 'select', default: 'all',
          options: [
            { value: 'all', label: 'Everyone' },
            { value: 'head_teacher', label: 'Head Teachers only' },
            { value: 'teacher', label: 'Teachers only' },
            { value: 'parent', label: 'Parents only' }
          ]
        }
      ],
      values: item ? { title: item.title, body: item.body, audience: item.audience || 'all' } : {},
      onSubmit: async (data) => {
        const res = item
          ? await updateRecord('announcements', item.id, data)
          : await insertRecord('announcements', { ...data, created_by: profile?.id });
        if (res.error) {
          showToast(res.error.message || 'Failed to save announcement', 'danger');
          return;
        }
        showToast(item ? 'Announcement updated' : 'Announcement published', 'success');
        close();
        renderAnnouncementsPage(container);
      }
    });
  }
}

export async function latestAnnouncements(limit = 3) {
  const { data, error } = await fetchAll('announcements', {}, 'id, title, published_at');
  if (error || !data || !data.length) return [];
  return data.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0)).slice(0, limit);
}