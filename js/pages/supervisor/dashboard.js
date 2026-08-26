import { registerRoute } from '../../router.js';
import { showToast } from '../../components/toast.js';

export function registerRoutes() {
  registerRoute('/supervisor/dashboard', renderSupervisorDashboard);
  registerRoute('/supervisor/teachers', renderTeachers);
  registerRoute('/supervisor/monitor', renderMonitor);
  registerRoute('/supervisor/tasks', renderTasks);
  registerRoute('/supervisor/submissions', renderSubmissions);
  registerRoute('/supervisor/escalations', renderEscalations);
  registerRoute('/supervisor/reports', renderReports);
  registerRoute('/supervisor/calendar', renderCalendar);
}

function renderSupervisorDashboard(container) {
  document.getElementById('page-title').textContent = 'Supervisor Dashboard';
  container.innerHTML = `
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">👩‍🏫</div><div><div class="stat-value">2</div><div class="stat-label">Assigned Teachers</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">📝</div><div><div class="stat-value">5</div><div class="stat-label">Pending Tasks</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,107,107,0.1);color:var(--color-red);">⚠️</div><div><div class="stat-value">1</div><div class="stat-label">Escalations</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">✅</div><div><div class="stat-value">12</div><div class="stat-label">Completed Tasks</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>My Teachers</h3><a href="#/supervisor/teachers" class="btn btn-sm btn-secondary">View All</a></div>
        <div class="card-body">
          <div class="recent-list">
            <div class="recent-item"><div class="recent-icon">👩‍🏫</div><div class="recent-info"><div class="recent-title">Sarah Johnson</div><div class="recent-meta">KG1 · 4 active tasks</div></div><span class="badge status-present">Active</span></div>
            <div class="recent-item"><div class="recent-icon">👨‍🏫</div><div class="recent-info"><div class="recent-title">Michael Chen</div><div class="recent-meta">KG2 · 3 active tasks</div></div><span class="badge status-present">Active</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Submissions</h3><a href="#/supervisor/submissions" class="btn btn-sm btn-secondary">View All</a></div>
        <div class="card-body">
          <div class="recent-list">
            <div class="recent-item"><div class="recent-icon">📤</div><div class="recent-info"><div class="recent-title">Sarah Johnson - KG1 Attendance Report</div><div class="recent-meta">Under Review · 2 hours ago</div></div></div>
            <div class="recent-item"><div class="recent-icon">📤</div><div class="recent-info"><div class="recent-title">Michael Chen - KG2 Homework Summary</div><div class="recent-meta">Submitted · 5 hours ago</div></div></div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderTeachers(container) {
  document.getElementById('page-title').textContent = 'Assigned Teachers';
  container.innerHTML = `
    <div class="section-header"><h2>My Teachers</h2></div>
    <div class="card"><div class="card-body" id="teachers-table"></div></div>`;

  const teachers = [
    { id: '1', name: 'Sarah Johnson', classes: 'KG1-A, KG1-B', subjects: 'Math, English', active_tasks: 4, attendance_rate: '95%' },
    { id: '2', name: 'Michael Chen', classes: 'KG2-A, KG2-B', subjects: 'Science, Math', active_tasks: 3, attendance_rate: '92%' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('teachers-table'),
      columns: [
        { key: 'name', label: 'Teacher' },
        { key: 'classes', label: 'Classes' },
        { key: 'subjects', label: 'Subjects' },
        { key: 'active_tasks', label: 'Active Tasks' },
        { key: 'attendance_rate', label: 'Attendance Rate' }
      ],
      data: teachers,
      actions: [{ id: 'monitor', label: 'Monitor', type: 'primary', onClick: (id) => { window.location.hash = '#/supervisor/monitor'; } }]
    });
  });
}

function renderMonitor(container) {
  document.getElementById('page-title').textContent = 'Monitor Activities';
  container.innerHTML = `
    <div class="section-header"><h2>Monitor</h2></div>
    <div class="tabs">
      <button class="tab active" data-tab="attendance">Attendance</button>
      <button class="tab" data-tab="homework">Homework</button>
      <button class="tab" data-tab="results">Results</button>
    </div>
    <div id="monitor-content">
      <div class="card"><div class="card-body">
        <div class="dashboard-grid">
          <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">✅</div><div><div class="stat-value">92%</div><div class="stat-label">KG1 Attendance Today</div></div></div>
          <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">✅</div><div><div class="stat-value">88%</div><div class="stat-label">KG2 Attendance Today</div></div></div>
          <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">📝</div><div><div class="stat-value">15</div><div class="stat-label">Homework Pending</div></div></div>
          <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">📊</div><div><div class="stat-value">82%</div><div class="stat-label">Avg Score</div></div></div>
        </div>
      </div></div>
    </div>`;

  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

function renderTasks(container) {
  document.getElementById('page-title').textContent = 'Manage Tasks';
  container.innerHTML = `
    <div class="section-header"><h2>Tasks</h2><button class="btn btn-primary" id="create-task-btn">+ Create Task</button></div>
    <div class="card"><div class="card-body" id="tasks-table"></div></div>`;

  const tasks = [
    { id: '1', title: 'KG1 Weekly Report', assigned_to: 'Sarah Johnson', status: 'in_progress', due_date: '2026-08-28', priority: 'high' },
    { id: '2', title: 'KG2 Lesson Plans', assigned_to: 'Michael Chen', status: 'submitted', due_date: '2026-08-30', priority: 'medium' },
    { id: '3', title: 'Attendance Review', assigned_to: 'Sarah Johnson', status: 'assigned', due_date: '2026-09-01', priority: 'low' },
    { id: '4', title: 'Parent Meeting Prep', assigned_to: 'Michael Chen', status: 'under_review', due_date: '2026-08-27', priority: 'high' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('tasks-table'),
      columns: [
        { key: 'title', label: 'Task' },
        { key: 'assigned_to', label: 'Assigned To' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` },
        { key: 'due_date', label: 'Due Date' },
        { key: 'priority', label: 'Priority', render: (v) => `<span class="priority-${v}">${v.toUpperCase()}</span>` }
      ],
      data: tasks,
      actions: [
        { id: 'edit', label: 'Edit', type: 'secondary', onClick: (id) => showToast('Edit task', 'info') }
      ]
    });
  });

  document.getElementById('create-task-btn')?.addEventListener('click', () => showToast('Create task form coming soon', 'info'));
}

function renderSubmissions(container) {
  document.getElementById('page-title').textContent = 'Review Submissions';
  container.innerHTML = `
    <div class="section-header"><h2>Submissions</h2></div>
    <div class="card"><div class="card-body" id="submissions-table"></div></div>`;

  const submissions = [
    { id: '1', teacher: 'Sarah Johnson', type: 'Attendance Report', title: 'KG1 Attendance - Aug 2026', status: 'under_review', submitted_at: '2026-08-26 10:30' },
    { id: '2', teacher: 'Michael Chen', type: 'Homework Summary', title: 'KG2 Homework Week 4', status: 'submitted', submitted_at: '2026-08-25 16:00' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('submissions-table'),
      columns: [
        { key: 'teacher', label: 'Teacher' },
        { key: 'type', label: 'Type' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` },
        { key: 'submitted_at', label: 'Submitted' }
      ],
      data: submissions,
      actions: [
        { id: 'approve', label: 'Approve', type: 'success', onClick: (id) => { showToast('Submission approved!', 'success'); } },
        { id: 'reject', label: 'Reject', type: 'danger', onClick: (id) => { showToast('Submission rejected', 'warning'); } }
      ]
    });
  });
}

function renderEscalations(container) {
  document.getElementById('page-title').textContent = 'Escalations';
  container.innerHTML = `
    <div class="section-header"><h2>Escalations</h2></div>
    <div class="card"><div class="card-body" id="escalations-table"></div></div>`;

  const escalations = [
    { id: '1', title: 'Overdue: KG1 Weekly Report', from: 'Sarah Johnson', reason: 'Overdue by 6 days', status: 'escalated', created_at: '2026-08-26' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('escalations-table'),
      columns: [
        { key: 'title', label: 'Issue' },
        { key: 'from', label: 'From' },
        { key: 'reason', label: 'Reason' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v}</span>` },
        { key: 'created_at', label: 'Date' }
      ],
      data: escalations,
      actions: [
        { id: 'resolve', label: 'Resolve', type: 'success', onClick: (id) => showToast('Escalation resolved', 'success') }
      ]
    });
  });
}

function renderReports(container) {
  document.getElementById('page-title').textContent = 'Supervisor Reports';
  container.innerHTML = `
    <h2 style="margin-bottom:24px;">Reports</h2>
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">📊</div><div><div class="stat-value">90%</div><div class="stat-label">Avg Attendance</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">✅</div><div><div class="stat-value">85%</div><div class="stat-label">Task Completion</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">📤</div><div><div class="stat-value">4</div><div class="stat-label">Pending Reviews</div></div></div>
    </div>`;
}

function renderCalendar(container) {
  document.getElementById('page-title').textContent = 'Calendar';
  container.innerHTML = `<div class="card"><div class="card-body" id="sup-calendar"></div></div>`;
  import('../../components/calendar.js').then(({ renderCalendar }) => {
    renderCalendar({
      container: document.getElementById('sup-calendar'),
      events: [
        { date: '2026-08-28', title: 'Parent Meeting' },
        { date: '2026-09-01', title: 'New Term Start' }
      ]
    });
  });
}
