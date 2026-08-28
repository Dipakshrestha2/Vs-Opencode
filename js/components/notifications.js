import { getState } from '../state.js';
import { fetchAll, updateRecord, getSupabase } from '../api.js';
import { showToast } from './toast.js';

function badge() {
  return document.getElementById('notif-count');
}

export async function refreshBadge() {
  const profile = getState().profile;
  const client = getSupabase();
  const el = badge();
  if (!profile || !el) return;
  if (!client) { el.style.display = 'none'; return; }
  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('is_read', false);
  if (error) return;
  el.textContent = count || 0;
  el.style.display = count > 0 ? 'flex' : 'none';
}

async function markRead(id) {
  const res = await updateRecord('notifications', id, { is_read: true });
  if (res.error) { showToast(res.error.message || 'Could not update notification', 'danger'); return false; }
  return true;
}

export async function markAllRead() {
  const profile = getState().profile;
  const client = getSupabase();
  if (!profile || !client) return;
  const { error } = await client
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', profile.id)
    .eq('is_read', false);
  if (error) { showToast(error.message || 'Could not update notifications', 'danger'); return false; }
  await refreshBadge();
  return true;
}

export async function renderNotificationsPage(container) {
  document.getElementById('page-title').textContent = 'Notifications';
  const profile = getState().profile;

  container.innerHTML = `
    <div class="section-header">
      <h2>Notifications</h2>
      <button class="btn btn-primary" id="notif-mark-all">Mark all read</button>
    </div>
    <div class="card"><div class="card-body" id="notif-list"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  const listEl = document.getElementById('notif-list');

  const { data, error } = profile
    ? await fetchAll('notifications', { user_id: profile.id }, 'id, title, message, type, link, is_read, created_at')
    : { data: null, error: { message: 'No profile' } };

  if (error || !data) {
    listEl.innerHTML = '<p style="color:var(--color-gray);">No notifications available.</p>';
  } else if (!data.length) {
    listEl.innerHTML = '<p style="color:var(--color-gray);">You have no notifications. 🎉</p>';
  } else {
    listEl.innerHTML = data
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(n => `
        <div class="recent-item notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
          <div class="recent-icon">${iconFor(n.type)}</div>
          <div class="recent-info">
            <div class="recent-title">${n.title} ${n.is_read ? '' : '<span class="badge status-in_progress">new</span>'}</div>
            <div class="recent-meta">${n.message}</div>
            <div class="recent-meta" style="font-size:0.75rem;">${new Date(n.created_at).toLocaleString()}</div>
          </div>
          ${n.link ? `<a href="${n.link}" class="btn btn-sm btn-secondary" style="align-self:center;">Open</a>` : ''}
          ${n.is_read ? '' : `<button class="btn btn-sm btn-primary" data-mark-read="${n.id}" style="align-self:center;">Mark read</button>`}
        </div>`).join('');

    listEl.querySelectorAll('[data-mark-read]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await markRead(btn.dataset.markRead);
        if (ok) {
          btn.remove();
          const item = btn.closest('[data-id]');
          item?.classList.remove('unread');
          await refreshBadge();
        }
      });
    });
  }

  document.getElementById('notif-mark-all')?.addEventListener('click', async () => {
    const ok = await markAllRead();
    if (ok) { showToast('All notifications marked as read', 'success'); renderNotificationsPage(container); }
  });
}

function iconFor(type) {
  return {
    warning: '⚠️',
    success: '✅',
    danger: '⛔',
    task: '📌',
    feedback: '💬',
    result: '📊',
    homework: '📝',
    announcement: '📣',
    reminder: '⏰'
  }[type] || '🔔';
}

export function notificationRoute() {
  return '/notifications';
}