export function renderCalendar({ container, events = [], onDateClick = null, onEventClick = null }) {
  if (!container) return;
  const today = new Date();
  let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);

  function render() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = today.toISOString().split('T')[0];

    let html = `<div class="calendar-header"><button class="cal-nav" data-cal-prev>&lt;</button><h3 class="cal-title">${monthNames[month]} ${year}</h3><button class="cal-nav" data-cal-next>&gt;</button></div>`;
    html += '<div class="calendar-grid">';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => html += `<div class="cal-day-header">${d}</div>`);
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = dateStr === todayStr;
      const dayEvents = events.filter(e => e.date === dateStr);
      html += `<div class="cal-day${isToday ? ' today' : ''}${dayEvents.length ? ' has-events' : ''}" data-date="${dateStr}"><span class="cal-date">${d}</span>${dayEvents.length ? '<span class="cal-event-dot"></span>' : ''}</div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelector('[data-cal-prev]')?.addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); render(); });
    container.querySelector('[data-cal-next]')?.addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); render(); });
    container.querySelectorAll('.cal-day[data-date]').forEach(el => {
      el.addEventListener('click', () => {
        if (onDateClick) onDateClick(el.dataset.date);
        const dayEvents = events.filter(e => e.date === el.dataset.date);
        if (dayEvents.length && onEventClick) dayEvents.forEach(onEventClick);
      });
    });
  }
  render();
  return { refresh: (newEvents) => { events = newEvents; render(); } };
}
