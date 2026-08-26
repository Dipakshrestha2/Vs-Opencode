export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRequired(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

export function statusColor(status) {
  const colors = {
    assigned: 'var(--color-blue)',
    in_progress: 'var(--color-orange)',
    submitted: 'var(--color-yellow)',
    under_review: 'var(--color-purple)',
    approved: 'var(--color-green)',
    rejected: 'var(--color-red)',
    completed: 'var(--color-green)',
    overdue: 'var(--color-red)',
    escalated: 'var(--color-red)'
  };
  return colors[status] || 'var(--color-gray)';
}

export function statusLabel(status) {
  return status ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
