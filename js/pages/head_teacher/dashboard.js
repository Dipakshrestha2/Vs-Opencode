import { registerRoute } from '../../router.js';
import { showToast } from '../../components/toast.js';
import { getState } from '../../state.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { renderForm } from '../../components/form.js';
import { fetchAll, insertRecord, updateRecord, createNotification, getSupabase, isDemo } from '../../api.js';

export function registerRoutes() {
  registerRoute('/head_teacher/dashboard', renderHeadTeacherDashboard);
  registerRoute('/head_teacher/teachers', renderTeachers);
  registerRoute('/head_teacher/monitor', renderMonitor);
  registerRoute('/head_teacher/tasks', renderTasks);
  registerRoute('/head_teacher/submissions', renderSubmissions);
  registerRoute('/head_teacher/escalations', renderEscalations);
  registerRoute('/head_teacher/reports', renderReports);
  registerRoute('/head_teacher/calendar', renderCalendarView);
  registerRoute('/head_teacher/notifications', renderNotifications);
  registerRoute('/head_teacher/feedback', renderFeedback);
}

async function renderNotifications(container) {
  const { renderNotificationsPage } = await import('../../components/notifications.js');
  await renderNotificationsPage(container);
}

async function renderFeedback(container) {
  const { renderFeedbackPage } = await import('../../components/feedback.js');
  await renderFeedbackPage(container);
}

async function getHeadTeacher() {
  const profile = getState().profile;
  const client = getSupabase();
  if (!client || !profile) return null;
  const { data } = await client.from('head_teachers').select('id').eq('profile_id', profile.id).maybeSingle().catch(() => ({ data: null }));
  return data;
}

async function renderHeadTeacherDashboard(container) {
  document.getElementById('page-title').textContent = 'Head Teacher Dashboard';
  const profile = getState().profile;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--color-purple);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:white;font-weight:700;">${profile.full_name ? profile.full_name[0].toUpperCase() : 'H'}</div>
      <div><h2 style="margin-bottom:4px;">Welcome${profile.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}!</h2><p style="color:var(--color-gray);">Head Teacher Dashboard</p></div>
    </div>
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">👩‍🏫</div><div><div class="stat-value" id="ht-teachers">–</div><div class="stat-label">Assigned Teachers</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">📝</div><div><div class="stat-value" id="ht-tasks">–</div><div class="stat-label">Pending Tasks</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,107,107,0.1);color:var(--color-red);">⚠️</div><div><div class="stat-value" id="ht-escalations">–</div><div class="stat-label">Escalations</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">✅</div><div><div class="stat-value" id="ht-completed">–</div><div class="stat-label">Completed Tasks</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>My Teachers</h3><a href="#/head_teacher/teachers" class="btn btn-sm btn-secondary">View All</a></div>
        <div class="card-body" id="ht-teachers-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Tasks</h3><a href="#/head_teacher/tasks" class="btn btn-sm btn-secondary">View All</a></div>
        <div class="card-body" id="ht-tasks-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  const ht = await getHeadTeacher();
  if (!ht) {
    document.getElementById('ht-teachers').textContent = '–';
    document.getElementById('ht-tasks').textContent = '–';
    document.getElementById('ht-escalations').textContent = '–';
    document.getElementById('ht-completed').textContent = '–';
    document.getElementById('ht-teachers-list').innerHTML = '<p style="color:var(--color-gray);">No head-teacher profile linked to this account yet.</p>';
    document.getElementById('ht-tasks-list').innerHTML = '';
    return;
  }

  const [teacherRes, taskRes, escRes] = await Promise.all([
    fetchAll('head_teacher_teachers', { head_teacher_id: ht.id }, 'teacher_id, teachers(profile_id, profiles(full_name))').catch(() => ({ data: null })),
    fetchAll('tasks', { assigned_by: profile.id }, 'id, title, status, due_date').catch(() => ({ data: null })),
    fetchAll('escalations', { to_user: profile.id }, 'id, status').catch(() => ({ data: null }))
  ]);

  const teachers = teacherRes.data || [];
  const tasks = taskRes.data || [];
  const escalations = escRes.data || [];

  document.getElementById('ht-teachers').textContent = teachers.length || '–';
  document.getElementById('ht-tasks').textContent = tasks.filter(t => !['completed', 'approved', 'rejected'].includes(t.status)).length || '–';
  document.getElementById('ht-escalations').textContent = escalations.filter(e => e.status !== 'approved' && e.status !== 'completed').length || '–';
  document.getElementById('ht-completed').textContent = tasks.filter(t => ['completed', 'approved'].includes(t.status)).length || '–';

  document.getElementById('ht-teachers-list').innerHTML = teachers.length
    ? teachers.slice(0, 4).map(t => `<div class="recent-item"><div class="recent-icon">👩‍🏫</div><div class="recent-info"><div class="recent-title">${t.teachers?.profiles?.full_name || 'Teacher'}</div><div class="recent-meta">Active</div></div><span class="badge status-present">Active</span></div>`).join('')
    : '<p style="color:var(--color-gray);">No teachers assigned yet.</p>';

  document.getElementById('ht-tasks-list').innerHTML = tasks.length
    ? tasks.slice(0, 4).map(t => `<div class="recent-item"><div class="recent-icon">📝</div><div class="recent-info"><div class="recent-title">${t.title}</div><div class="recent-meta">${t.status.replace(/_/g, ' ')} · Due ${t.due_date}</div></div><span class="badge status-${t.status}">${t.status.replace(/_/g, ' ')}</span></div>`).join('')
    : '<p style="color:var(--color-gray);">No tasks assigned yet.</p>';
}

async function renderTeachers(container) {
  document.getElementById('page-title').textContent = 'Assigned Teachers';
  container.innerHTML = `<div class="section-header"><h2>My Teachers</h2></div><div class="card"><div class="card-body" id="teachers-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  const demoTeachers = [
    { id: '1', name: 'Sarah Johnson', classes: 'KG1-A, KG1-B', subjects: 'Math, English', active_tasks: 4 },
    { id: '2', name: 'Michael Chen', classes: 'KG2-A, KG2-B', subjects: 'Science, Math', active_tasks: 3 }
  ];

  let rows = demoTeachers;
  const ht = await getHeadTeacher();
  if (ht) {
    const { data, error } = await fetchAll('head_teacher_teachers', { head_teacher_id: ht.id }, 'id, teacher_id, teachers(profile_id, profiles(full_name))');
    if (!error && data && data.length) {
      rows = data.map(r => ({
        id: r.id,
        name: r.teachers?.profiles?.full_name || 'Teacher',
        classes: '–',
        subjects: '–',
        active_tasks: '–'
      }));
    }
  }

  const { renderTable } = await import('../../components/table.js');
  renderTable({
    container: document.getElementById('teachers-table'),
    columns: [
      { key: 'name', label: 'Teacher' },
      { key: 'classes', label: 'Classes' },
      { key: 'subjects', label: 'Subjects' },
      { key: 'active_tasks', label: 'Active Tasks' }
    ],
    data: rows,
    actions: [{ id: 'monitor', label: 'Monitor', type: 'primary', onClick: () => { window.location.hash = '#/head_teacher/monitor'; } }]
  });
}

async function renderMonitor(container) {
  document.getElementById('page-title').textContent = 'Monitor Activities';
  container.innerHTML = `
    <div class="section-header"><h2>Monitor</h2></div>
    <div class="tabs">
      <button class="tab active" data-tab="attendance">Attendance</button>
      <button class="tab" data-tab="homework">Homework</button>
      <button class="tab" data-tab="results">Results Review</button>
    </div>
    <div id="monitor-content"><div class="loading-spinner"><div class="spinner"></div></div></div>`;

  const content = document.getElementById('monitor-content');
  const profile = getState().profile;

  async function loadTab(tab) {
    content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    if (!profile || isDemo()) {
      content.innerHTML = '<div class="card"><div class="card-body"><p style="color:var(--color-gray);">Live monitoring requires a connected database with teacher assignments.</p></div></div>';
      return;
    }
    const { renderTable } = await import('../../components/table.js');
    const { data: nameData } = await fetchAll('profiles', {}, 'id, full_name').catch(() => ({ data: [] }));
    const nameOf = (id) => nameData?.find(p => p.id === id)?.full_name || '–';

    if (tab === 'attendance') {
      // Recent attendance records for classes of managed teachers (RLS-scoped)
      const { data, error } = await fetchAll('attendance', {}, 'id, date, class_id, sections(name), students:attendance_records(student_id)').catch(() => ({ data: null, error: { message: '' } }));
      const { data: records } = await fetchAll('attendance_records', {}, 'id, status, attendance_id, students(full_name), attendance(date, classes(name))').catch(() => ({ data: [] }));
      if (error && error.message) {
        content.innerHTML = `<div class="card"><div class="card-body"><p style="color:var(--color-gray);">${error.message}. Check that attendance RLS policies (migration 015) have been applied.</p></div></div>`;
        return;
      }
      const report = document.createElement('div');
      report.innerHTML = `
        <div class="card"><div class="card-body" id="ht-att-table"></div></div>`;
      content.appendChild(report);
      renderTable({
        container: document.getElementById('ht-att-table'),
        columns: [
          { key: 'student', label: 'Student' },
          { key: 'class', label: 'Class' },
          { key: 'date', label: 'Date' },
          { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v}</span>` }
        ],
        data: (records || []).slice(0, 50).map(r => ({
          id: r.id,
          student: r.students?.full_name || '–',
          class: r.attendance?.classes?.name || '–',
          date: r.attendance?.date || '–',
          status: r.status
        }))
      });
    } else if (tab === 'homework') {
      const { data, error } = await fetchAll('homework', {}, 'id, title, due_date, status, teacher_id, subjects(name)').catch(() => ({ data: [], error: null }));
      const { data: teacherData } = await fetchAll('teachers', {}, 'id, profiles(full_name)').catch(() => ({ data: [] }));
      const tName = (id) => teacherData?.find(t => t.id === id)?.profiles?.full_name || '–';
      if (error && error.message) {
        content.innerHTML = `<div class="card"><div class="card-body"><p style="color:var(--color-gray);">${error.message}</p></div></div>`;
        return;
      }
      const report = document.createElement('div');
      report.innerHTML = `<div class="card"><div class="card-body" id="ht-hw-table"></div></div>`;
      content.appendChild(report);
      renderTable({
        container: document.getElementById('ht-hw-table'),
        columns: [
          { key: 'title', label: 'Homework' },
          { key: 'teacher', label: 'Teacher' },
          { key: 'subject', label: 'Subject' },
          { key: 'due_date', label: 'Due Date' },
          { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` }
        ],
        data: (data || []).map(h => ({
          id: h.id,
          title: h.title,
          teacher: tName(h.teacher_id),
          subject: h.subjects?.name || '–',
          due_date: h.due_date,
          status: h.status
        }))
      });
    } else {
      // Results review: submitted / under_review results for managed teachers' exams
      const { data, error } = await fetchAll('results', {}, 'id, marks_obtained, grade, status, exam_id, student_id, students(full_name), exams(title, teachers(profile_id))').catch(() => ({ data: [], error: null }));
      if (error && error.message) {
        content.innerHTML = `<div class="card"><div class="card-body"><p style="color:var(--color-gray);">${error.message}</p></div></div>`;
        return;
      }
      const pending = (data || []).filter(r => ['draft', 'submitted', 'under_review'].includes(r.status));
      const report = document.createElement('div');
      report.innerHTML = `<div class="card"><div class="card-body" id="ht-results-table"></div></div>`;
      content.appendChild(report);
      renderTable({
        container: document.getElementById('ht-results-table'),
        columns: [
          { key: 'student', label: 'Student' },
          { key: 'exam', label: 'Exam' },
          { key: 'marks', label: 'Score' },
          { key: 'grade', label: 'Grade' },
          { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` }
        ],
        data: pending.map(r => ({
          id: r.id,
          student: r.students?.full_name || '–',
          exam: r.exams?.title || '–',
          marks: r.marks_obtained,
          grade: r.grade || '–',
          status: r.status
        })),
        actions: [
          { id: 'publish', label: 'Approve & Publish', type: 'success', onClick: (id) => reviewResult(id, 'published') },
          { id: 'reject', label: 'Reject', type: 'danger', onClick: (id) => reviewResult(id, 'rejected') }
        ]
      });

      async function reviewResult(id, status) {
        const r = (data || []).find(x => x.id === id);
        confirmDialog('Review Result', `${status === 'published' ? 'Approve & publish this result?' : 'Reject this result?'}`, async () => {
          const res = await updateRecord('results', id, { status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() });
          if (res.error) { showToast(res.error.message || 'Update failed', 'danger'); return; }
          showToast(status === 'published' ? 'Result published to parents' : 'Result rejected', status === 'published' ? 'success' : 'warning');
          loadTab('results');
        });
      }
    }
  }

  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadTab(tab.dataset.tab);
    });
  });

  await loadTab('attendance');
}

async function renderTasks(container) {
  document.getElementById('page-title').textContent = 'Manage Tasks';
  const profile = getState().profile;

  container.innerHTML = `
    <div class="section-header"><h2>Tasks</h2><button class="btn btn-primary" id="create-task-btn">+ Create Task</button></div>
    <div class="card"><div class="card-body" id="tasks-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  async function loadTasks() {
    let raw = [];
    let teacherProfiles = [];
    if (profile) {
      const { data, error } = await fetchAll('tasks', { assigned_by: profile.id }, 'id, title, description, assigned_to, status, due_date, priority');
      if (!error && data) raw = data;
      const { data: teachers } = await fetchAll('profiles', { role: 'teacher' }, 'id, full_name, is_active').catch(() => ({ data: null }));
      teacherProfiles = (teachers || []).filter(t => t.is_active !== false);
    }
    const { data: nameData } = await fetchAll('profiles', {}, 'id, full_name').catch(() => ({ data: null }));
    const nameOf = (id) => nameData?.find(p => p.id === id)?.full_name || '–';

    const { renderTable } = await import('../../components/table.js');
    const tableEl = document.getElementById('tasks-table');
    if (!tableEl) return;
    renderTable({
      container: tableEl,
      columns: [
        { key: 'title', label: 'Task' },
        { key: 'assigned_to', label: 'Assigned To' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` },
        { key: 'due_date', label: 'Due Date' },
        { key: 'priority', label: 'Priority', render: (v) => `<span class="priority-${v}">${(v || '').toUpperCase()}</span>` }
      ],
      data: raw.map(t => ({
        id: t.id,
        title: t.title,
        assigned_to: nameOf(t.assigned_to),
        status: t.status,
        due_date: t.due_date,
        priority: t.priority
      })),
      actions: [
        { id: 'comments', label: 'Comments', type: 'secondary', onClick: (id) => openComments(id, raw) },
        { id: 'edit', label: 'Edit', type: 'secondary', onClick: (id) => openTaskForm(raw.find(t => t.id === id), teacherProfiles) },
        ...(raw.filter(t => ['submitted', 'under_review'].includes(t.status)).length ? [{
          id: 'approve', label: 'Approve', type: 'success', onClick: (id) => setTaskStatus(id, 'approved')
        }] : []),
        ...(raw.filter(t => ['submitted', 'under_review'].includes(t.status)).length ? [{
          id: 'reject', label: 'Reject', type: 'danger', onClick: (id) => setTaskStatus(id, 'rejected')
        }] : [])
      ]
    });
  }

  function openComments(id, raw) {
    const t = raw.find(x => x.id === id);
    import('../../components/task-comments.js').then(({ openTaskComments }) => openTaskComments(id, t?.title));
  }

  function openTaskForm(task, teacherProfiles) {
    const formContainer = document.createElement('div');
    const close = openModal({ title: task ? 'Edit Task' : 'Create Task', content: formContainer, size: 'md' });
    renderForm({
      container: formContainer,
      fields: [
        { key: 'title', label: 'Task Title', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'assigned_to', label: 'Assign To', type: 'select', required: true, options: teacherProfiles.map(t => ({ value: t.id, label: t.full_name })) },
        { key: 'due_date', label: 'Due Date', type: 'date', required: true },
        { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'].map(p => ({ value: p, label: p.toUpperCase() })) }
      ],
      values: task ? {
        title: task.title,
        description: task.description || '',
        assigned_to: task.assigned_to || teacherProfiles[0]?.id,
        due_date: task.due_date,
        priority: task.priority
      } : { priority: 'medium' },
      onSubmit: async (data) => {
        if (isDemo() || !profile) {
          showToast(task ? 'Task updated (demo mode)' : 'Task created (demo mode)', 'success');
          close();
          loadTasks();
          return;
        }
        const res = task
          ? await updateRecord('tasks', task.id, data)
          : await insertRecord('tasks', { ...data, assigned_by: profile.id });
        if (res.error) {
          showToast(res.error.message || 'Failed to save task', 'danger');
          return;
        }
        if (!task && data.assigned_to) {
          await createNotification(data.assigned_to, 'New Task Assigned', `You have been assigned: "${data.title}"`, 'task', '#/teacher/tasks');
        }
        showToast(task ? 'Task updated' : 'Task created and notification sent', 'success');
        close();
        loadTasks();
      }
    });
  }

  async function setTaskStatus(id, status) {
    const raw = (await fetchAll('tasks', { assigned_by: profile.id }, 'id, title, assigned_to, status')).data || [];
    const t = raw.find(x => x.id === id);
    if (isDemo() || !t) {
      showToast(`Task ${status === 'approved' ? 'approved' : 'rejected'} (demo mode)`, status === 'approved' ? 'success' : 'warning');
      loadTasks();
      return;
    }
    const res = await updateRecord('tasks', id, { status });
    if (res.error) { showToast(res.error.message || 'Update failed', 'danger'); return; }
    if (t.assigned_to) {
      await createNotification(t.assigned_to, `Task ${status === 'approved' ? 'Approved' : 'Rejected'}`, `"${t.title}" was ${status === 'approved' ? 'approved' : 'rejected'} by your head teacher.`, 'task', '#/teacher/tasks');
    }
    showToast(`Task ${status === 'approved' ? 'approved' : 'rejected'}`, status === 'approved' ? 'success' : 'warning');
    loadTasks();
  }

  document.getElementById('create-task-btn')?.addEventListener('click', () => {
    // Load fresh teacher list, then open the form
    const formContainer = document.createElement('div');
    const close = openModal({ title: 'Create Task', content: formContainer, size: 'md' });
    formContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    (async () => {
      const { data: teachers } = await fetchAll('profiles', { role: 'teacher' }, 'id, full_name, is_active').catch(() => ({ data: [] }));
      const teacherProfiles = (teachers || []).filter(t => t.is_active !== false);
      formContainer.innerHTML = '';
      renderForm({
        container: formContainer,
        fields: [
          { key: 'title', label: 'Task Title', required: true },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'assigned_to', label: 'Assign To', type: 'select', required: true, options: teacherProfiles.map(t => ({ value: t.id, label: t.full_name })) },
          { key: 'due_date', label: 'Due Date', type: 'date', required: true },
          { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'].map(p => ({ value: p, label: p.toUpperCase() })) }
        ],
        values: { priority: 'medium' },
        onSubmit: async (data) => {
          if (isDemo() || !profile) {
            showToast('Task created (demo mode)', 'success');
            close();
            loadTasks();
            return;
          }
          const res = await insertRecord('tasks', { ...data, assigned_by: profile.id });
          if (res.error) { showToast(res.error.message || 'Failed to create task', 'danger'); return; }
          if (data.assigned_to) {
            await createNotification(data.assigned_to, 'New Task Assigned', `You have been assigned: "${data.title}"`, 'task', '#/teacher/tasks');
          }
          showToast('Task created and notification sent', 'success');
          close();
          loadTasks();
        }
      });
    })();
  });

  await loadTasks();
}

async function renderSubmissions(container) {
  document.getElementById('page-title').textContent = 'Review Submissions';
  const profile = getState().profile;

  container.innerHTML = `<div class="section-header"><h2>Submissions</h2></div><div class="card"><div class="card-body" id="submissions-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  let raw = [];
  if (profile) {
    const { data, error } = await fetchAll('tasks', { assigned_by: profile.id }, 'id, title, status, due_date, assigned_to');
    if (!error && data) raw = data;
  }
  const { data: nameData } = await fetchAll('profiles', {}, 'id, full_name').catch(() => ({ data: null }));
  const nameOf = (id) => nameData?.find(p => p.id === id)?.full_name || '–';

  const submitted = raw.filter(t => ['submitted', 'under_review'].includes(t.status));

  const { renderTable } = await import('../../components/table.js');
  renderTable({
    container: document.getElementById('submissions-table'),
    columns: [
      { key: 'teacher', label: 'Teacher' },
      { key: 'title', label: 'Task' },
      { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` },
      { key: 'due_date', label: 'Due Date' }
    ],
    data: submitted.map(t => ({
      id: t.id,
      teacher: nameOf(t.assigned_to),
      title: t.title,
      status: t.status,
      due_date: t.due_date
    })),
    actions: [
      { id: 'approve', label: 'Approve', type: 'success', onClick: (id) => decide(id, 'approved') },
      { id: 'reject', label: 'Reject', type: 'danger', onClick: (id) => decide(id, 'rejected') }
    ]
  });

  async function decide(id, status) {
    const t = raw.find(x => x.id === id);
    if (isDemo() || !t) {
      showToast(`Submission ${status === 'approved' ? 'approved' : 'rejected'} (demo mode)`, status === 'approved' ? 'success' : 'warning');
      renderSubmissions(container);
      return;
    }
    confirmDialog(
      status === 'approved' ? 'Approve Submission' : 'Reject Submission',
      `${status === 'approved' ? 'Approve' : 'Reject'} "${t.title}"?`,
      async () => {
        const res = await updateRecord('tasks', id, { status });
        if (res.error) { showToast(res.error.message || 'Update failed', 'danger'); return; }
        if (t.assigned_to) {
          await createNotification(t.assigned_to, `Submission ${status === 'approved' ? 'Approved' : 'Rejected'}`, `Your submission "${t.title}" was ${status === 'approved' ? 'approved' : 'rejected'}.`, 'task', '#/teacher/tasks');
        }
        showToast(`Submission ${status === 'approved' ? 'approved' : 'rejected'}`, status === 'approved' ? 'success' : 'warning');
        renderSubmissions(container);
      }
    );
  }
}

async function renderEscalations(container) {
  document.getElementById('page-title').textContent = 'Escalations';
  const profile = getState().profile;

  container.innerHTML = `<div class="section-header"><h2>Escalations</h2></div><div class="card"><div class="card-body" id="escalations-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  let raw = [];
  if (profile) {
    const { data, error } = await fetchAll('escalations', { to_user: profile.id }, 'id, reason, status, created_at, from_user, task_id, feedback_id, tasks(title), feedback(subject)');
    if (!error && data) raw = data;
  }
  const { data: nameData } = await fetchAll('profiles', {}, 'id, full_name').catch(() => ({ data: null }));
  const nameOf = (id) => nameData?.find(p => p.id === id)?.full_name || 'Unknown';

  const open = raw.filter(e => !['approved', 'completed', 'rejected'].includes(e.status));

  const { renderTable } = await import('../../components/table.js');
  renderTable({
    container: document.getElementById('escalations-table'),
    columns: [
      { key: 'title', label: 'Issue' },
      { key: 'from', label: 'From' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` },
      { key: 'created_at', label: 'Date' }
    ],
    data: open.map(e => ({
      id: e.id,
      title: e.tasks?.title || e.feedback?.subject || 'Escalation',
      from: nameOf(e.from_user),
      reason: e.reason,
      status: e.status,
      created_at: new Date(e.created_at).toLocaleDateString()
    })),
    actions: [{ id: 'resolve', label: 'Resolve', type: 'success', onClick: resolve }]
  });

  async function resolve(id) {
    const e = raw.find(x => x.id === id);
    if (isDemo() || !e) {
      showToast('Escalation resolved (demo mode)', 'success');
      renderEscalations(container);
      return;
    }
    confirmDialog('Resolve Escalation', 'Close this escalation and mark it resolved?', async () => {
      const res = await updateRecord('escalations', id, {
        status: 'completed',
        resolved_at: new Date().toISOString()
      });
      if (res.error) { showToast(res.error.message || 'Could not resolve escalation', 'danger'); return; }
      // If the underlying task is still open, close it too.
      if (e.task_id) {
        const t = await fetchAll('tasks', { id: e.task_id }, 'id, status');
        const task = t.data?.[0];
        if (task && ['assigned', 'in_progress', 'submitted', 'under_review'].includes(task.status)) {
          await updateRecord('tasks', e.task_id, { status: 'completed' });
        }
      }
      showToast('Escalation resolved', 'success');
      renderEscalations(container);
    });
  }
}

async function renderReports(container) {
  document.getElementById('page-title').textContent = 'Head Teacher Reports';
  container.innerHTML = `
    <h2 style="margin-bottom:24px;">Reports</h2>
    <div class="card"><div class="card-body"><p style="color:var(--color-gray);">Report summaries build automatically from your task, attendance, and homework data.</p></div></div>`;
}

async function renderCalendarView(container) {
  document.getElementById('page-title').textContent = 'Calendar';
  container.innerHTML = `<div class="card"><div class="card-body" id="sup-calendar"></div></div>`;

  let events = [
    { date: '2026-08-28', title: 'Parent Meeting' },
    { date: '2026-09-01', title: 'New Term Start' }
  ];
  const { data, error } = await fetchAll('calendar_events', {}, 'title, start_date');
  if (!error && data && data.length) {
    events = data.map(e => ({ date: (e.start_date || '').slice(0, 10), title: e.title }));
  }

  const { renderCalendar } = await import('../../components/calendar.js');
  renderCalendar({ container: document.getElementById('sup-calendar'), events });
}