import { supabase } from './config.js';
import { getState, setState, clearState } from './state.js';
import { loadProfile, signOut, redirectByRole } from './auth.js';
import { initRouter, registerRoute, navigate } from './router.js';
import { showToast } from './components/toast.js';

const sidebarConfig = {
  admin: [
    { icon: '📊', label: 'Dashboard', route: '#/admin/dashboard' },
    { icon: '👥', label: 'Users', route: '#/admin/users' },
    { icon: '🏫', label: 'Classes', route: '#/admin/classes' },
    { icon: '📚', label: 'Subjects', route: '#/admin/subjects' },
    { icon: '📅', label: 'Academic Years', route: '#/admin/academic-years' },
    { icon: '🔗', label: 'Assignments', route: '#/admin/assignments' },
    { icon: '📈', label: 'Reports', route: '#/admin/reports' },
    { icon: '⚙️', label: 'Settings', route: '#/admin/settings' },
    { icon: '📋', label: 'Audit Log', route: '#/admin/audit-log' }
  ],
  head_teacher: [
    { icon: '📊', label: 'Dashboard', route: '#/head_teacher/dashboard' },
    { icon: '👩‍🏫', label: 'Teachers', route: '#/head_teacher/teachers' },
    { icon: '👁️', label: 'Monitor', route: '#/head_teacher/monitor' },
    { icon: '📝', label: 'Tasks', route: '#/head_teacher/tasks' },
    { icon: '📤', label: 'Submissions', route: '#/head_teacher/submissions' },
    { icon: '⚠️', label: 'Escalations', route: '#/head_teacher/escalations' },
    { icon: '📈', label: 'Reports', route: '#/head_teacher/reports' },
    { icon: '📅', label: 'Calendar', route: '#/head_teacher/calendar' }
  ],
  teacher: [
    { icon: '📊', label: 'Dashboard', route: '#/teacher/dashboard' },
    { icon: '🏫', label: 'My Classes', route: '#/teacher/classes' },
    { icon: '✅', label: 'Attendance', route: '#/teacher/attendance' },
    { icon: '📝', label: 'Homework', route: '#/teacher/homework' },
    { icon: '📋', label: 'Exams', route: '#/teacher/exams' },
    { icon: '📌', label: 'Tasks', route: '#/teacher/tasks' },
    { icon: '💬', label: 'Feedback', route: '#/teacher/feedback' },
    { icon: '📅', label: 'Calendar', route: '#/teacher/calendar' }
  ],
  parent: [
    { icon: '📊', label: 'Dashboard', route: '#/parent/dashboard' },
    { icon: '👶', label: 'Child Info', route: '#/parent/child-info' },
    { icon: '✅', label: 'Attendance', route: '#/parent/attendance' },
    { icon: '📝', label: 'Homework', route: '#/parent/homework' },
    { icon: '📈', label: 'Results', route: '#/parent/results' },
    { icon: '💬', label: 'Feedback', route: '#/parent/feedback' },
    { icon: '📅', label: 'Calendar', route: '#/parent/calendar' }
  ]
};

function renderSidebar(profile) {
  const items = sidebarConfig[profile.role] || [];
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">🌟 Little Stars</div>
    </div>
    <div class="sidebar-user">
      <div class="sidebar-avatar">${profile.full_name ? profile.full_name[0].toUpperCase() : '?'}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${profile.full_name || 'User'}</div>
        <div class="sidebar-user-role">${profile.role}</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${items.map(item => `<a href="${item.route}" class="sidebar-link"><span class="sidebar-icon">${item.icon}</span><span class="sidebar-label">${item.label}</span></a>`).join('')}
    </nav>
    <div class="sidebar-footer">
      <a href="index.html" class="sidebar-link"><span class="sidebar-icon">🏠</span><span class="sidebar-label">Home</span></a>
      <button id="btn-logout" class="sidebar-link sidebar-logout"><span class="sidebar-icon">🚪</span><span class="sidebar-label">Logout</span></button>
    </div>`;
  sidebar.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('open');
      document.getElementById('sidebar-overlay')?.classList.remove('active');
    });
  });
  document.getElementById('btn-logout')?.addEventListener('click', signOut);
}

function highlightActiveLink() {
  const hash = window.location.hash;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === hash);
  });
}

function setupMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  toggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
  });
}

async function initDashboard() {
  const profile = getState().profile;
  if (!profile) {
    window.location.href = 'login.html';
    return;
  }
  renderSidebar(profile);
  setupMobileMenu();
  window.addEventListener('hashchange', highlightActiveLink);
  highlightActiveLink();
  initRouter();
}

export async function boot() {
  if (!supabase) {
    console.warn('Supabase not configured. Running in demo mode.');
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    if (!window.location.pathname.includes('login') && !window.location.pathname.includes('index')) {
      window.location.href = 'login.html';
    }
    return;
  }
  const profile = await loadProfile(session.user.id);
  if (!profile) return;
  setState('profile', profile);
  sessionStorage.setItem('profile', JSON.stringify(profile));
}

export { initDashboard, sidebarConfig, highlightActiveLink };
