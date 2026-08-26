import { registerRoute } from '../../router.js';
import { showToast } from '../../components/toast.js';

export function registerRoutes() {
  registerRoute('/teacher/dashboard', renderTeacherDashboard);
  registerRoute('/teacher/classes', renderClasses);
  registerRoute('/teacher/attendance', renderAttendance);
  registerRoute('/teacher/homework', renderHomework);
  registerRoute('/teacher/exams', renderExams);
  registerRoute('/teacher/tasks', renderTasks);
  registerRoute('/teacher/feedback', renderFeedback);
  registerRoute('/teacher/calendar', renderCalendarView);
}

function renderTeacherDashboard(container) {
  document.getElementById('page-title').textContent = 'Teacher Dashboard';
  container.innerHTML = `
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">🏫</div><div><div class="stat-value">2</div><div class="stat-label">My Classes</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">👶</div><div><div class="stat-value">14</div><div class="stat-label">Total Students</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">📝</div><div><div class="stat-value">3</div><div class="stat-label">Pending Tasks</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,107,107,0.1);color:var(--color-red);">⏰</div><div><div class="stat-value">1</div><div class="stat-label">Overdue Items</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Today's Attendance</h3><a href="#/teacher/attendance" class="btn btn-sm btn-primary">Take Attendance</a></div>
        <div class="card-body"><p style="color:var(--color-gray);">Attendance for today's classes. Click "Take Attendance" to record student attendance.</p></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Pending Tasks</h3><a href="#/teacher/tasks" class="btn btn-sm btn-secondary">View All</a></div>
        <div class="card-body">
          <div class="recent-list">
            <div class="recent-item"><div class="recent-icon">📌</div><div class="recent-info"><div class="recent-title">Submit Weekly Report</div><div class="recent-meta">Due: Aug 28 · High Priority</div></div></div>
            <div class="recent-item"><div class="recent-icon">📌</div><div class="recent-info"><div class="recent-title">Update Lesson Plans</div><div class="recent-meta">Due: Aug 30 · Medium Priority</div></div></div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderClasses(container) {
  document.getElementById('page-title').textContent = 'My Classes';
  container.innerHTML = `
    <div class="section-header"><h2>My Classes & Students</h2></div>
    <div class="tabs">
      <button class="tab active" data-tab="kg1a">KG1-A</button>
      <button class="tab" data-tab="kg1b">KG1-B</button>
    </div>
    <div class="card"><div class="card-body" id="students-table"></div></div>`;

  const students = [
    { id: '1', name: 'Emma Wilson', age: 4, gender: 'F', parent: 'John Wilson', attendance: '95%' },
    { id: '2', name: 'Liam Brown', age: 4, gender: 'M', parent: 'Sarah Brown', attendance: '88%' },
    { id: '3', name: 'Olivia Davis', age: 3, gender: 'F', parent: 'Mike Davis', attendance: '92%' },
    { id: '4', name: 'Noah Miller', age: 4, gender: 'M', parent: 'Anna Miller', attendance: '90%' },
    { id: '5', name: 'Sophia Lee', age: 3, gender: 'F', parent: 'David Lee', attendance: '97%' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('students-table'),
      columns: [
        { key: 'name', label: 'Student Name' },
        { key: 'age', label: 'Age' },
        { key: 'gender', label: 'Gender' },
        { key: 'parent', label: 'Parent' },
        { key: 'attendance', label: 'Attendance' }
      ],
      data: students
    });
  });

  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

function renderAttendance(container) {
  document.getElementById('page-title').textContent = 'Take Attendance';
  container.innerHTML = `
    <div class="section-header"><h2>Daily Attendance</h2>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}" style="width:auto;">
        <select class="form-control" style="width:auto;"><option>KG1-A</option><option>KG1-B</option></select>
        <button class="btn btn-primary" id="save-attendance-btn">Save Attendance</button>
      </div>
    </div>
    <div class="attendance-grid" id="attendance-grid"></div>`;

  const students = [
    { id: '1', name: 'Emma Wilson' },
    { id: '2', name: 'Liam Brown' },
    { id: '3', name: 'Olivia Davis' },
    { id: '4', name: 'Noah Miller' },
    { id: '5', name: 'Sophia Lee' }
  ];

  const grid = document.getElementById('attendance-grid');
  grid.innerHTML = students.map(s => `
    <div class="attendance-card" data-student="${s.id}" data-status="">
      <div class="student-avatar" style="width:36px;height:36px;border-radius:50%;background:var(--color-blue);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.8rem;">${s.name[0]}</div>
      <div><div style="font-weight:600;font-size:0.9rem;">${s.name}</div></div>
      <div class="att-buttons" style="margin-left:auto;display:flex;gap:4px;">
        <button class="btn btn-sm btn-success att-btn" data-status="present" title="Present">✓</button>
        <button class="btn btn-sm btn-danger att-btn" data-status="absent" title="Absent">✕</button>
        <button class="btn btn-sm btn-secondary att-btn" data-status="late" title="Late">⏰</button>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.attendance-card').forEach(card => {
    card.querySelectorAll('.att-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const status = btn.dataset.status;
        card.dataset.status = status;
        card.className = `attendance-card ${status}`;
        card.querySelectorAll('.att-btn').forEach(b => b.style.opacity = '0.4');
        btn.style.opacity = '1';
      });
    });
  });

  document.getElementById('save-attendance-btn')?.addEventListener('click', () => {
    const records = [];
    grid.querySelectorAll('.attendance-card').forEach(card => {
      if (card.dataset.status) {
        records.push({ student_id: card.dataset.student, status: card.dataset.status });
      }
    });
    showToast(`Attendance saved for ${records.length} students!`, 'success');
  });
}

function renderHomework(container) {
  document.getElementById('page-title').textContent = 'Homework';
  container.innerHTML = `
    <div class="section-header"><h2>Homework</h2><button class="btn btn-primary" id="create-hw-btn">+ Create Homework</button></div>
    <div class="card"><div class="card-body" id="hw-table"></div></div>`;

  const homework = [
    { id: '1', title: 'Counting Exercise', class: 'KG1-A', subject: 'Math', due_date: '2026-08-28', submissions: '3/5', status: 'in_progress' },
    { id: '2', title: 'Coloring Worksheet', class: 'KG1-A', subject: 'Art', due_date: '2026-08-30', submissions: '0/5', status: 'assigned' },
    { id: '3', title: 'Letter Recognition', class: 'KG1-B', subject: 'English', due_date: '2026-08-27', submissions: '5/5', status: 'completed' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('hw-table'),
      columns: [
        { key: 'title', label: 'Title' },
        { key: 'class', label: 'Class' },
        { key: 'subject', label: 'Subject' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'submissions', label: 'Submissions' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` }
      ],
      data: homework,
      actions: [{ id: 'edit', label: 'Edit', type: 'secondary', onClick: (id) => showToast('Edit homework', 'info') }]
    });
  });

  document.getElementById('create-hw-btn')?.addEventListener('click', () => showToast('Create homework form coming soon', 'info'));
}

function renderExams(container) {
  document.getElementById('page-title').textContent = 'Exams & Results';
  container.innerHTML = `
    <div class="section-header"><h2>Exams</h2><button class="btn btn-primary" id="create-exam-btn">+ Create Exam</button></div>
    <div class="card"><div class="card-body" id="exam-table"></div></div>`;

  const exams = [
    { id: '1', title: 'Mid-Term Math Test', class: 'KG1-A', subject: 'Math', exam_date: '2026-09-15', total_marks: 50, results_entered: true },
    { id: '2', title: 'English Phonics Quiz', class: 'KG1-B', subject: 'English', exam_date: '2026-09-20', total_marks: 30, results_entered: false }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('exam-table'),
      columns: [
        { key: 'title', label: 'Exam' },
        { key: 'class', label: 'Class' },
        { key: 'subject', label: 'Subject' },
        { key: 'exam_date', label: 'Date' },
        { key: 'total_marks', label: 'Total Marks' },
        { key: 'results_entered', label: 'Results', render: (v) => `<span class="badge ${v ? 'status-present' : 'status-absent'}">${v ? 'Entered' : 'Pending'}</span>` }
      ],
      data: exams,
      actions: [{ id: 'results', label: 'Enter Results', type: 'primary', onClick: (id) => showToast('Enter results form coming soon', 'info') }]
    });
  });

  document.getElementById('create-exam-btn')?.addEventListener('click', () => showToast('Create exam form coming soon', 'info'));
}

function renderTasks(container) {
  document.getElementById('page-title').textContent = 'My Tasks';
  container.innerHTML = `
    <div class="section-header"><h2>Tasks from Supervisor</h2></div>
    <div class="card"><div class="card-body" id="tasks-table"></div></div>`;

  const tasks = [
    { id: '1', title: 'Submit Weekly Report', from: 'Jane Supervisor', status: 'assigned', due_date: '2026-08-28', priority: 'high' },
    { id: '2', title: 'Update Lesson Plans', from: 'Jane Supervisor', status: 'in_progress', due_date: '2026-08-30', priority: 'medium' },
    { id: '3', title: 'Prepare Parent Meeting Notes', from: 'Jane Supervisor', status: 'submitted', due_date: '2026-08-27', priority: 'high' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('tasks-table'),
      columns: [
        { key: 'title', label: 'Task' },
        { key: 'from', label: 'From' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` },
        { key: 'due_date', label: 'Due Date' },
        { key: 'priority', label: 'Priority', render: (v) => `<span class="priority-${v}">${v.toUpperCase()}</span>` }
      ],
      data: tasks,
      actions: [
        { id: 'update', label: 'Update Status', type: 'primary', onClick: (id) => showToast('Update task status', 'info') }
      ]
    });
  });
}

function renderFeedback(container) {
  document.getElementById('page-title').textContent = 'Feedback';
  container.innerHTML = `
    <div class="section-header"><h2>Feedback</h2><button class="btn btn-primary" id="send-feedback-btn">+ Send Feedback</button></div>
    <div class="tabs">
      <button class="tab active">Received</button>
      <button class="tab">Sent</button>
    </div>
    <div class="card"><div class="card-body" id="feedback-table"></div></div>`;

  const feedback = [
    { id: '1', from: 'Jane Supervisor', subject: 'Great job on KG1 attendance', status: 'completed', created_at: '2026-08-25' },
    { id: '2', from: 'Jane Supervisor', subject: 'Review homework submission format', status: 'under_review', created_at: '2026-08-26' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('feedback-table'),
      columns: [
        { key: 'from', label: 'From' },
        { key: 'subject', label: 'Subject' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` },
        { key: 'created_at', label: 'Date' }
      ],
      data: feedback
    });
  });

  document.getElementById('send-feedback-btn')?.addEventListener('click', () => showToast('Send feedback form coming soon', 'info'));
}

function renderCalendarView(container) {
  document.getElementById('page-title').textContent = 'Calendar';
  container.innerHTML = `<div class="card"><div class="card-body" id="teacher-calendar"></div></div>`;
  import('../../components/calendar.js').then(({ renderCalendar }) => {
    renderCalendar({
      container: document.getElementById('teacher-calendar'),
      events: [
        { date: '2026-08-28', title: 'Report Due' },
        { date: '2026-09-15', title: 'Mid-Term Exam' }
      ]
    });
  });
}
