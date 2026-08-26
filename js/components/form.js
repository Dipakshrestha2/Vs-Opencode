export function renderForm({ container, fields, values = {}, onSubmit, submitLabel = 'Save' }) {
  if (!container) return;
  let html = '<form class="dynamic-form" novalidate>';
  fields.forEach(field => {
    const val = values[field.key] !== undefined ? values[field.key] : (field.default || '');
    html += `<div class="form-group"><label class="form-label" for="${field.key}">${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label>`;
    switch (field.type) {
      case 'textarea':
        html += `<textarea id="${field.key}" name="${field.key}" class="form-control" rows="${field.rows || 3}" ${field.required ? 'required' : ''}>${val}</textarea>`;
        break;
      case 'select':
        html += `<select id="${field.key}" name="${field.key}" class="form-control" ${field.required ? 'required' : ''}><option value="">Select...</option>${(field.options || []).map(o => `<option value="${o.value}" ${o.value === val ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`;
        break;
      case 'checkbox':
        html += `<label class="form-check"><input type="checkbox" id="${field.key}" name="${field.key}" ${val ? 'checked' : ''} /> ${field.checkLabel || ''}</label>`;
        break;
      default:
        html += `<input type="${field.type || 'text'}" id="${field.key}" name="${field.key}" class="form-control" value="${val}" ${field.required ? 'required' : ''} ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''} />`;
    }
    html += '</div>';
  });
  html += `<div class="form-actions"><button type="submit" class="btn btn-primary">${submitLabel}</button></div></form>`;
  container.innerHTML = html;

  container.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const result = {};
    fields.forEach(field => {
      if (field.type === 'checkbox') result[field.key] = formData.has(field.key);
      else result[field.key] = formData.get(field.key);
    });
    if (onSubmit) onSubmit(result);
  });
}

export function getFormData(container) {
  const form = container.querySelector('form');
  if (!form) return {};
  const formData = new FormData(form);
  const result = {};
  for (const [key, val] of formData.entries()) result[key] = val;
  return result;
}
