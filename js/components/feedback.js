import { getState } from '../state.js';
import { fetchAll, insertRecord, updateRecord, isDemo } from '../api.js';
import { openModal } from './modal.js';
import { renderForm } from './form.js';
import { showToast } from './toast.js';

export async function renderFeedbackPage(container) {
  document.getElementById('page-title').textContent = 'Feedback';
  const profile = getState().profile;
  const staff = profile?.role === 'admin' || profile?.role === 'head_teacher' || profile?.role === 'teacher';
  const demo = isDemo();

  container.innerHTML = `
    <div class="section-header"><h2>Feedback</h2></div>
    <div class="card"><div class="card-body" id="feedback-list"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  const listEl = document.getElementById('feedback-list');

  // Responses for feedback the current user sent or received (RLS-scoped).
  const { data: responsesData } = await fetchAll(
    'feedback_responses',
    {},
    'id, feedback_id, message, responded_by, created_at, profiles!feedback_responses_responded_by_fkey(full_name)'
  ).catch(() => ({ data: null }));
  const responsesByFeedback = (responsesData || []).reduce((acc, r) => {
    (acc[r.feedback_id] = acc[r.feedback_id] || []).push(r);
    return acc;
  }, {});

  const { data, error } = profile
    ? await fetchAll('feedback', { to_user: profile.id }, 'id, subject, message, status, priority, created_at, due_date, resolved_at, from_user, student_id, students(full_name), profiles!feedback_from_user_fkey(full_name)')
    : { data: null };

  if (error) {
    listEl.innerHTML = '<p style="color:var(--color-gray);">Could not load feedback.</p>';
    return;
  }
  if (!data || !data.length) {
    listEl.innerHTML = demo
      ? '<p style="color:var(--color-gray);">No feedback. Demo mode shows sample items below when connected.</p>'
      : '<p style="color:var(--color-gray);">You have no feedback. 🎉</p>';
    return;
  }

  listEl.innerHTML = data
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(f => `
      <div style="padding:18px;border-bottom:1px solid #F0F0F0;" data-fid="${f.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;gap:12px;">
          <div>
            <strong>${f.subject}</strong>
            <span class="badge status-${f.status}">${(f.status || 'assigned').replace(/_/g, ' ')}</span>
          </div>
          <span style="color:var(--color-gray);font-size:0.8rem;white-space:nowrap;">${new Date(f.created_at).toLocaleString()}</span>
        </div>
        <p style="color:var(--color-gray);font-size:0.85rem;margin-bottom:6px;">
          From: ${f.profiles?.full_name || 'Teacher'}
          ${f.students?.full_name ? ` · About: ${f.students.full_name}` : ''}
          ${f.priority ? ` · Priority: ${f.priority}` : ''}
        </p>
        <p style="margin-bottom:8px;">${(f.message || '').replace(/\n/g, '<br>')}</p>

        ${(responsesByFeedback[f.id] || []).map(r => `
          <div style="background:#F7F9FC;border-radius:8px;padding:10px 12px;margin:6px 0;">
            <div style="font-size:0.8rem;color:var(--color-gray);">↳ ${r.profiles?.full_name || 'Staff'} · ${new Date(r.created_at).toLocaleString()}</div>
            <div style="font-size:0.9rem;">${(r.message || '').replace(/\n/g, '<br>')}</div>
          </div>`).join('')}

        ${f.resolved_at || f.status === 'resolved'
          ? '<p style="font-size:0.8rem;color:var(--color-green);margin-top:8px;">✅ Resolved</p>'
          : staff ? `
            <div style="display:flex;gap:8px;margin-top:10px;">
              <button class="btn btn-sm btn-primary" data-respond="${f.id}">Respond</button>
              <button class="btn btn-sm btn-secondary" data-resolve="${f.id}">Mark Resolved</button>
            </div>` : ''}
      </div>`).join('');

  listEl.querySelectorAll('[data-respond]').forEach(btn => {
    btn.addEventListener('click', () => openRespond(btn.dataset.respond));
  });
  listEl.querySelectorAll('[data-resolve]').forEach(btn => {
    btn.addEventListener('click', () => resolve(btn.dataset.resolve));
  });

  function openRespond(fid) {
    if (demo) {
      showToast('Responding requires a configured database', 'info');
      return;
    }
    const formContainer = document.createElement('div');
    const close = openModal({ title: 'Respond to Feedback', content: formContainer, size: 'md' });
    renderForm({
      container: formContainer,
      fields: [{ key: 'message', label: 'Your Response', type: 'textarea', required: true }],
      onSubmit: async (values) => {
        const res = await insertRecord('feedback_responses', {
          feedback_id: fid,
          responded_by: profile.id,
          message: values.message
        });
        if (res.error) { showToast(res.error.message || 'Could not send response', 'danger'); return; }
        showToast('Response sent', 'success');
        close();
        renderFeedbackPage(container);
      }
    });
  }

  async function resolve(fid) {
    if (demo) {
      showToast('Updating requires a configured database', 'info');
      return;
    }
    const res = await updateRecord('feedback', fid, {
      status: 'resolved',
      resolved_at: new Date().toISOString()
    });
    if (res.error) { showToast(res.error.message || 'Could not resolve feedback', 'danger'); return; }
    showToast('Feedback marked as resolved', 'success');
    renderFeedbackPage(container);
  }
}