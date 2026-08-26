let modalContainer = null;

function getContainer() {
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'modal-root';
    document.body.appendChild(modalContainer);
  }
  return modalContainer;
}

export function openModal({ title, content, onClose, actions = [], size = 'md' }) {
  const root = getContainer();
  const sizes = { sm: '400px', md: '600px', lg: '800px' };
  root.innerHTML = `
    <div class="modal-overlay" data-modal-overlay>
      <div class="modal" style="max-width:${sizes[size] || sizes.md};">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" data-modal-close>&times;</button>
        </div>
        <div class="modal-body">${typeof content === 'string' ? content : ''}</div>
        ${actions.length ? `<div class="modal-footer">${actions.map(a => `<button class="btn btn-${a.type || 'secondary'}" data-modal-action="${a.id || ''}">${a.label}</button>`).join('')}</div>` : ''}
      </div>
    </div>`;
  if (typeof content !== 'string' && content instanceof HTMLElement) {
    root.querySelector('.modal-body').appendChild(content);
  }
  const overlay = root.querySelector('[data-modal-overlay]');
  const close = () => { root.innerHTML = ''; if (onClose) onClose(); };
  root.querySelector('[data-modal-close]').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  actions.forEach(a => {
    const btn = root.querySelector(`[data-modal-action="${a.id}"]`);
    if (btn && a.onClick) btn.addEventListener('click', () => { a.onClick(close); });
  });
  return close;
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

export function confirmDialog(title, message, onConfirm, confirmLabel = 'Confirm') {
  return openModal({
    title,
    content: `<p>${message}</p>`,
    size: 'sm',
    actions: [
      { id: 'cancel', label: 'Cancel', type: 'secondary', onClick: (close) => close() },
      { id: 'confirm', label: confirmLabel, type: 'danger', onClick: (close) => { onConfirm(); close(); } }
    ]
  });
}
