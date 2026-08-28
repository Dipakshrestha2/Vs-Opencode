import { getState } from '../state.js';
import { fetchAll, insertRecord, isDemo } from '../api.js';
import { openModal } from './modal.js';
import { renderForm } from './form.js';
import { showToast } from './toast.js';

export async function openTaskComments(taskId, title) {
  const profile = getState().profile;
  const demo = isDemo();

  const content = document.createElement('div');
  const close = openModal({ title: title ? `Comments · ${title}` : 'Task Comments', content, size: 'md' });

  content.innerHTML = `
    <div style="max-height:360px;overflow-y:auto;margin-bottom:14px;" id="task-comment-list"></div>
    <div id="task-comment-add"></div>`;

  const list = content.querySelector('#task-comment-list');
  list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  const { data } = await fetchAll('task_comments', { task_id: taskId }, 'id, message, user_id, created_at, profiles!task_comments_user_id_fkey(full_name)')
    .catch(() => ({ data: [] }));
  const comments = data || [];

  list.innerHTML = comments.length
    ? comments
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(c => `
          <div style="background:#F7F9FC;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
            <div style="font-size:0.8rem;color:var(--color-gray);">${c.profiles?.full_name || 'User'} · ${new Date(c.created_at).toLocaleString()}</div>
            <div style="font-size:0.9rem;margin-top:2px;">${(c.message || '').replace(/\n/g, '<br>')}</div>
          </div>`).join('')
    : '<p style="color:var(--color-gray);">No comments yet.</p>';

  renderForm({
    container: content.querySelector('#task-comment-add'),
    fields: [{ key: 'message', label: 'Add a comment', type: 'textarea', required: true }],
    onSubmit: async (values) => {
      if (demo || !profile) {
        showToast('Commenting requires a configured database', 'info');
        return;
      }
      const res = await insertRecord('task_comments', { task_id: taskId, user_id: profile.id, message: values.message });
      if (res.error) { showToast(res.error.message || 'Could not add comment', 'danger'); return; }
      showToast('Comment added', 'success');
      close();
      openTaskComments(taskId, title);
    }
  });
}