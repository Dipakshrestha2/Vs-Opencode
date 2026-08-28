import { registerRoute } from '../../router.js';
import { showToast } from '../../components/toast.js';
import { getState } from '../../state.js';
import { fetchAll, insertRecord, updateRecord, createNotification, getSupabase, isDemo } from '../../api.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { renderForm } from '../../components/form.js';

export function registerRoutes() {
  registerRoute('/teacher/dashboard', renderTeacherDashboard);
  registerRoute('/teacher/classes', renderClasses);
  registerRoute('/teacher/attendance', renderAttendance);
  registerRoute('/teacher/homework', renderHomework);
  registerRoute('/teacher/exams', renderExams);
  registerRoute('/teacher/tasks', renderTasks);
  registerRoute('/teacher/feedback', renderFeedback);
  registerRoute('/teacher/calendar', renderCalendarView);
  registerRoute('/teacher/notifications', renderNotifications);
  registerRoute('/teacher/announcements', renderAnnouncements);
}

async function renderNotifications(container) {
  const { renderNotificationsPage } = await import('../../components/notifications.js');
  await renderNotificationsPage(container);
}

async function renderAnnouncements(container) {
  const { renderAnnouncementsPage } = await import('../../components/announcements.js');
  await renderAnnouncementsPage(container);
}

async function getTeacher() {
  const profile = getState().profile;
  const client = getSupabase();
  if (!client || !profile) return null;
  const { data } = await client.from('teachers').select('id').eq('profile_id', profile.id).maybeSingle().catch(() => ({ data: null }));
  return data;
}

async function renderTeacherDashboard(container) {
  document.getElementById('page-title').textContent = 'Teacher Dashboard';
  const profile = getState().profile;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--color-blue);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:white;font-weight:700;">${profile.full_name ? profile.full_name[0].toUpperCase() : 'T'}</div>
      <div><h2 style="margin-bottom:4px;">Welcome${profile.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}!</h2><p style="color:var(--color-gray);">Teacher Dashboard</p></div>
    </div>
    <div class="dashboard-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(77,150,255,0.1);color:var(--color-blue);">🏫</div><div><div class="stat-value" id="stat-classes">–</div><div class="stat-label">My Classes</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(107,203,119,0.1);color:var(--color-green);">👶</div><div><div class="stat-value" id="stat-students">–</div><div class="stat-label">My Students</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,169,77,0.1);color:var(--color-orange);">📝</div><div><div class="stat-value" id="stat-tasks">–</div><div class="stat-label">Tasks Assigned</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,107,107,0.1);color:var(--color-red);">⏰</div><div><div class="stat-value" id="stat-overdue">–</div><div class="stat-label">Overdue</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Today's Attendance</h3><a href="#/teacher/attendance" class="btn btn-sm btn-primary">Take Attendance</a></div>
        <div class="card-body"><p style="color:var(--color-gray);">Record student attendance for each class. Saved directly to your school database.</p></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>My Homework</h3><a href="#/teacher/homework" class="btn btn-sm btn-secondary">View All</a></div>
        <div class="card-body" id="teacher-hw-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  const teacher = await getTeacher();
  if (!teacher) {
    document.getElementById('stat-classes').textContent = '–';
    document.getElementById('stat-students').textContent = '–';
    document.getElementById('stat-tasks').textContent = '–';
    document.getElementById('stat-overdue').textContent = '–';
    document.getElementById('teacher-hw-list').innerHTML = '<p style="color:var(--color-gray);">No teacher profile linked to this account yet.</p>';
    return;
  }

  const teacherId = teacher.id;
  const [tcRes, taskRes] = await Promise.all([
    fetchAll('teacher_classes', { teacher_id: teacherId }, 'class_id, section_id, classes(name), sections(name)').catch(() => ({ data: null })),
    fetchAll('tasks', { assigned_to: getState().profile?.id }, 'id, status, due_date').catch(() => ({ data: null }))
  ]);

  const classes = tcRes.data || [];
  document.getElementById('stat-classes').textContent = classes.length || '–';

  // student count via distinct students in those class/section pairs
  if (classes.length) {
    const studentIds = new Set();
    for (const c of classes.slice(0, 8)) {
      const { data } = await fetchAll('students', { class_id: c.class_id, section_id: c.section_id }, 'id').catch(() => ({ data: null }));
      (data || []).forEach(s => studentIds.add(s.id));
    }
    document.getElementById('stat-students').textContent = studentIds.size || '–';
  }

  const tasks = taskRes.data || [];
  document.getElementById('stat-tasks').textContent = tasks.length || '–';
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('stat-overdue').textContent = tasks.filter(t => t.due_date < today && !['completed', 'approved', 'rejected'].includes(t.status)).length || '–';

  const hwList = document.getElementById('teacher-hw-list');
  const { data: hw } = await fetchAll('homework', { teacher_id: teacherId }, 'title, due_date, status').catch(() => ({ data: null }));
  hwList.innerHTML = hw && hw.length
    ? hw.slice(0, 4).map(h => `<div class="recent-item"><div class="recent-icon">📝</div><div class="recent-info"><div class="recent-title">${h.title}</div><div class="recent-meta">Due ${h.due_date}</div></div><span class="badge status-${h.status}">${h.status.replace(/_/g, ' ')}</span></div>`).join('')
    : '<p style="color:var(--color-gray);">No homework yet.</p>';
}

async function renderClasses(container) {
  document.getElementById('page-title').textContent = 'My Classes';
  const teacher = await getTeacher();

  container.innerHTML = `<div class="card"><div class="card-body" id="students-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  const demoStudents = [
    { id: '1', name: 'Emma Wilson', age: 4, gender: 'F', parent: 'John Wilson', attendance: '95%' },
    { id: '2', name: 'Liam Brown', age: 4, gender: 'M', parent: 'Sarah Brown', attendance: '88%' },
    { id: '3', name: 'Olivia Davis', age: 3, gender: 'F', parent: 'Mike Davis', attendance: '92%' },
    { id: '4', name: 'Noah Miller', age: 4, gender: 'M', parent: 'Anna Miller', attendance: '90%' },
    { id: '5', name: 'Sophia Lee', age: 3, gender: 'F', parent: 'David Lee', attendance: '97%' }
  ];

  let rows = demoStudents;
  let title = 'Demo · KG1-A students';
  if (teacher) {
    const { data: tc, error } = await fetchAll('teacher_classes', { teacher_id: teacher.id }, 'class_id, section_id, classes(name), sections(name)');
    if (!error && tc && tc.length) {
      const first = tc[0];
      const classId = first.class_id;
      const sectionId = first.section_id;
      const { data: students, error: sErr } = await fetchAll('students', { class_id: classId, section_id: sectionId }, 'id, full_name, date_of_birth, gender');
      if (!sErr && students && students.length) {
        rows = students.map(s => ({
          id: s.id,
          name: s.full_name,
          age: s.date_of_birth ? Math.max(0, Math.floor((Date.now() - new Date(s.date_of_birth)) / (365.25 * 24 * 3600 * 1000))) : '–',
          gender: s.gender ? s.gender[0].toUpperCase() : '–',
          parent: '–',
          attendance: '–'
        }));
        title = `${first.classes?.name || ''}-${first.sections?.name || ''} · ${rows.length} students`;
      }
    }
  }

  container.innerHTML = `
    <div class="section-header"><h2>My Classes & Students</h2><span style="color:var(--color-gray);font-size:0.9rem;">${title}</span></div>
    <div class="card"><div class="card-body" id="students-table"></div></div>`;

  const { renderTable } = await import('../../components/table.js');
  renderTable({
    container: document.getElementById('students-table'),
    columns: [
      { key: 'name', label: 'Student Name' },
      { key: 'age', label: 'Age' },
      { key: 'gender', label: 'Gender' },
      { key: 'parent', label: 'Parent' },
      { key: 'attendance', label: 'Attendance' }
    ],
    data: rows
  });
}

async function renderAttendance(container) {
  document.getElementById('page-title').textContent = 'Take Attendance';
  const teacher = await getTeacher();

  let tcList = [];
  let currentClassId = null;
  let currentSectionId = null;

  if (teacher) {
    const { data: tc } = await fetchAll('teacher_classes', { teacher_id: teacher.id }, 'class_id, section_id, classes(name), sections(name)');
    if (tc && tc.length) {
      tcList = tc;
      currentClassId = tc[0].class_id;
      currentSectionId = tc[0].section_id;
    }
  }

  const options = tcList.map(t => `${t.classes?.name || ''} ${t.sections?.name || ''}`.trim());

  container.innerHTML = `
    <div class="section-header"><h2>Daily Attendance</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="date" class="form-control" id="att-date" value="${new Date().toISOString().split('T')[0]}" style="width:auto;">
        <select class="form-control" id="att-class" style="width:auto;">${options.map(o => `<option>${o}</option>`).join('')}</select>
        <button class="btn btn-primary" id="save-attendance-btn">Save Attendance</button>
      </div>
    </div>
    <div class="attendance-grid" id="attendance-grid"><div class="loading-spinner"><div class="spinner"></div></div></div>`;

  const grid = document.getElementById('attendance-grid');

  if (!teacher) {
    const demoStudents = [
      { id: '1', name: 'Emma Wilson' },
      { id: '2', name: 'Liam Brown' },
      { id: '3', name: 'Olivia Davis' },
      { id: '4', name: 'Noah Miller' },
      { id: '5', name: 'Sophia Lee' }
    ];
    renderAttendanceGrid(grid, demoStudents, true);
    return;
  }

  const { data: students, error } = await fetchAll('students', { class_id: currentClassId, section_id: currentSectionId }, 'id, full_name');
  if (!error && students && students.length) {
    renderAttendanceGrid(grid, students, false);
  } else {
    grid.innerHTML = `<p style="color:var(--color-gray);">No students found for the selected class yet.</p>`;
  }

  document.getElementById('att-class')?.addEventListener('change', (e) => {
    const idx = options.indexOf(e.target.value);
    const t = tcList[idx];
    if (t) loadStudentsFor(t.class_id, t.section_id);
  });

  async function loadStudentsFor(classId, sectionId) {
    currentClassId = classId;
    currentSectionId = sectionId;
    const { data } = await fetchAll('students', { class_id: classId, section_id: sectionId }, 'id, full_name');
    const g = document.getElementById('attendance-grid');
    if (data && data.length) renderAttendanceGrid(g, data, false);
    else g.innerHTML = '<p style="color:var(--color-gray);">No students found for this class.</p>';
  }

  document.getElementById('save-attendance-btn')?.addEventListener('click', async () => {
    const records = [];
    grid.querySelectorAll('.attendance-card').forEach(card => {
      if (card.dataset.status) {
        records.push({ student_id: card.dataset.student, status: card.dataset.status });
      }
    });
    if (!records.length) {
      showToast('Mark at least one student before saving', 'warning');
      return;
    }
    if (isDemo() || !getSupabase()) {
      showToast(`Attendance saved for ${records.length} students (demo mode)`, 'success');
      return;
    }
    const client = getSupabase();
    const date = document.getElementById('att-date').value;
    const classId = currentClassId;
    const sectionId = currentSectionId;
    const profile = getState().profile;

    // Create/load the attendance session for (class_id, section_id, date)
    let sessionId = null;
    const existing = await client.from('attendance').select('id').eq('class_id', classId).eq('section_id', sectionId).eq('date', date).maybeSingle();
    if (existing.data) {
      sessionId = existing.data.id;
    } else {
      const sessionRes = await client.from('attendance').insert({
        class_id: classId,
        section_id: sectionId,
        date,
        taken_by: profile?.id
      }).select().maybeSingle();
      if (sessionRes.error) {
        showToast(sessionRes.error.message || 'Failed to create attendance session', 'danger');
        return;
      }
      sessionId = sessionRes.data.id;
    }

    // Insert individual records (ignore duplicate conflicts via upsert)
    const { error } = await client.from('attendance_records').upsert(
      records.map(r => ({ attendance_id: sessionId, student_id: r.student_id, status: r.status, notes: '' })),
      { onConflict: 'attendance_id,student_id' }
    );
    if (error) {
      showToast(error.message || 'Failed to save attendance', 'danger');
      return;
    }
    showToast(`Attendance saved for ${records.length} students!`, 'success');
  });
}

function renderAttendanceGrid(grid, students, demo) {
  grid.innerHTML = students.map(s => `
    <div class="attendance-card" data-student="${s.id}" data-status="">
      <div class="student-avatar" style="width:36px;height:36px;border-radius:50%;background:var(--color-blue);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.8rem;">${s.full_name ? s.full_name[0] : '?'}</div>
      <div><div style="font-weight:600;font-size:0.9rem;">${s.full_name}</div></div>
      <div class="att-buttons" style="margin-left:auto;display:flex;gap:4px;">
        <button class="btn btn-sm btn-success att-btn" data-status="present" title="Present">✓</button>
        <button class="btn btn-sm btn-danger att-btn" data-status="absent" title="Absent">✕</button>
        <button class="btn btn-sm btn-secondary att-btn" data-status="late" title="Late">⏰</button>
      </div>
    </div>`).join('') + (demo ? '<p style="grid-column:1/-1;color:var(--color-gray);font-size:0.9rem;">Demo mode: saved locally only.</p>' : '');

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
}

async function getClassPairs(teacherId) {
  const { data } = await fetchAll('teacher_classes', { teacher_id: teacherId }, 'class_id, section_id, classes(name), sections(name)').catch(() => ({ data: [] }));
  return (data || []).map(t => ({
    value: t.class_id + '|' + t.section_id,
    label: `${t.classes?.name || 'Class'}${' ' + (t.sections?.name || '')}`.trim()
  }));
}

async function getSubjectOptions(teacherId) {
  const { data } = await fetchAll('teacher_subjects', { teacher_id: teacherId }, 'subject_id, subjects(name)').catch(() => ({ data: [] }));
  const fromTeacher = (data || []).map(t => ({ value: t.subject_id, label: t.subjects?.name || 'Subject' }));
  if (fromTeacher.length) return fromTeacher;
  const { data: all } = await fetchAll('subjects', {}, 'id, name').catch(() => ({ data: [] }));
  return (all || []).map(s => ({ value: s.id, label: s.name }));
}

function splitClassPair(pair) {
  const [classId, sectionId] = String(pair || '|').split('|');
  return { classId, sectionId };
}

async function renderHomework(container) {
  document.getElementById('page-title').textContent = 'Homework';
  const teacher = await getTeacher();

  container.innerHTML = `
    <div class="section-header"><h2>Homework</h2><button class="btn btn-primary" id="create-hw-btn">+ Create Homework</button></div>
    <div class="card"><div class="card-body" id="hw-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  async function load() {
    const { renderTable } = await import('../../components/table.js');
    const { data } = teacher
      ? await fetchAll('homework', { teacher_id: teacher.id }, 'id, title, due_date, status, subject_id, class_id, section_id, subjects(name), classes(name), sections(name)')
      : { data: [] };
    const hw = data || [];
    const { data: subCounts } = await fetchAll('homework_submissions', {}, 'homework_id, id').catch(() => ({ data: [] }));
    const countBy = (subCounts || []).reduce((a, r) => { a[r.homework_id] = (a[r.homework_id] || 0) + 1; return a; }, {});
    const { data: studentCounts } = await fetchAll('students', {}, 'class_id, section_id, id').catch(() => ({ data: [] }));
    const studentsIn = (classId, sectionId) => (studentCounts || []).filter(s => s.class_id === classId && s.section_id === sectionId).length;

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
      data: hw.map(h => ({
        id: h.id,
        title: h.title,
        class: `${h.classes?.name || ''}${h.sections ? '-' + h.sections.name : ''}`,
        subject: h.subjects?.name || '–',
        due_date: h.due_date,
        submissions: countBy[h.id] != null ? `${countBy[h.id]}/${studentsIn(h.class_id, h.section_id)}` : '0/0',
        status: h.status
      }))
    });
  }

  document.getElementById('create-hw-btn')?.addEventListener('click', async () => {
    if (isDemo() || !teacher) {
      showToast('Homework creation requires a configured database with your class assignments', 'info');
      return;
    }
    const classOptions = await getClassPairs(teacher.id);
    const subjectOptions = await getSubjectOptions(teacher.id);
    const formContainer = document.createElement('div');
    const close = openModal({ title: 'Create Homework', content: formContainer, size: 'md' });
    renderForm({
      container: formContainer,
      fields: [
        { key: 'title', label: 'Title', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'class_pair', label: 'Class', type: 'select', required: true, options: classOptions },
        { key: 'subject_id', label: 'Subject', type: 'select', required: true, options: subjectOptions },
        { key: 'due_date', label: 'Due Date', type: 'date', required: true }
      ],
      onSubmit: async (values) => {
        const { classId, sectionId } = splitClassPair(values.class_pair);
        const res = await insertRecord('homework', {
          teacher_id: teacher.id,
          class_id: classId,
          section_id: sectionId,
          subject_id: values.subject_id,
          title: values.title,
          description: values.description || null,
          due_date: values.due_date
        });
        if (res.error) { showToast(res.error.message || 'Failed to create homework', 'danger'); return; }
        showToast('Homework published', 'success');
        close();
        load();
      }
    });
  });

  await load();
}

async function renderExams(container) {
  document.getElementById('page-title').textContent = 'Exams & Results';
  const teacher = await getTeacher();
  const profile = getState().profile;

  container.innerHTML = `
    <div class="section-header"><h2>Exams</h2><button class="btn btn-primary" id="create-exam-btn">+ Create Exam</button></div>
    <div class="card"><div class="card-body" id="exam-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  async function load() {
    const { renderTable } = await import('../../components/table.js');
    const { data } = teacher
      ? await fetchAll('exams', { teacher_id: teacher.id }, 'id, title, exam_date, total_marks, class_id, section_id, subjects(name), classes(name), sections(name), results(id, status)')
      : { data: [] };
    const exams = data || [];

    renderTable({
      container: document.getElementById('exam-table'),
      columns: [
        { key: 'title', label: 'Exam' },
        { key: 'class', label: 'Class' },
        { key: 'subject', label: 'Subject' },
        { key: 'exam_date', label: 'Date' },
        { key: 'total_marks', label: 'Total Marks' },
        { key: 'status', label: 'Results', render: (v) => `<span class="badge status-${v === 'no results' ? 'absent' : (v === 'published' ? 'present' : 'in_progress')}">${v.replace(/_/g, ' ')}</span>` }
      ],
      data: exams.map(e => {
        const rs = e.results || [];
        let status = 'no results';
        if (rs.length) {
          if (rs.every(r => r.status === 'published')) status = 'published';
          else if (rs.some(r => ['submitted', 'under_review'].includes(r.status))) status = rs.find(r => ['submitted', 'under_review'].includes(r.status)).status;
          else status = 'draft';
        }
        return {
          id: e.id,
          title: e.title,
          class: `${e.classes?.name || ''}${e.sections ? '-' + e.sections.name : ''}`,
          subject: e.subjects?.name || '–',
          exam_date: e.exam_date,
          total_marks: e.total_marks,
          status
        };
      }),
      actions: [
        { id: 'results', label: 'Enter Results', type: 'primary', onClick: (id) => openResults(id, exams.find(x => x.id === id)) }
      ]
    });
  }

  document.getElementById('create-exam-btn')?.addEventListener('click', async () => {
    if (isDemo() || !teacher) {
      showToast('Exam creation requires a configured database with your class assignments', 'info');
      return;
    }
    const classOptions = await getClassPairs(teacher.id);
    const subjectOptions = await getSubjectOptions(teacher.id);
    const formContainer = document.createElement('div');
    const close = openModal({ title: 'Create Exam', content: formContainer, size: 'md' });
    renderForm({
      container: formContainer,
      fields: [
        { key: 'title', label: 'Exam Title', required: true },
        { key: 'class_pair', label: 'Class', type: 'select', required: true, options: classOptions },
        { key: 'subject_id', label: 'Subject', type: 'select', required: true, options: subjectOptions },
        { key: 'exam_date', label: 'Exam Date', type: 'date', required: true },
        { key: 'total_marks', label: 'Total Marks', type: 'number', required: true }
      ],
      onSubmit: async (values) => {
        const { classId, sectionId } = splitClassPair(values.class_pair);
        const res = await insertRecord('exams', {
          teacher_id: teacher.id,
          class_id: classId,
          section_id: sectionId,
          subject_id: values.subject_id,
          title: values.title,
          exam_date: values.exam_date,
          total_marks: Number(values.total_marks)
        });
        if (res.error) { showToast(res.error.message || 'Failed to create exam', 'danger'); return; }
        showToast('Exam created', 'success');
        close();
        load();
      }
    });
  });

  async function openResults(examId, exam) {
    if (isDemo() || !teacher || !exam) {
      showToast('Results entry requires a configured database', 'info');
      return;
    }
    const { data: students } = await fetchAll('students', { class_id: exam.class_id, section_id: exam.section_id }, 'id, full_name');
    const { data: existing } = await fetchAll('results', { exam_id: examId }, 'id, student_id, marks_obtained, remarks, status');
    if (!students || !students.length) {
      showToast('No students in this exam class yet', 'warning');
      return;
    }
    const byStudent = (existing || []).reduce((a, r) => { a[r.student_id] = r; return a; }, {});

    const formContainer = document.createElement('div');
    const close = openModal({ title: `Results · ${exam.title}`, content: formContainer, size: 'lg' });

    formContainer.innerHTML = `
      <p style="margin-bottom:12px;color:var(--color-gray);">Enter marks out of ${exam.total_marks}. Grades are optional.</p>
      <div style="max-height:400px;overflow-y:auto;">
        ${students.map(s => `
          <div style="display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #F0F0F0;">
            <div style="flex:1;font-weight:600;">${s.full_name}</div>
            <input type="number" class="form-control res-marks" data-student="${s.id}" placeholder="Marks" min="0" max="${exam.total_marks}" value="${byStudent[s.id]?.marks_obtained ?? ''}" style="width:110px;">
            <input type="text" class="form-control res-remarks" data-student="${s.id}" placeholder="Remarks" value="${byStudent[s.id]?.remarks ?? ''}" style="width:200px;">
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn btn-primary" id="res-save">Save Marks</button>
        <button class="btn btn-success" id="res-submit">Save & Submit for Review</button>
      </div>`;

    const marksValid = () => {
      for (const inp of formContainer.querySelectorAll('.res-marks')) {
        if (inp.value !== '') {
          const n = Number(inp.value);
          if (n < 0 || n > exam.total_marks || Number.isNaN(n)) {
            showToast(`Marks must be between 0 and ${exam.total_marks}`, 'danger');
            return false;
          }
        }
      }
      return true;
    };

    async function persist(submit) {
      if (!marksValid()) return;
      const rows = [];
      formContainer.querySelectorAll('.res-marks').forEach(inp => {
        const studentId = inp.dataset.student;
        if (inp.value === '') return;
        const remarkInput = formContainer.querySelector(`.res-remarks[data-student="${studentId}"]`);
        rows.push({
          exam_id: examId,
          student_id: studentId,
          marks_obtained: Number(inp.value),
          remarks: remarkInput?.value || '',
          status: submit ? 'submitted' : 'draft',
          entered_by: profile.id
        });
      });
      if (!rows.length) { showToast('Enter marks for at least one student', 'warning'); return; }
      const client = getSupabase();
      const { error } = await client.from('results').upsert(rows, { onConflict: 'exam_id,student_id' });
      if (error) { showToast(error.message || 'Could not save results', 'danger'); return; }
      if (submit) {
        const { error: sErr } = await client.from('results').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('exam_id', examId).neq('status', 'published').in('status', ['draft', 'submitted']);
        if (sErr) { showToast(sErr.message || 'Could not submit for review', 'danger'); return; }
        showToast('Results submitted for head teacher review', 'success');
      } else {
        showToast(`Saved marks for ${rows.length} student${rows.length > 1 ? 's' : ''}`, 'success');
      }
      close();
      load();
    }

    formContainer.querySelector('#res-save').addEventListener('click', () => persist(false));
    formContainer.querySelector('#res-submit').addEventListener('click', () => persist(true));
  }

  await load();
}

async function renderTasks(container) {
  document.getElementById('page-title').textContent = 'My Tasks';
  const profile = getState().profile;

  container.innerHTML = `
    <div class="section-header"><h2>Tasks from Head Teacher</h2></div>
    <div class="card"><div class="card-body" id="tasks-table"><div class="loading-spinner"><div class="spinner"></div></div></div></div>`;

  async function load() {
    const { renderTable } = await import('../../components/table.js');
    const { data } = profile
      ? await fetchAll('tasks', { assigned_to: profile.id }, 'id, title, status, due_date, priority, assigned_by')
      : { data: [] };
    const { data: nameData } = await fetchAll('profiles', {}, 'id, full_name').catch(() => ({ data: [] }));
    const tasks = data || [];

    renderTable({
      container: document.getElementById('tasks-table'),
      columns: [
        { key: 'title', label: 'Task' },
        { key: 'from', label: 'From' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge status-${v}">${v.replace(/_/g, ' ')}</span>` },
        { key: 'due_date', label: 'Due Date' },
        { key: 'priority', label: 'Priority', render: (v) => `<span class="priority-${v}">${(v || '').toUpperCase()}</span>` }
      ],
      data: tasks.map(t => ({
        id: t.id,
        title: t.title,
        from: nameData?.find(p => p.id === t.assigned_by)?.full_name || 'Head Teacher',
        status: t.status,
        due_date: t.due_date,
        priority: t.priority
      })),
      actions: [
        { id: 'comments', label: 'Comments', type: 'secondary', onClick: (id) => openComments(id, tasks.find(t => t.id === id)) },
        ...(tasks.some(t => t.status === 'assigned') ? [{ id: 'start', label: 'Start', type: 'primary', onClick: (id) => changeStatus(id, 'in_progress', 'Task started') }] : []),
        ...(tasks.some(t => t.status === 'in_progress') ? [{ id: 'submit', label: 'Submit', type: 'success', onClick: (id) => changeStatus(id, 'submitted', 'Task submitted for review') }] : [])
      ]
    });
  }

  function openComments(id, task) {
    import('../../components/task-comments.js').then(({ openTaskComments }) => openTaskComments(id, task?.title));
  }

  async function changeStatus(id, status, message) {
    const task = (await fetchAll('tasks', { id }, 'id, title, assigned_to, assigned_by, status')).data?.[0];
    if (isDemo() || !task) {
      showToast(`${message} (demo mode)`, 'success');
      load();
      return;
    }
    confirmDialog(status === 'submitted' ? 'Submit Task' : 'Start Task', status === 'submitted' ? `Submit "${task.title}" for review by your head teacher?` : `Start working on "${task.title}"?`, async () => {
      const res = await updateRecord('tasks', id, { status });
      if (res.error) { showToast(res.error.message || 'Update failed', 'danger'); return; }
      if (task.assigned_by && status === 'submitted') {
        await createNotification(task.assigned_by, 'Task Submitted', `"${task.title}" has been submitted for review.`, 'task', '#/head_teacher/submissions');
      }
      showToast(message, 'success');
      load();
    });
  }

  await load();
}

async function renderFeedback(container) {
  const { renderFeedbackPage } = await import('../../components/feedback.js');
  await renderFeedbackPage(container);
}

async function renderCalendarView(container) {
  document.getElementById('page-title').textContent = 'Calendar';
  container.innerHTML = `<div class="card"><div class="card-body" id="teacher-calendar"></div></div>`;

  let events = [
    { date: '2026-08-28', title: 'Report Due' },
    { date: '2026-09-15', title: 'Mid-Term Exam' }
  ];
  const { data, error } = await fetchAll('calendar_events', {}, 'title, start_date');
  if (!error && data && data.length) {
    events = data.map(e => ({ date: (e.start_date || '').slice(0, 10), title: e.title }));
  }

  const { renderCalendar } = await import('../../components/calendar.js');
  renderCalendar({ container: document.getElementById('teacher-calendar'), events });
}