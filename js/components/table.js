import { escapeHtml, debounce } from '../utils.js';

export function renderTable({ container, columns, data, actions = [], searchable = true, pagination = true, pageSize = 10, onRowClick = null }) {
  if (!container) return;
  let currentPage = 1;
  let sortCol = null;
  let sortDir = 'asc';
  let searchTerm = '';
  let filteredData = [...data];

  function getSortedData() {
    if (!sortCol) return filteredData;
    return [...filteredData].sort((a, b) => {
      const va = a[sortCol] || '';
      const vb = b[sortCol] || '';
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  function getPaginatedData() {
    const sorted = getSortedData();
    if (!pagination) return sorted;
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }

  function render() {
    const pageData = getPaginatedData();
    const totalPages = Math.ceil(filteredData.length / pageSize);

    let html = '';
    if (searchable) {
      html += `<div class="table-search"><input type="text" placeholder="Search..." value="${searchTerm}" class="table-search-input" /></div>`;
    }
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
    columns.forEach(col => {
      const arrow = sortCol === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      html += `<th data-sort="${col.key}" class="sortable">${col.label}${arrow}</th>`;
    });
    if (actions.length) html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    if (pageData.length === 0) {
      html += `<tr><td colspan="${columns.length + (actions.length ? 1 : 0)}" class="table-empty">No data found</td></tr>`;
    } else {
      pageData.forEach(row => {
        html += `<tr data-id="${row.id}" class="${onRowClick ? 'clickable' : ''}">`;
        columns.forEach(col => {
          const val = col.render ? col.render(row[col.key], row) : escapeHtml(String(row[col.key] || ''));
          html += `<td>${val}</td>`;
        });
        if (actions.length) {
          html += `<td class="table-actions">${actions.map(a => `<button class="btn btn-sm btn-${a.type || 'secondary'}" data-action="${a.id}" data-row-id="${row.id}">${a.label}</button>`).join('')}</td>`;
        }
        html += '</tr>';
      });
    }
    html += '</tbody></table></div>';
    if (pagination && totalPages > 1) {
      html += `<div class="table-pagination"><span class="page-info">Page ${currentPage} of ${totalPages}</span><div class="page-buttons"><button class="btn btn-sm" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button><button class="btn btn-sm" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}>Next →</button></div></div>`;
    }
    container.innerHTML = html;

    if (searchable) {
      const input = container.querySelector('.table-search-input');
      input?.addEventListener('input', debounce(e => {
        searchTerm = e.target.value.toLowerCase();
        filteredData = data.filter(row => columns.some(col => String(row[col.key] || '').toLowerCase().includes(searchTerm)));
        currentPage = 1;
        render();
      }, 250));
    }

    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortCol === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortCol = key; sortDir = 'asc'; }
        render();
      });
    });

    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.page === 'prev' && currentPage > 1) currentPage--;
        if (btn.dataset.page === 'next' && currentPage < totalPages) currentPage++;
        render();
      });
    });

    actions.forEach(a => {
      container.querySelectorAll(`[data-action="${a.id}"]`).forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); a.onClick(btn.dataset.rowId); });
      });
    });

    if (onRowClick) {
      container.querySelectorAll('tr[data-id]').forEach(tr => {
        tr.addEventListener('click', () => onRowClick(tr.dataset.id));
      });
    }
  }

  render();
  return { refresh: (newData) => { data = newData; filteredData = [...newData]; render(); } };
}
