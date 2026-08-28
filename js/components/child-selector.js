import { getState } from '../state.js';

function storageKey() {
  const profile = getState().profile;
  return 'parent-child-' + (profile?.id || 'demo');
}

export function getSelectedParentChild(children) {
  if (!children || !children.length) return null;
  const saved = sessionStorage.getItem(storageKey());
  return children.find(c => String(c.id) === saved) || children[0];
}

export function saveSelectedParentChild(childId) {
  if (childId) sessionStorage.setItem(storageKey(), String(childId));
}

export function childSelectorHtml(children, selected) {
  if (!children || children.length <= 1) return '';
  return `
    <div style="display:flex;align-items:center;gap:8px;">
      <label for="child-selector" style="font-size:0.85rem;font-weight:600;color:var(--color-gray);">Child:</label>
      <select id="child-selector" class="form-control" style="width:auto;">
        ${children.map(c => `<option value="${c.id}" ${c.id === selected?.id ? 'selected' : ''}>${c.full_name} · ${c.class || ''}${c.section ? '-' + c.section : ''}</option>`).join('')}
      </select>
    </div>`;
}

export function wireChildSelector(onChange) {
  const sel = document.getElementById('child-selector');
  if (!sel) return;
  sel.addEventListener('change', (e) => {
    saveSelectedParentChild(e.target.value);
    if (typeof onChange === 'function') onChange();
  });
}