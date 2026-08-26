import { registerRoute } from '../../router.js';
import { showToast } from '../../components/toast.js';

export function registerRoutes() {
  registerRoute('/parent/dashboard', renderParentDashboard);
  registerRoute('/parent/child-info', renderChildInfo);
  registerRoute('/parent/attendance', renderAttendance);
  registerRoute('/parent/homework', renderHomework);
  registerRoute('/parent/results', renderResults);
  registerRoute('/parent/feedback', renderFeedback);
  registerRoute('/parent/calendar', renderCalendarView);
}

function renderParentDashboard(container) {
  document.getElementById('page-title').textContent = 'Parent Dashboard';
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--color-pink);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:white;font-weight:700;">E</div>
      <div><h2 style="margin-bottom:4px;">Welcome, Parent!</h2><p style="color:var(--color-gray);">Viewing: Emma Wilson · KG1-A</p></div>
    </div>
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">✅</div><div><div class="stat-value">95%</div><div class="stat-label">Attendance Rate</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">📝</div><div><div class="stat-value">8/10</div><div class="stat-label">Homework Done</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">📊</div><div><div class="stat-value">85%</div><div class="stat-label">Avg Score</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(155,89,182,0.1);color:var(--color-purple);">💬</div><div><div class="stat-value">2</div><div class="stat-label">New Messages</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Recent Homework</h3><a href="#/parent/homework" class="btn btn-sm btn-secondary">View All</a></div>
        <div class="card-body">
          <div class="recent-list">
            <div class="recent-item"><div class="recent-icon">📝</div><div class="recent-info"><div class="recent-title">Counting Exercise</div><div class="recent-meta">Math · Due Aug 28 · Submitted</div></div><span class="badge status-present">Done</span></div>
            <div class="recent-item"><div class="recent-icon">📝</div><div class="recent-info"><div class="recent-title">Coloring Worksheet</div><div class="recent-meta">Art · Due Aug 30 · Pending</div></div><span class="badge status-in_progress">Pending</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Teacher Feedback</h3><a href="#/parent/feedback" class="btn btn-sm btn-secondary">View All</a></div>
        <div class="card-body">
          <div class="recent-list">
            <div class="recent-item"><div class="recent-icon">💬</div><div class="recent-info"><div class="recent-title">Great progress in math!</div><div class="recent-meta">From: Sarah Johnson · 2 days ago</div></div></div>
            <div class="recent-item"><div class="recent-icon">💬</div><div class="recent-info"><div class="recent-title">Keep up the good reading habits</div><div class="recent-meta">From: Sarah Johnson · 5 days ago</div></div></div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderChildInfo(container) {
  document.getElementById('page-title').textContent = 'Child Information';
  container.innerHTML = `
    <h2 style="margin-bottom:24px;">Child Information</h2>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Student Details</h3></div>
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="width:80px;height:80px;border-radius:50%;background:var(--color-pink);display:flex;align-items:center;justify-content:center;font-size:2rem;color:white;font-weight:700;">E</div>
            <div><h3>Emma Wilson</h3><p style="color:var(--color-gray);">Student ID: STU-001</p></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div><strong>Age:</strong> 4 years</div>
            <div><strong>Gender:</strong> Female</div>
            <div><strong>Class:</strong> KG1-A</div>
            <div><strong>Section:</strong> A</div>
            <div><strong>Admission Date:</strong> Jan 2026</div>
            <div><strong>Status:</strong> <span class="badge status-present">Active</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Parent Details</h3></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div><strong>Parent:</strong> John Smith</div>
            <div><strong>Relationship:</strong> Father</div>
            <div><strong>Phone:</strong> +1 (555) 111-2222</div>
            <div><strong>Email:</strong> parent1@kindergarten.com</div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderAttendance(container) {
  document.getElementById('page-title').textContent = 'Attendance History';
  container.innerHTML = `
    <div class="section-header"><h2>Attendance - Emma Wilson</h2></div>
    <div class="dashboard-grid" style="margin-bottom:24px;">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">✅</div><div><div class="stat-value">19</div><div class="stat-label">Days Present</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,107,107,0.1);color:var(--color-red);">✕</div><div><div class="stat-value">1</div><div class="stat-label">Days Absent</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">⏰</div><div><div class="stat-value">0</div><div class="stat-label">Days Late</div></div></div>
    </div>
    <div class="card"><div class="card-body" id="attendance-table"></div></div>`;

  const records = [
    { id: '1', date: '2026-08-26', status: 'present', notes: '' },
    { id: '2', date: '2026-08-25', status: 'present', notes: '' },
    { id: '3', date: '2026-08-24', status: 'absent', notes: 'Sick leave' },
    { id: '4', date: '2026-08-23', status: 'present', notes: '' },
    { id: '5', date: '2026-08-22', status: 'present', notes: '' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('attendance-table'),
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v}</span>` },
        { key: 'notes', label: 'Notes' }
      ],
      data: records
    });
  });
}

function renderHomework(container) {
  document.getElementById('page-title').textContent = 'Homework';
  container.innerHTML = `
    <div class="section-header"><h2>Homework - Emma Wilson</h2></div>
    <div class="card"><div class="card-body" id="hw-table"></div></div>`;

  const homework = [
    { id: '1', title: 'Counting Exercise', subject: 'Math', teacher: 'Sarah Johnson', due_date: '2026-08-28', status: 'completed', submitted: true },
    { id: '2', title: 'Coloring Worksheet', subject: 'Art', teacher: 'Rachel Kim', due_date: '2026-08-30', status: 'in_progress', submitted: false },
    { id: '3', title: 'Letter Practice', subject: 'English', teacher: 'Sarah Johnson', due_date: '2026-08-25', status: 'completed', submitted: true }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('hw-table'),
      columns: [
        { key: 'title', label: 'Homework' },
        { key: 'subject', label: 'Subject' },
        { key: 'teacher', label: 'Teacher' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` },
        { key: 'submitted', label: 'Submitted', render: (v) => `<span class="badge ${v ? 'status-present' : 'status-absent'}">${v ? 'Yes' : 'No'}</span>` }
      ],
      data: homework
    });
  });
}

function renderResults(container) {
  document.getElementById('page-title').textContent = 'Exam Results';
  container.innerHTML = `
    <div class="section-header"><h2>Results - Emma Wilson</h2></div>
    <div class="card"><div class="card-body" id="results-table"></div></div>`;

  const results = [
    { id: '1', exam: 'Mid-Term Math Test', subject: 'Math', date: '2026-09-15', marks: 42, total: 50, grade: 'A', remarks: 'Excellent' },
    { id: '2', exam: 'English Phonics Quiz', subject: 'English', date: '2026-09-10', marks: 25, total: 30, grade: 'A', remarks: 'Very Good' },
    { id: '3', exam: 'Science Quiz', subject: 'Science', date: '2026-09-05', marks: 18, total: 25, grade: 'B+', remarks: 'Good' }
  ];

  import('../../components/table.js').then(({ renderTable }) => {
    renderTable({
      container: document.getElementById('results-table'),
      columns: [
        { key: 'exam', label: 'Exam' },
        { key: 'subject', label: 'Subject' },
        { key: 'date', label: 'Date' },
        { key: 'marks', label: 'Score', render: (v, r) => `${v}/${r.total}` },
        { key: 'grade', label: 'Grade', render: (v) => `<span class="badge status-present">${v}</span>` },
        { key: 'remarks', label: 'Remarks' }
      ],
      data: results
    });
  });
}

function renderFeedback(container) {
  document.getElementById('page-title').textContent = 'Feedback';
  container.innerHTML = `
    <div class="section-header"><h2>Teacher Feedback</h2></div>
    <div class="card"><div class="card-body" id="feedback-list"></div></div>`;

  const feedback = [
    { id: '1', from: 'Sarah Johnson', subject: 'Great progress in math!', message: 'Emma has shown excellent improvement in number recognition. She can now count to 20 independently.', date: '2026-08-24' },
    { id: '2', from: 'Sarah Johnson', subject: 'Keep up the good reading habits', message: 'Emma enjoys story time and participates actively. She is beginning to recognize sight words.', date: '2026-08-21' }
  ];

  container.querySelector('#feedback-list').innerHTML = feedback.map(f => `
    <div style="padding:16px;border-bottom:1px solid #F0F0F0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong>${f.subject}</strong>
        <span style="color:var(--color-gray);font-size:0.85rem;">${f.date}</span>
      </div>
      <p style="color:var(--color-gray);margin-bottom:4px;">From: ${f.from}</p>
      <p>${f.message}</p>
    </div>`).join('');
}

function renderCalendarView(container) {
  document.getElementById('page-title').textContent = 'Calendar';
  container.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Calendar</h3></div>
      <div class="card-body" id="parent-calendar"></div>
    </div>`;
  import('../../components/calendar.js').then(({ renderCalendar }) => {
    renderCalendar({
      container: document.getElementById('parent-calendar'),
      events: [
        { date: '2026-08-28', title: 'Homework Due' },
        { date: '2026-09-01', title: 'School Event' },
        { date: '2026-09-15', title: 'Mid-Term Exam' }
      ]
    });
  });
}
