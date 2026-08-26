import { registerRoute } from '../../router.js';
import { showToast } from '../../components/toast.js';
import { getState } from '../../state.js';

export function registerRoutes() {
  registerRoute('/admin/dashboard', renderAdminDashboard);
  registerRoute('/admin/users', renderUsers);
  registerRoute('/admin/classes', renderClasses);
  registerRoute('/admin/subjects', renderSubjects);
  registerRoute('/admin/academic-years', renderAcademicYears);
  registerRoute('/admin/assignments', renderAssignments);
  registerRoute('/admin/reports', renderReports);
  registerRoute('/admin/settings', renderSettings);
  registerRoute('/admin/audit-log', renderAuditLog);
}

function renderAdminDashboard(container) {
  document.getElementById('page-title').textContent = 'Admin Dashboard';
  container.innerHTML = `
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">👥</div><div><div class="stat-value">6</div><div class="stat-label">Total Users</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">👩‍🏫</div><div><div class="stat-value">2</div><div class="stat-label">Teachers</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">👶</div><div><div class="stat-value">20</div><div class="stat-label">Students</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(155,89,182,0.1);color:var(--color-purple);">🏫</div><div><div class="stat-value">3</div><div class="stat-label">Classes</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Recent Activity</h3></div>
        <div class="card-body">
          <div class="recent-list">
            <div class="recent-item"><div class="recent-icon">👤</div><div class="recent-info"><div class="recent-title">New user registered</div><div class="recent-meta">2 hours ago</div></div></div>
            <div class="recent-item"><div class="recent-icon">📝</div><div class="recent-info"><div class="recent-title">Homework submitted</div><div class="recent-meta">3 hours ago</div></div></div>
            <div class="recent-item"><div class="recent-icon">✅</div><div class="recent-info"><div class="recent-title">Attendance recorded</div><div class="recent-meta">5 hours ago</div></div></div>
          </div>
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
}

function renderUsers(container) {
  document.getElementById('page-title').textContent = 'Manage Users';
  container.innerHTML = `
    <div class="section-header">
      <h2>Users</h2>
      <button class="btn btn-primary" id="add-user-btn">+ Add User</button>
    </div>
    <div class="card">
      <div class="card-body">
        <div id="users-table"></div>
      </div>
    </div>`;

  const users = [
    { id: '1', full_name: 'Admin User', email: 'admin@kindergarten.com', role: 'admin', is_active: true },
    { id: '2', full_name: 'Jane Supervisor', email: 'supervisor@kindergarten.com', role: 'supervisor', is_active: true },
    { id: '3', full_name: 'Sarah Johnson', email: 'teacher1@kindergarten.com', role: 'teacher', is_active: true },
    { id: '4', full_name: 'Michael Chen', email: 'teacher2@kindergarten.com', role: 'teacher', is_active: true },
    { id: '5', full_name: 'John Smith', email: 'parent1@kindergarten.com', role: 'parent', is_active: true },
    { id: '6', full_name: 'Maria Garcia', email: 'parent2@kindergarten.com', role: 'parent', is_active: true }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('users-table'),
      columns: [
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: (v) => `<span class="badge status-${v === 'admin' ? 'approved' : v === 'supervisor' ? 'under_review' : v === 'teacher' ? 'in_progress' : 'assigned'}">${v}</span>` },
        { key: 'is_active', label: 'Status', render: (v) => `<span class="badge ${v ? 'status-present' : 'status-absent'}">${v ? 'Active' : 'Inactive'}</span>` }
      ],
      data: users,
      actions: [
        { id: 'edit', label: 'Edit', type: 'secondary', onClick: (id) => showToast('Edit user: ' + id, 'info') },
        { id: 'delete', label: 'Delete', type: 'danger', onClick: (id) => showToast('Delete user: ' + id, 'warning') }
      ]
    });
  });

  document.getElementById('add-user-btn')?.addEventListener('click', () => showToast('Add user form coming soon', 'info'));
}

function renderClasses(container) {
  document.getElementById('page-title').textContent = 'Manage Classes';
  container.innerHTML = `
    <div class="section-header"><h2>Classes & Sections</h2><button class="btn btn-primary" id="add-class-btn">+ Add Class</button></div>
    <div class="card"><div class="card-body" id="classes-table"></div></div>`;

  const classes = [
    { id: '1', name: 'KG1', description: 'Foundation', sections: 'A, B', students: 7, teacher: 'Sarah Johnson' },
    { id: '2', name: 'KG2', description: 'Exploration', sections: 'A, B', students: 7, teacher: 'Michael Chen' },
    { id: '3', name: 'KG3', description: 'Preparation', sections: 'A, B', students: 6, teacher: 'Emily Davis' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('classes-table'),
      columns: [
        { key: 'name', label: 'Class' },
        { key: 'description', label: 'Description' },
        { key: 'sections', label: 'Sections' },
        { key: 'students', label: 'Students' },
        { key: 'teacher', label: 'Lead Teacher' }
      ],
      data: classes,
      actions: [{ id: 'edit', label: 'Edit', type: 'secondary', onClick: (id) => showToast('Edit class: ' + id, 'info') }]
    });
  });

  document.getElementById('add-class-btn')?.addEventListener('click', () => showToast('Add class form coming soon', 'info'));
}

function renderSubjects(container) {
  document.getElementById('page-title').textContent = 'Manage Subjects';
  container.innerHTML = `
    <div class="section-header"><h2>Subjects</h2><button class="btn btn-primary" id="add-subject-btn">+ Add Subject</button></div>
    <div class="card"><div class="card-body" id="subjects-table"></div></div>`;

  const subjects = [
    { id: '1', name: 'Math', description: 'Number concepts & basic arithmetic', icon: '🔢' },
    { id: '2', name: 'English', description: 'Language, reading & writing', icon: '📝' },
    { id: '3', name: 'Science', description: 'Discovery & exploration', icon: '🔬' },
    { id: '4', name: 'Art', description: 'Creative expression', icon: '🎨' },
    { id: '5', name: 'Music', description: 'Rhythm, songs & instruments', icon: '🎵' },
    { id: '6', name: 'Physical Education', description: 'Movement & motor skills', icon: '⚽' },
    { id: '7', name: 'Reading', description: 'Literacy & comprehension', icon: '📖' },
    { id: '8', name: 'Social Studies', description: 'Community & culture', icon: '🌍' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('subjects-table'),
      columns: [
        { key: 'icon', label: '', render: (v) => `<span style="font-size:1.3rem;">${v}</span>` },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' }
      ],
      data: subjects,
      actions: [{ id: 'edit', label: 'Edit', type: 'secondary', onClick: (id) => showToast('Edit subject', 'info') }]
    });
  });

  document.getElementById('add-subject-btn')?.addEventListener('click', () => showToast('Add subject form coming soon', 'info'));
}

function renderAcademicYears(container) {
  document.getElementById('page-title').textContent = 'Academic Years';
  container.innerHTML = `
    <div class="section-header"><h2>Academic Years</h2><button class="btn btn-primary">+ Add Year</button></div>
    <div class="card"><div class="card-body" id="years-table"></div></div>`;

  const years = [
    { id: '1', name: '2026-2027', start_date: '2026-01-01', end_date: '2026-12-31', is_current: true },
    { id: '2', name: '2025-2026', start_date: '2025-01-01', end_date: '2025-12-31', is_current: false }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('years-table'),
      columns: [
        { key: 'name', label: 'Academic Year' },
        { key: 'start_date', label: 'Start Date' },
        { key: 'end_date', label: 'End Date' },
        { key: 'is_current', label: 'Status', render: (v) => `<span class="badge ${v ? 'status-present' : ''}">${v ? 'Current' : 'Past'}</span>` }
      ],
      data: years
    });
  });
}

function renderAssignments(container) {
  document.getElementById('page-title').textContent = 'Teacher Assignments';
  container.innerHTML = `
    <div class="section-header"><h2>Teacher Assignments</h2><button class="btn btn-primary">+ New Assignment</button></div>
    <div class="card"><div class="card-body" id="assignments-table"></div></div>`;

  const assignments = [
    { id: '1', teacher: 'Sarah Johnson', class: 'KG1', section: 'A', subject: 'Math', year: '2026-2027' },
    { id: '2', teacher: 'Sarah Johnson', class: 'KG1', section: 'B', subject: 'English', year: '2026-2027' },
    { id: '3', teacher: 'Michael Chen', class: 'KG2', section: 'A', subject: 'Science', year: '2026-2027' },
    { id: '4', teacher: 'Michael Chen', class: 'KG2', section: 'B', subject: 'Math', year: '2026-2027' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('assignments-table'),
      columns: [
        { key: 'teacher', label: 'Teacher' },
        { key: 'class', label: 'Class' },
        { key: 'section', label: 'Section' },
        { key: 'subject', label: 'Subject' },
        { key: 'year', label: 'Year' }
      ],
      data: assignments,
      actions: [{ id: 'remove', label: 'Remove', type: 'danger', onClick: (id) => showToast('Remove assignment', 'warning') }]
    });
  });
}

function renderReports(container) {
  document.getElementById('page-title').textContent = 'Reports';
  container.innerHTML = `
    <h2 style="margin-bottom:24px;">Reports</h2>
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">📊</div><div><div class="stat-value">87%</div><div class="stat-label">Avg Attendance</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">📝</div><div><div class="stat-value">92%</div><div class="stat-label">Homework Completion</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">📈</div><div><div class="stat-value">78%</div><div class="stat-label">Avg Exam Score</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(155,89,182,0.1);color:var(--color-purple);">⚠️</div><div><div class="stat-value">3</div><div class="stat-label">Pending Escalations</div></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Report Generation</h3></div>
      <div class="card-body"><p style="color:var(--color-gray);">Full reporting module coming soon. Data is available for attendance, homework, exam results, and teacher performance.</p></div>
    </div>`;
}

function renderSettings(container) {
  document.getElementById('page-title').textContent = 'System Settings';
  container.innerHTML = `
    <h2 style="margin-bottom:24px;">System Settings</h2>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>General</h3></div>
        <div class="card-body">
          <div class="form-group"><label>School Name</label><input type="text" class="form-control" value="Little Stars Kindergarten"></div>
          <div class="form-group"><label>School Email</label><input type="email" class="form-control" value="info@littlestars.edu"></div>
          <div class="form-group"><label>School Phone</label><input type="tel" class="form-control" value="+1 (555) 123-4567"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Escalation Rules</h3></div>
        <div class="card-body">
          <div class="form-group"><label>Escalation Period (days)</label><input type="number" class="form-control" value="5" id="escalation-days"></div>
          <p style="color:var(--color-gray);font-size:0.85rem;margin-bottom:16px;">Tasks/feedback overdue by this many days will be escalated to the supervisor.</p>
          <div class="form-group"><label>Reminder Frequency (days)</label><input type="number" class="form-control" value="1"></div>
          <button class="btn btn-primary" onclick="alert('Settings saved!')">Save Settings</button>
        </div>
      </div>
    </div>`;
}

function renderAuditLog(container) {
  document.getElementById('page-title').textContent = 'Audit Log';
  container.innerHTML = `
    <div class="section-header"><h2>Audit Log</h2></div>
    <div class="card"><div class="card-body" id="audit-table"></div></div>`;

  const logs = [
    { id: '1', user: 'Admin User', action: 'INSERT', table: 'profiles', record_id: 'u-001', created_at: '2026-08-26 10:30' },
    { id: '2', user: 'Sarah Johnson', action: 'UPDATE', table: 'attendance_records', record_id: 'a-042', created_at: '2026-08-26 09:15' },
    { id: '3', user: 'Michael Chen', action: 'INSERT', table: 'homework', record_id: 'hw-015', created_at: '2026-08-25 14:00' },
    { id: '4', user: 'Admin User', action: 'UPDATE', table: 'results', record_id: 'r-008', created_at: '2026-08-25 11:20' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('audit-table'),
      columns: [
        { key: 'created_at', label: 'Date/Time' },
        { key: 'user', label: 'User' },
        { key: 'action', label: 'Action', render: (v) => `<span class="badge status-${v === 'INSERT' ? 'present' : v === 'UPDATE' ? 'in_progress' : 'absent'}">${v}</span>` },
        { key: 'table', label: 'Table' },
        { key: 'record_id', label: 'Record ID' }
      ],
      data: logs
    });
  });
}
