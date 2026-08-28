import { registerRoute } from '../../router.js';
import { showToast } from '../../components/toast.js';
import { fetchAllOrDemo, insertRecord, updateRecord, deleteRecord, fetchCount, fetchAll, isDemo, getSupabase } from '../../api.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { renderForm } from '../../components/form.js';

export function registerRoutes() {
  registerRoute('/admin/dashboard', renderAdminDashboard);
  registerRoute('/admin/users', renderUsers);
  registerRoute('/admin/classes', renderClasses);
  registerRoute('/admin/subjects', renderSubjects);
  registerRoute('/admin/academic-years', renderAcademicYears);
  registerRoute('/admin/assignments', renderAssignments);
  registerRoute('/admin/announcements', renderAnnouncements);
  registerRoute('/admin/reports', renderReports);
  registerRoute('/admin/settings', renderSettings);
  registerRoute('/admin/audit-log', renderAuditLog);
  registerRoute('/admin/notifications', renderNotifications);
}

async function renderAnnouncements(container) {
  const { renderAnnouncementsPage } = await import('../../components/announcements.js');
  await renderAnnouncementsPage(container);
}

async function renderNotifications(container) {
  const { renderNotificationsPage } = await import('../../components/notifications.js');
  await renderNotificationsPage(container);
}

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function renderAdminDashboard(container) {
  document.getElementById('page-title').textContent = 'Admin Dashboard';
  container.innerHTML = `
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">👥</div><div><div class="stat-value" id="stat-users">–</div><div class="stat-label">Total Users</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">👩‍🏫</div><div><div class="stat-value" id="stat-teachers">–</div><div class="stat-label">Teachers</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">👶</div><div><div class="stat-value" id="stat-students">–</div><div class="stat-label">Students</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(155,89,182,0.1);color:var(--color-purple);">🏫</div><div><div class="stat-value" id="stat-classes">–</div><div class="stat-label">Classes</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Recent Activity</h3></div>
        <div class="card-body" id="recent-activity">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Quick Actions</h3></div>
        <div class="card-body">
          <div class="btn-group" style="flex-direction:column;gap:10px;">
            <a href="#/admin/users" class="btn btn-primary btn-block">Manage Users</a>
            <a href="#/admin/classes" class="btn btn-success btn-block">Manage Classes</a>
            <a href="#/admin/reports" class="btn btn-secondary btn-block">View Reports</a>
            <a href="#/admin/settings" class="btn btn-outline btn-block">System Settings</a>
          </div>
        </div>
      </div>
    </div>`;

  const stats = await Promise.all([
    fetchCount('profiles'),
    fetchCount('teachers'),
    fetchCount('students'),
    fetchCount('classes')
  ]);

  setStat('stat-users', stats[0].count ?? '–');
  setStat('stat-teachers', stats[1].count ?? '–');
  setStat('stat-students', stats[2].count ?? '–');
  setStat('stat-classes', stats[3].count ?? '–');

  // Recent audit activity
  const { data: logs } = await fetchAll('audit_logs', {}, '*').catch(() => ({ data: null }));
  const activityEl = document.getElementById('recent-activity');
  if (logs && logs.length) {
    activityEl.innerHTML = logs.slice(0, 5).map(l => `
      <div class="recent-item"><div class="recent-icon">📋</div><div class="recent-info"><div class="recent-title">${l.action} on ${l.table_name}</div><div class="recent-meta">${new Date(l.created_at).toLocaleString()}</div></div></div>`).join('') || '<p style="color:var(--color-gray);">No activity yet</p>';
  } else {
    activityEl.innerHTML = '<p style="color:var(--color-gray);">No activity recorded yet.</p>';
  }
}

// ------------------------------------------------------------------
// Generic CRUD page factory (live Supabase + demo fallback)
// ------------------------------------------------------------------
function createCrudPage({ tableName, demoData, columns, fields, emptyMessage, idField = 'id' }) {
  const local = { rows: [...demoData], fromDb: false };

  async function loadRows() {
    const res = await fetchAll(tableName, {}, '*');
    if (res.error || !res.data) return { rows: local.rows, fromDb: false };
    if (Array.isArray(res.data) && res.data.length === 0) return { rows: [], fromDb: true };
    return { rows: res.data, fromDb: true };
  }

  return async function renderPage(container) {
    const title = document.body.dataset.pageTitle = columns[0] ? columns[0].label : tableName;

    const { rows, fromDb } = await loadRows();
    local.rows = rows;
    local.fromDb = fromDb;

    const pageTitle = tableName === 'classes' ? 'Classes & Sections'
      : tableName === 'subjects' ? 'Subjects'
      : tableName === 'academic_years' ? 'Academic Years' : tableName;
    document.getElementById('page-title').textContent = pageTitle;

    container.innerHTML = `
      <div class="section-header">
        <h2>${pageTitle}</h2>
        <button class="btn btn-primary" id="add-btn">+ Add</button>
      </div>
      <div class="card"><div class="card-body" id="crud-table"></div></div>`;

    const table = await import('../../components/table.js');
    const tableCtrl = table.renderTable({
      container: document.getElementById('crud-table'),
      columns,
      data: rows,
      actions: [
        { id: 'edit', label: 'Edit', type: 'secondary', onClick: (id) => openForm(getRow(id)) },
        { id: 'delete', label: 'Delete', type: 'danger', onClick: (id) => confirmDelete(id) }
      ]
    });

    function getRow(id) {
      return (local.rows || []).find(r => String(r[idField]) === String(id));
    }

    function openForm(row = null) {
      const formContainer = document.createElement('div');
      const close = openModal({
        title: row ? 'Edit ' + pageTitle : 'Add ' + pageTitle,
        content: formContainer,
        size: 'md'
      });

      renderForm({
        container: formContainer,
        fields,
        values: row ? { ...row } : {},
        submitLabel: 'Save',
        onSubmit: async (data) => {
          if (local.fromDb) {
            let error = null;
            if (row) {
              const res = await updateRecord(tableName, row[idField], data);
              error = res.error;
            } else {
              const res = await insertRecord(tableName, data);
              error = res.error;
            }
            if (error) {
              showToast(error.message || 'Error saving', 'danger');
              return;
            }
            showToast(row ? 'Updated successfully' : 'Added successfully', 'success');
          } else {
            // Demo mode: mutate local array so add/edit "work" visually
            if (row) {
              const idx = local.rows.findIndex(r => String(r[idField]) === String(row[idField]));
              if (idx > -1) local.rows[idx] = { ...local.rows[idx], ...data };
            } else {
              local.rows.push({ id: 'd' + Date.now(), ...data });
            }
            showToast(row ? 'Updated successfully' : 'Added successfully', 'success');
          }
          close();
          renderPage(container);
        }
      });
    }

    function confirmDelete(id) {
      const row = getRow(id);
      confirmDialog('Delete ' + pageTitle, `Are you sure you want to delete "${row?.name || row?.title || row?.full_name || id}"?`, async () => {
        if (local.fromDb) {
          const res = await deleteRecord(tableName, id);
          if (res.error) {
            showToast(res.error.message || 'Error deleting', 'danger');
            return;
          }
        } else {
          local.rows = local.rows.filter(r => String(r[idField]) !== String(id));
        }
        showToast('Deleted successfully', 'success');
        renderPage(container);
      });
    }

    document.getElementById('add-btn')?.addEventListener('click', () => openForm());
  };
}

// ------------------------------------------------------------------
// Users
// ------------------------------------------------------------------
const demoUsers = [
  { id: '1', full_name: 'Admin User', email: 'admin@kindergarten.com', role: 'admin', is_active: true },
  { id: '2', full_name: 'Jane Head Teacher', email: 'head_teacher@kindergarten.com', role: 'head_teacher', is_active: true },
  { id: '3', full_name: 'Sarah Johnson', email: 'teacher1@kindergarten.com', role: 'teacher', is_active: true },
  { id: '4', full_name: 'Michael Chen', email: 'teacher2@kindergarten.com', role: 'teacher', is_active: true },
  { id: '5', full_name: 'John Smith', email: 'parent1@kindergarten.com', role: 'parent', is_active: true },
  { id: '6', full_name: 'Maria Garcia', email: 'parent2@kindergarten.com', role: 'parent', is_active: true }
];

async function renderUsers(container) {
  document.getElementById('page-title').textContent = 'Manage Users';
  const demo = isDemo();
  const { data: users, fromDb } = await fetchAllOrDemo('profiles', demoUsers, {}, '*');

  container.innerHTML = `
    <div class="section-header">
      <h2>Users</h2>
      <button class="btn btn-primary" id="add-user-btn">+ Add User</button>
    </div>
    ${demo ? '<div class="card"><div class="card-body" style="color:var(--color-gray);font-size:0.9rem;">Demo mode: changes are not persisted to the database.</div></div>' : ''}
    <div class="card"><div class="card-body" id="users-table"></div></div>`;

  const { renderTable } = await import('../../components/table.js');
  renderTable({
    container: document.getElementById('users-table'),
    columns: [
      { key: 'full_name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role', render: (v) => `<span class="badge status-${v === 'admin' ? 'approved' : v === 'head_teacher' ? 'under_review' : v === 'teacher' ? 'in_progress' : 'assigned'}">${v.replace(/_/g, ' ')}</span>` },
      { key: 'is_active', label: 'Status', render: (v) => `<span class="badge ${v ? 'status-present' : 'status-absent'}">${v ? 'Active' : 'Inactive'}</span>` }
    ],
    data: users || [],
    actions: [
      { id: 'edit', label: 'Edit', type: 'secondary', onClick: (id) => openUserForm(users.find(u => String(u.id) === String(id))) },
      { id: 'delete', label: 'Delete', type: 'danger', onClick: (id) => handleDelete(id) }
    ]
  });

  // Calls the manage-user Edge Function which uses the service-role key
  async function callManageUser(payload) {
    const c = getSupabase();
    if (!c) return { error: { message: 'Demo mode: Supabase not connected' } };
    const { data: { session } } = await c.auth.getSession();
    const token = session?.access_token;
    const url = `${c.supabaseUrl}/functions/v1/manage-user`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': c.supabaseKey,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return res.ok ? { data: json.data } : { error: { message: json.error || 'Unknown error' } };
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  function openUserForm(user = null) {
    const formContainer = document.createElement('div');
    const close = openModal({
      title: user ? 'Edit User' : 'Add User',
      content: formContainer,
      size: 'md'
    });

    const fields = [
      { key: 'full_name', label: 'Full Name', required: true },
      { key: 'role', label: 'Role', type: 'select', required: true, options: [
        { value: 'admin', label: 'Admin' },
        { value: 'head_teacher', label: 'Head Teacher' },
        { value: 'teacher', label: 'Teacher' },
        { value: 'parent', label: 'Parent' }
      ]},
      { key: 'is_active', label: 'Active Status', type: 'checkbox', checkLabel: 'Is Active' }
    ];

    // Email + password only shown when creating a new user
    if (!user) {
      fields.splice(1, 0, { key: 'email', label: 'Email', type: 'email', required: true });
      fields.push({ key: 'password', label: 'Password', type: 'password', required: true });
    }

    renderForm({
      container: formContainer,
      fields,
      values: user ? { ...user } : { is_active: true },
      onSubmit: async (data) => {
        if (!fromDb) {
          // Demo mode
          if (user) {
            const idx = users.findIndex(u => String(u.id) === String(user.id));
            if (idx > -1) users[idx] = { ...users[idx], ...data };
          } else {
            users.push({ id: 'demo-' + Date.now(), ...data });
          }
          showToast('User saved (demo mode)', 'success');
          close();
          renderUsers(container);
          return;
        }

        if (user) {
          // Edit: only update profile fields (full_name, role, is_active)
          const { password: _pw, email: _email, ...profileData } = data;
          const res = await updateRecord('profiles', user.id, profileData);
          if (res.error) { showToast(res.error.message || 'Error updating user', 'danger'); return; }
          showToast('User updated', 'success');
        } else {
          // Create: route through Edge Function → creates auth.users + triggers profile row
          const res = await callManageUser({
            action: 'create',
            email: data.email,
            password: data.password,
            full_name: data.full_name,
            role: data.role,
          });
          if (res.error) { showToast(res.error.message || 'Error creating user', 'danger'); return; }
          showToast('User created and can now log in', 'success');
        }
        close();
        renderUsers(container);
      }
    });
  }

  const handleDelete = (id) => {
    const user = users.find(u => String(u.id) === String(id));
    confirmDialog('Delete User', `Are you sure you want to delete "${user?.full_name || id}"?`, async () => {
      if (fromDb) {
        // Route through Edge Function → deletes auth.users (profile cascades automatically)
        const res = await callManageUser({ action: 'delete', user_id: id });
        if (res.error) {
          showToast(res.error.message || 'Error deleting user', 'danger');
          return;
        }
      } else {
        const idx = users.findIndex(u => String(u.id) === String(id));
        if (idx > -1) users.splice(idx, 1);
      }
      showToast('User deleted successfully', 'success');
      renderUsers(container);
    });
  };

  document.getElementById('add-user-btn')?.addEventListener('click', () => openUserForm());
}


// ------------------------------------------------------------------
// Classes, Subjects, Academic Years — generic CRUD
// ------------------------------------------------------------------
const demographics = {
  classes: {
    tableName: 'classes',
    demoData: [
      { id: '1', name: 'KG1', description: 'Foundation - Ages 3-4' },
      { id: '2', name: 'KG2', description: 'Exploration - Ages 4-5' },
      { id: '3', name: 'KG3', description: 'Preparation - Ages 5-6' }
    ],
    columns: [
      { key: 'name', label: 'Class' },
      { key: 'description', label: 'Description' }
    ],
    fields: [
      { key: 'name', label: 'Class Name', required: true },
      { key: 'description', label: 'Description', type: 'textarea' }
    ]
  },
  subjects: {
    tableName: 'subjects',
    demoData: [
      { id: '1', name: 'Math', icon: '🔢', description: 'Number concepts & basic arithmetic' },
      { id: '2', name: 'English', icon: '📝', description: 'Language, reading & writing' },
      { id: '3', name: 'Science', icon: '🔬', description: 'Discovery & exploration' },
      { id: '4', name: 'Art', icon: '🎨', description: 'Creative expression' }
    ],
    columns: [
      { key: 'icon', label: '', render: (v) => `<span style="font-size:1.3rem;">${v || '📘'}</span>` },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' }
    ],
    fields: [
      { key: 'name', label: 'Subject Name', required: true },
      { key: 'icon', label: 'Icon (emoji)' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ]
  },
  academic_years: {
    tableName: 'academic_years',
    demoData: [
      { id: '1', name: '2026-2027', start_date: '2026-01-01', end_date: '2026-12-31', is_current: true },
      { id: '2', name: '2025-2026', start_date: '2025-01-01', end_date: '2025-12-31', is_current: false }
    ],
    columns: [
      { key: 'name', label: 'Academic Year' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
      { key: 'is_current', label: 'Status', render: (v) => `<span class="badge ${v ? 'status-present' : ''}">${v ? 'Current' : 'Past'}</span>` }
    ],
    fields: [
      { key: 'name', label: 'Academic Year', required: true },
      { key: 'start_date', label: 'Start Date', type: 'date', required: true },
      { key: 'end_date', label: 'End Date', type: 'date', required: true },
      { key: 'is_current', label: 'Current Year', type: 'checkbox', checkLabel: 'Set as current academic year' }
    ]
  }
};

const renderClasses = createCrudPage(demographics.classes);
const renderSubjects = createCrudPage(demographics.subjects);
const renderAcademicYears = createCrudPage(demographics.academic_years);

// ------------------------------------------------------------------
// Assignments
// ------------------------------------------------------------------
async function renderAssignments(container) {
  document.getElementById('page-title').textContent = 'Teacher Assignments';
  container.innerHTML = `
    <div class="section-header">
      <h2>Teacher Assignments</h2>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" id="assign-class-btn">+ Assign Class</button>
        <button class="btn btn-primary" id="assign-subject-btn">+ Assign Subject</button>
      </div>
    </div>
    <div class="card"><div class="card-body" id="assignments-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>
    <h2 style="margin:28px 0 12px;">Teacher Subjects</h2>
    <div class="card"><div class="card-body" id="assignments-subjects"><div class="loading-spinner"><div class="spinner"></div></div></div></div>
    <h2 style="margin:28px 0 12px;">Head Teacher Coverage</h2>
    <div class="card"><div class="card-body" id="assignments-coverage"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  const { renderTable } = await import('../../components/table.js');

  const [teachers, classes, sections, subjects, years, headTeachers] = await Promise.all([
    fetchAll('teachers', {}, 'id, profile_id, profiles(full_name)').catch(() => ({ data: [] })),
    fetchAll('classes', {}, 'id, name').catch(() => ({ data: [] })),
    fetchAll('sections', {}, 'id, name').catch(() => ({ data: [] })),
    fetchAll('subjects', {}, 'id, name').catch(() => ({ data: [] })),
    fetchAll('academic_years', {}, 'id, name, is_current').catch(() => ({ data: [] })),
    fetchAll('head_teachers', {}, 'id, profile_id, profiles(full_name)').catch(() => ({ data: [] }))
  ]);
  const tName = (id) => teachers.data?.find(t => t.id === id)?.profiles?.full_name || 'Teacher';
  const cName = (id) => classes.data?.find(c => c.id === id)?.name || 'Class';
  const sName = (id) => sections.data?.find(s => s.id === id)?.name || '';
  const subName = (id) => subjects.data?.find(s => s.id === id)?.name || 'Subject';
  const yearName = (id) => years.data?.find(y => y.id === id)?.name || '–';
  const htName = (id) => headTeachers.data?.find(h => h.id === id)?.profiles?.full_name || 'Head Teacher';

  async function renderAll() {
    const [tcRes, tsRes, httRes] = await Promise.all([
      fetchAll('teacher_classes', {}, '*'),
      fetchAll('teacher_subjects', {}, '*'),
      fetchAll('head_teacher_teachers', {}, '*')
    ]);
    const tc = tcRes.data || [];
    const ts = tsRes.data || [];
    const htt = httRes.data || [];

    renderTable({
      container: document.getElementById('assignments-table'),
      columns: [
        { key: 'teacher', label: 'Teacher' },
        { key: 'class', label: 'Class' },
        { key: 'section', label: 'Section' },
        { key: 'year', label: 'Academic Year' }
      ],
      data: tc.map(a => ({
        id: a.id,
        teacher: tName(a.teacher_id),
        class: cName(a.class_id),
        section: sName(a.section_id),
        year: yearName(a.academic_year_id)
      })),
      actions: [{ id: 'remove', label: 'Remove', type: 'danger', onClick: removeAssignment }]
    });

    renderTable({
      container: document.getElementById('assignments-subjects'),
      columns: [
        { key: 'teacher', label: 'Teacher' },
        { key: 'subject', label: 'Subject' },
        { key: 'class', label: 'Class' },
        { key: 'section', label: 'Section' }
      ],
      data: ts.map(a => ({
        id: a.id,
        teacher: tName(a.teacher_id),
        subject: subName(a.subject_id),
        class: cName(a.class_id),
        section: sName(a.section_id)
      })),
      actions: [{ id: 'remove', label: 'Remove', type: 'danger', onClick: removeSubject }]
    });

    renderTable({
      container: document.getElementById('assignments-coverage'),
      columns: [
        { key: 'headTeacher', label: 'Head Teacher' },
        { key: 'teacher', label: 'Teacher' },
        { key: 'year', label: 'Academic Year' }
      ],
      data: htt.map(a => ({
        id: a.id,
        headTeacher: htName(a.head_teacher_id),
        teacher: tName(a.teacher_id),
        year: yearName(a.academic_year_id)
      })),
      actions: [{ id: 'remove', label: 'Unlink', type: 'danger', onClick: removeCoverage }]
    });
  }

  function removeAssignment(id) {
    confirmDialog('Remove Assignment', 'Remove this class assignment from the teacher?', async () => {
      if (isDemo()) { showToast('Demo mode: assignment not removed', 'info'); return; }
      const res = await deleteRecord('teacher_classes', id);
      if (res.error) { showToast(res.error.message || 'Remove failed', 'danger'); return; }
      showToast('Assignment removed', 'success');
      renderAll();
    });
  }

  function removeSubject(id) {
    confirmDialog('Remove Subject', 'Remove this subject assignment?', async () => {
      if (isDemo()) { showToast('Demo mode: subject not removed', 'info'); return; }
      const res = await deleteRecord('teacher_subjects', id);
      if (res.error) { showToast(res.error.message || 'Remove failed', 'danger'); return; }
      showToast('Subject assignment removed', 'success');
      renderAll();
    });
  }

  function removeCoverage(id) {
    confirmDialog('Unlink', 'Unlink this teacher from the head teacher?', async () => {
      if (isDemo()) { showToast('Demo mode: link not removed', 'info'); return; }
      const res = await deleteRecord('head_teacher_teachers', id);
      if (res.error) { showToast(res.error.message || 'Unlink failed', 'danger'); return; }
      showToast('Link removed', 'success');
      renderAll();
    });
  }

  function teacherOptions() {
    return (teachers.data || []).map(t => ({ value: t.id, label: t.profiles?.full_name || t.id }));
  }

  document.getElementById('assign-class-btn')?.addEventListener('click', () => {
    const formContainer = document.createElement('div');
    const close = openModal({ title: 'Assign Class to Teacher', content: formContainer, size: 'md' });
    renderForm({
      container: formContainer,
      fields: [
        { key: 'teacher_id', label: 'Teacher', type: 'select', required: true, options: teacherOptions() },
        { key: 'class_id', label: 'Class', type: 'select', required: true, options: (classes.data || []).map(c => ({ value: c.id, label: c.name })) },
        { key: 'section_id', label: 'Section', type: 'select', required: true, options: (sections.data || []).map(s => ({ value: s.id, label: s.name })) },
        { key: 'academic_year_id', label: 'Academic Year', type: 'select', required: true, options: (years.data || []).map(y => ({ value: y.id, label: y.name + (y.is_current ? ' (current)' : '') })) }
      ],
      onSubmit: async (values) => {
        if (isDemo()) { showToast('Demo mode: assignment not saved', 'info'); return; }
        const res = await insertRecord('teacher_classes', values);
        if (res.error) {
          showToast(res.error.message.includes('duplicate') ? 'This assignment already exists' : res.error.message, 'danger');
          return;
        }
        showToast('Class assigned', 'success');
        close();
        renderAll();
      }
    });
  });

  document.getElementById('assign-subject-btn')?.addEventListener('click', () => {
    const formContainer = document.createElement('div');
    const close = openModal({ title: 'Assign Subject to Teacher', content: formContainer, size: 'md' });
    renderForm({
      container: formContainer,
      fields: [
        { key: 'teacher_id', label: 'Teacher', type: 'select', required: true, options: teacherOptions() },
        { key: 'subject_id', label: 'Subject', type: 'select', required: true, options: (subjects.data || []).map(s => ({ value: s.id, label: s.name })) },
        { key: 'class_id', label: 'Class', type: 'select', required: true, options: (classes.data || []).map(c => ({ value: c.id, label: c.name })) },
        { key: 'section_id', label: 'Section', type: 'select', required: true, options: (sections.data || []).map(s => ({ value: s.id, label: s.name })) }
      ],
      onSubmit: async (values) => {
        if (isDemo()) { showToast('Demo mode: assignment not saved', 'info'); return; }
        const res = await insertRecord('teacher_subjects', values);
        if (res.error) { showToast(res.error.message || 'Assign failed', 'danger'); return; }
        showToast('Subject assigned', 'success');
        close();
        renderAll();
      }
    });
  });

  // Head-teacher ↔ teacher coverage links
  const addCoverageBtn = document.createElement('button');
  addCoverageBtn.className = 'btn btn-primary btn-sm';
  addCoverageBtn.textContent = '+ Manage Coverage';
  addCoverageBtn.style.marginBottom = '12px';
  document.getElementById('assignments-coverage').before(addCoverageBtn);
  addCoverageBtn.addEventListener('click', () => {
    const formContainer = document.createElement('div');
    const close = openModal({ title: 'Link Teacher to Head Teacher', content: formContainer, size: 'md' });
    renderForm({
      container: formContainer,
      fields: [
        { key: 'head_teacher_id', label: 'Head Teacher', type: 'select', required: true, options: (headTeachers.data || []).map(h => ({ value: h.id, label: h.profiles?.full_name || h.id })) },
        { key: 'teacher_id', label: 'Teacher', type: 'select', required: true, options: teacherOptions() },
        { key: 'academic_year_id', label: 'Academic Year', type: 'select', required: true, options: (years.data || []).map(y => ({ value: y.id, label: y.name + (y.is_current ? ' (current)' : '') })) }
      ],
      onSubmit: async (values) => {
        if (isDemo()) { showToast('Demo mode: link not saved', 'info'); return; }
        const res = await insertRecord('head_teacher_teachers', values);
        if (res.error) {
          showToast(res.error.message.includes('duplicate') ? 'This link already exists' : res.error.message, 'danger');
          return;
        }
        showToast('Coverage link created', 'success');
        close();
        renderAll();
      }
    });
  });

  await renderAll();
}

// ------------------------------------------------------------------
// Reports
// ------------------------------------------------------------------
async function renderReports(container) {
  document.getElementById('page-title').textContent = 'Reports';
  container.innerHTML = `
    <h2 style="margin-bottom:24px;">Reports</h2>
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">👥</div><div><div class="stat-value" id="rep-users">–</div><div class="stat-label">Total Users</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">🏫</div><div><div class="stat-value" id="rep-classes">–</div><div class="stat-label">Classes</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">👶</div><div><div class="stat-value" id="rep-students">–</div><div class="stat-label">Students</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(155,89,182,0.1);color:var(--color-purple);">📝</div><div><div class="stat-value" id="rep-homework">–</div><div class="stat-label">Homework Entries</div></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Report Generation</h3></div>
      <div class="card-body"><p style="color:var(--color-gray);">Live counts are shown above. Detailed reporting for attendance, homework, exam results, and teacher performance can be generated from linked data.</p></div>
    </div>`;

  const counts = await Promise.all([
    fetchCount('profiles'), fetchCount('classes'), fetchCount('students'), fetchCount('homework')
  ]);
  setStat('rep-users', counts[0].count ?? '–');
  setStat('rep-classes', counts[1].count ?? '–');
  setStat('rep-students', counts[2].count ?? '–');
  setStat('rep-homework', counts[3].count ?? '–');
}

// ------------------------------------------------------------------
// Settings
// ------------------------------------------------------------------
async function renderSettings(container) {
  document.getElementById('page-title').textContent = 'System Settings';
  container.innerHTML = `
    <h2 style="margin-bottom:24px;">System Settings</h2>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>General</h3></div>
        <div class="card-body">
          <div class="form-group"><label>School Name</label><input type="text" class="form-control" id="set-school-name" value="Little Stars Kindergarten"></div>
          <div class="form-group"><label>School Email</label><input type="email" class="form-control" id="set-school-email" value="info@littlestars.edu"></div>
          <div class="form-group"><label>School Phone</label><input type="tel" class="form-control" id="set-school-phone" value="+1 (555) 123-4567"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Escalation Rules</h3></div>
        <div class="card-body">
          <div class="form-group"><label>Escalation Period (days)</label><input type="number" class="form-control" id="escalation-days" value="5"></div>
          <p style="color:var(--color-gray);font-size:0.85rem;margin-bottom:16px;">Tasks/feedback overdue by this many days will be escalated to the head_teacher.</p>
          <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
        </div>
      </div>
    </div>
    <div class="card"><div class="card-header"><h3>Escalation Rule</h3></div>
      <div class="card-body"><p style="color:var(--color-gray);font-size:0.9rem;">To change the escalation period in your live Supabase project, update the <code>system_settings</code> table (key <code>escalation_days</code>).</p></div>
    </div>`;

  // Load live values if available
  const { data: settings } = await fetchAll('system_settings', {}, '*').catch(() => ({ data: null }));
  if (settings && settings.length) {
    const find = (k) => settings.find(s => s.key === k)?.value;
    if (find('escalation_days')) document.getElementById('escalation-days').value = find('escalation_days');
    if (find('school_name')) document.getElementById('set-school-name').value = find('school_name');
  }

  document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
    const escDays = document.getElementById('escalation-days').value || '5';
    const schoolName = document.getElementById('set-school-name').value.trim();
    const schoolEmail = document.getElementById('set-school-email').value.trim();
    const schoolPhone = document.getElementById('set-school-phone').value.trim();
    if (isDemo()) {
      showToast('Settings saved (demo mode)', 'success');
      return;
    }
    const entries = [
      { key: 'escalation_days', value: String(escDays) },
      { key: 'school_name', value: schoolName },
      { key: 'school_email', value: schoolEmail },
      { key: 'school_phone', value: schoolPhone }
    ];
    const c = getSupabase();
    const { error } = await c.from('system_settings').upsert(entries, { onConflict: 'key' });
    if (error) {
      showToast(error.message || 'Error saving settings', 'danger');
      return;
    }
    showToast('Settings saved', 'success');
  });
}

// ------------------------------------------------------------------
// Audit Log
// ------------------------------------------------------------------
async function renderAuditLog(container) {
  document.getElementById('page-title').textContent = 'Audit Log';
  container.innerHTML = `
    <div class="section-header"><h2>Audit Log</h2></div>
    <div class="card"><div class="card-body" id="audit-table"></div></div>`;

  const { data: logs, fromDb } = await fetchAllOrDemo('audit_logs', [
    { id: '1', user: 'Admin User', action: 'INSERT', table: 'profiles', record_id: 'u-001', created_at: '2026-08-26 10:30' },
    { id: '2', user: 'Sarah Johnson', action: 'UPDATE', table: 'attendance_records', record_id: 'a-042', created_at: '2026-08-26 09:15' }
  ], {}, '*, profiles(full_name)');

  let rows = logs;
  if (fromDb && logs && logs.length) {
    rows = logs.map(l => ({
      id: l.id,
      user: l.profiles?.full_name || l.user_id || 'System',
      action: l.action,
      table: l.table_name,
      record_id: l.record_id || '–',
      created_at: new Date(l.created_at).toLocaleString()
    }));
  }

  const { renderTable } = await import('../../components/table.js');
  renderTable({
    container: document.getElementById('audit-table'),
    columns: [
      { key: 'created_at', label: 'Date/Time' },
      { key: 'user', label: 'User' },
      { key: 'action', label: 'Action', render: (v) => `<span class="badge status-${v === 'INSERT' ? 'present' : v === 'UPDATE' ? 'in_progress' : 'absent'}">${v}</span>` },
      { key: 'table', label: 'Table' },
      { key: 'record_id', label: 'Record ID' }
    ],
    data: rows
  });
}