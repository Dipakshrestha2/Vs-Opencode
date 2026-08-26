let container = null;

function ensureContainer() {
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;max-width:360px;';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', duration = 4000) {
  const c = ensureContainer();
  const toast = document.createElement('div');
  const colors = { success: '#6BCB77', error: '#FF6B6B', warning: '#FFA94D', info: '#4D96FF' };
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  toast.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:12px 16px;border-radius:8px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:slideIn 0.3s ease;font-size:14px;cursor:pointer;`;
  toast.innerHTML = `<span style="font-size:16px;">${icons[type] || icons.info}</span><span>${message}</span>`;
  toast.addEventListener('click', () => toast.remove());
  c.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; setTimeout(() => toast.remove(), 300); }, duration);
}

if (!document.getElementById('toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = '@keyframes slideIn{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}';
  document.head.appendChild(style);
}
