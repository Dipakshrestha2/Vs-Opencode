import { registerRoute } from '../../router.js';
import { getState } from '../../state.js';
import { fetchAll, fetchCount, getSupabase } from '../../api.js';
import { getSelectedParentChild, childSelectorHtml, wireChildSelector } from '../../components/child-selector.js';

export function registerRoutes() {
  registerRoute('/parent/dashboard', renderParentDashboard);
  registerRoute('/parent/child-info', renderChildInfo);
  registerRoute('/parent/attendance', renderAttendance);
  registerRoute('/parent/homework', renderHomework);
  registerRoute('/parent/results', renderResults);
  registerRoute('/parent/feedback', renderFeedback);
  registerRoute('/parent/calendar', renderCalendarView);
  registerRoute('/parent/notifications', renderNotifications);
  registerRoute('/parent/announcements', renderAnnouncements);
}

async function renderNotifications(container) {
  const { renderNotificationsPage } = await import('../../components/notifications.js');
  await renderNotificationsPage(container);
}

async function renderAnnouncements(container) {
  const { renderAnnouncementsPage } = await import('../../components/announcements.js');
  await renderAnnouncementsPage(container);
}

const DEMO_CHILD = { id: 's1', full_name: 'Emma Wilson', class: 'KG1', section: 'A' };

async function getLinkedChildren() {
  const profile = getState().profile;
  const client = getSupabase();
  if (!client || !profile) return null;
  try {
    const { data: parent } = await client.from('parents').select('id').eq('profile_id', profile.id).maybeSingle();
    if (!parent) return null;
    const { data: links } = await client
      .from('parent_students')
      .select('student_id, students(full_name, date_of_birth, gender, class_id, section_id, classes(name), sections(name))')
      .eq('parent_id', parent.id);
    return (links || []).map(l => ({
      id: l.student_id,
      full_name: l.students?.full_name,
      date_of_birth: l.students?.date_of_birth,
      gender: l.students?.gender,
      class: l.students?.classes?.name,
      section: l.students?.sections?.name,
      student: l.students
    }));
  } catch (e) {
    return null;
  }
}

function childBadge(child) {
  return child ? `${child.full_name} · ${child.class || ''}${child.section ? '-' + child.section : ''}` : '';
}

async function renderParentDashboard(container) {
  document.getElementById('page-title').textContent = 'Parent Dashboard';
  const profile = getState().profile;
  const children = await getLinkedChildren();
  const child = getSelectedParentChild(children);

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--color-pink);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:white;font-weight:700;">${profile.full_name ? profile.full_name[0].toUpperCase() : 'P'}</div>
      <div><h2 style="margin-bottom:4px;">Welcome${profile.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}!</h2><p style="color:var(--color-gray);">Viewing: ${child ? childBadge(child) : (children && children.length === 0 ? 'No children linked yet' : 'Demo · Emma Wilson · KG1-A')}</p></div>
      ${childSelectorHtml(children, child)}
    </div>
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">✅</div><div><div class="stat-value" id="parent-att-rate">–</div><div class="stat-label">Attendance Rate</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">📝</div><div><div class="stat-value" id="parent-hw">–</div><div class="stat-label">Homework Due</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">📊</div><div><div class="stat-value" id="parent-avg">–</div><div class="stat-label">Avg Score</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(155,89,182,0.1);color:var(--color-purple);">💬</div><div><div class="stat-value" id="parent-msg">–</div><div class="stat-label">New Feedback</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Recent Homework</h3><a href="#/parent/homework" class="btn btn-sm btn-secondary">View All</a></div>
        <div class="card-body" id="parent-hw-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Teacher Feedback</h3><a href="#/parent/feedback" class="btn btn-sm btn-secondary">View All</a></div>
        <div class="card-body" id="parent-feedback-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  wireChildSelector(() => renderParentDashboard(container));

  if (!child) {
    // demo stats + lists
    document.getElementById('parent-att-rate').textContent = '95%';
    document.getElementById('parent-hw').textContent = '1';
    document.getElementById('parent-avg').textContent = '85%';
    document.getElementById('parent-msg').textContent = '2';
    document.getElementById('parent-hw-list').innerHTML = `
      <div class="recent-item"><div class="recent-icon">📝</div><div class="recent-info"><div class="recent-title">Counting Exercise</div><div class="recent-meta">Math · Due Aug 28 · Submitted</div></div><span class="badge status-present">Done</span></div>
      <div class="recent-item"><div class="recent-icon">📝</div><div class="recent-info"><div class="recent-title">Coloring Worksheet</div><div class="recent-meta">Art · Due Aug 30 · Pending</div></div><span class="badge status-in_progress">Pending</span></div>`;
    document.getElementById('parent-feedback-list').innerHTML = `
      <div class="recent-item"><div class="recent-icon">💬</div><div class="recent-info"><div class="recent-title">Great progress in math!</div><div class="recent-meta">From: Sarah Johnson · 2 days ago</div></div></div>
      <div class="recent-item"><div class="recent-icon">💬</div><div class="recent-info"><div class="recent-title">Keep up the good reading habits</div><div class="recent-meta">From: Sarah Johnson · 5 days ago</div></div></div>`;
    return;
  }

  // Live data for the linked child
  const classId = child.student?.class_id;
  const sectionId = child.student?.section_id;
  const studentId = child.id;

  const counts = await Promise.all([
    // attendance records for child
    fetchCount('attendance_records', { student_id: studentId, status: 'present' }).catch(() => ({ count: null })),
    fetchCount('attendance_records', { student_id: studentId }).catch(() => ({ count: null })),
    fetchCount('homework', { class_id: classId, section_id: sectionId }).catch(() => ({ count: null })),
    fetchCount('results', { student_id: studentId }).catch(() => ({ count: null }))
  ]);

  const present = counts[0].count;
  const total = counts[1].count;
  const homework = counts[2].count;
  const results = counts[3].count;

  document.getElementById('parent-att-rate').textContent = present != null && total ? Math.round((present / total) * 100) + '%' : '–';
  document.getElementById('parent-hw').textContent = homework != null ? homework : '–';
  document.getElementById('parent-avg').textContent = results ? '–' : '–';

  // recent homework rows
  const { data: hw } = await fetchAll('homework', { class_id: classId, section_id: sectionId }, 'id, title, due_date, status').catch(() => ({ data: null }));
  document.getElementById('parent-hw-list').innerHTML = hw && hw.length
    ? hw.slice(0, 4).map(h => `
        <div class="recent-item"><div class="recent-icon">📝</div><div class="recent-info"><div class="recent-title">${h.title}</div><div class="recent-meta">Due ${h.due_date}</div></div><span class="badge status-${h.status}">${h.status.replace(/_/g, ' ')}</span></div>`).join('')
    : '<p style="color:var(--color-gray);">No homework yet.</p>';

  // feedback mentioning this parent
  const { data: feedback } = await fetchAll('feedback', { to_user: profile.id }, 'id, subject, message, created_at').catch(() => ({ data: null }));
  document.getElementById('parent-feedback-list').innerHTML = feedback && feedback.length
    ? feedback.slice(0, 4).map(f => `
        <div class="recent-item"><div class="recent-icon">💬</div><div class="recent-info"><div class="recent-title">${f.subject}</div><div class="recent-meta">${new Date(f.created_at).toLocaleDateString()}</div></div></div>`).join('')
    : '<p style="color:var(--color-gray);">No feedback yet.</p>';
}

function getChildrenFallback() {
  return [{ ...DEMO_CHILD, id: 's1' }];
}

async function renderChildInfo(container) {
  document.getElementById('page-title').textContent = 'Child Information';
  const children = await getLinkedChildren();
  const list = children && children.length ? children : getChildrenFallback();
  const child = list[0];

  container.innerHTML = `
    <h2 style="margin-bottom:24px;">Child Information</h2>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Student Details</h3></div>
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="width:80px;height:80px;border-radius:50%;background:var(--color-pink);display:flex;align-items:center;justify-content:center;font-size:2rem;color:white;font-weight:700;">${child.full_name ? child.full_name[0].toUpperCase() : '?'}</div>
            <div><h3>${child.full_name || 'Student'}</h3><p style="color:var(--color-gray);">Student ID: ${child.id}</p></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div><strong>Age:</strong> ${child.date_of_birth ? Math.max(0, Math.floor((Date.now() - new Date(child.date_of_birth)) / (365.25 * 24 * 3600 * 1000))) + ' years' : '4 years'}</div>
            <div><strong>Gender:</strong> ${child.gender ? child.gender[0].toUpperCase() + child.gender.slice(1) : 'Female'}</div>
            <div><strong>Class:</strong> ${child.class || 'KG1'}</div>
            <div><strong>Section:</strong> ${child.section || 'A'}</div>
            <div><strong>Status:</strong> <span class="badge status-present">Active</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Parent Details</h3></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div><strong>Parent:</strong> ${getState().profile?.full_name || 'Parent'}</div>
            <div><strong>Relationship:</strong> Primary</div>
            <div><strong>Email:</strong> ${getState().profile?.email || '–'}</div>
          </div>
        </div>
      </div>
    </div>`;
}

async function renderAttendance(container) {
  document.getElementById('page-title').textContent = 'Attendance History';
  const children = await getLinkedChildren();
  const child = getSelectedParentChild(children);
  const name = child ? child.full_name : 'Emma Wilson';

  container.innerHTML = `
    <div class="section-header"><h2>Attendance - ${name}</h2>${childSelectorHtml(children, child)}</div>
    <div class="card"><div class="card-body" id="attendance-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  wireChildSelector(() => renderAttendance(container));

  const demoRecords = [
    { id: '1', date: '2026-08-26', status: 'present', notes: '' },
    { id: '2', date: '2026-08-25', status: 'present', notes: '' },
    { id: '3', date: '2026-08-24', status: 'absent', notes: 'Sick leave' },
    { id: '4', date: '2026-08-23', status: 'present', notes: '' }
  ];

  let rows = demoRecords;
  if (child) {
    const { data, error } = await fetchAll('attendance_records', { student_id: child.id }, 'id, status, notes, attendance(date)');
    if (!error && data && data.length) {
      rows = data.map(r => ({ id: r.id, date: r.attendance?.date || '–', status: r.status, notes: r.notes || '' }));
    }
  }

  const { renderTable } = await import('../../components/table.js');
  renderTable({
    container: document.getElementById('attendance-table'),
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v}</span>` },
      { key: 'notes', label: 'Notes' }
    ],
    data: rows
  });
}

async function renderHomework(container) {
  document.getElementById('page-title').textContent = 'Homework';
  const children = await getLinkedChildren();
  const child = getSelectedParentChild(children);
  const name = child ? child.full_name : 'Emma Wilson';
  const classId = child?.student?.class_id;
  const sectionId = child?.student?.section_id;

  container.innerHTML = `
    <div class="section-header"><h2>Homework - ${name}</h2>${childSelectorHtml(children, child)}</div>
    <div class="card"><div class="card-body" id="hw-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  wireChildSelector(() => renderHomework(container));

  const demoHomework = [
    { id: '1', title: 'Counting Exercise', subject: 'Math', teacher: 'Sarah Johnson', due_date: '2026-08-28', status: 'completed' },
    { id: '2', title: 'Coloring Worksheet', subject: 'Art', teacher: 'Rachel Kim', due_date: '2026-08-30', status: 'in_progress' }
  ];

  let rows = demoHomework;
  if (classId && sectionId) {
    const { data, error } = await fetchAll('homework', { class_id: classId, section_id: sectionId }, 'id, title, due_date, status, subjects(name), teachers(profiles(full_name))');
    if (!error && data && data.length) {
      rows = data.map(h => ({
        id: h.id,
        title: h.title,
        subject: h.subjects?.name || '–',
        teacher: h.teachers?.profiles?.full_name || '–',
        due_date: h.due_date,
        status: h.status
      }));
    }
  }

  const { renderTable } = await import('../../components/table.js');
  renderTable({
    container: document.getElementById('hw-table'),
    columns: [
      { key: 'title', label: 'Homework' },
      { key: 'subject', label: 'Subject' },
      { key: 'teacher', label: 'Teacher' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` }
    ],
    data: rows
  });
}

async function renderResults(container) {
  document.getElementById('page-title').textContent = 'Exam Results';
  const children = await getLinkedChildren();
  const child = getSelectedParentChild(children);
  const name = child ? child.full_name : 'Emma Wilson';

  container.innerHTML = `
    <div class="section-header"><h2>Results - ${name}</h2>${childSelectorHtml(children, child)}</div>
    <div class="card"><div class="card-body" id="results-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  wireChildSelector(() => renderResults(container));

  const demoResults = [
    { id: '1', exam: 'Mid-Term Math Test', subject: 'Math', date: '2026-09-15', marks: 42, total: 50, grade: 'A', remarks: 'Excellent' },
    { id: '2', exam: 'English Phonics Quiz', subject: 'English', date: '2026-09-10', marks: 25, total: 30, grade: 'A', remarks: 'Very Good' }
  ];

  let rows = demoResults;
  if (child) {
    // RLS guarantees only published results are returned.
    const { data, error } = await fetchAll('results', { student_id: child.id }, 'id, marks_obtained, grade, remarks, exams(title, exam_date, subjects(name), total_marks)');
    if (!error && data && data.length) {
      rows = data.map(r => ({
        id: r.id,
        exam: r.exams?.title || 'Exam',
        subject: r.exams?.subjects?.name || '–',
        date: r.exams?.exam_date || '–',
        marks: r.marks_obtained,
        total: r.exams?.total_marks || 0,
        grade: r.grade || '–',
        remarks: r.remarks || ''
      }));
    } else if (!error) {
      document.getElementById('results-table').innerHTML = '<p style="color:var(--color-gray);padding:16px;">No published results yet.</p>';
      return;
    }
  }

  const { renderTable } = await import('../../components/table.js');
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
    data: rows
  });
}

async function renderFeedback(container) {
  document.getElementById('page-title').textContent = 'Feedback';
  const profile = getState().profile;

  container.innerHTML = `
    <div class="section-header"><h2>Teacher Feedback</h2></div>
    <div class="card"><div class="card-body" id="feedback-list"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  const demoFeedback = [
    { id: '1', from: 'Sarah Johnson', subject: 'Great progress in math!', message: 'Emma has shown excellent improvement in number recognition.', date: '2026-08-24' }
  ];

  let rows = demoFeedback;
  if (profile) {
    const { data, error } = await fetchAll('feedback', { to_user: profile.id }, 'id, subject, message, created_at, from_user, profiles!feedback_from_user_fkey(full_name)');
    if (!error && data && data.length) {
      rows = data.map(f => ({
        id: f.id,
        from: f.profiles?.full_name || 'Teacher',
        subject: f.subject,
        message: f.message,
        date: new Date(f.created_at).toLocaleDateString()
      }));
    }
  }

  const el = document.getElementById('feedback-list');
  el.innerHTML = rows.map(f => `
    <div style="padding:16px;border-bottom:1px solid #F0F0F0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong>${f.subject}</strong>
        <span style="color:var(--color-gray);font-size:0.85rem;">${f.date}</span>
      </div>
      <p style="color:var(--color-gray);margin-bottom:4px;">From: ${f.from}</p>
      <p>${f.message}</p>
    </div>`).join('') || '<p style="color:var(--color-gray);padding:16px;">No feedback yet.</p>';
}

async function renderCalendarView(container) {
  document.getElementById('page-title').textContent = 'Calendar';
  container.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Calendar</h3></div>
      <div class="card-body" id="parent-calendar"></div>
    </div>`;

  const demoEvents = [
    { date: '2026-08-28', title: 'Homework Due' },
    { date: '2026-09-01', title: 'School Event' },
    { date: '2026-09-15', title: 'Mid-Term Exam' }
  ];

  let events = demoEvents;
  const { data, error } = await fetchAll('calendar_events', {}, 'title, start_date');
  if (!error && data && data.length) {
    events = data.map(e => ({ date: (e.start_date || '').slice(0, 10), title: e.title }));
  }

  const { renderCalendar } = await import('../../components/calendar.js');
  renderCalendar({ container: document.getElementById('parent-calendar'), events });
}