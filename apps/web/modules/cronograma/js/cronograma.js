(function () {
  const UI = window.CIYA_UI;
  const activities = window.CIYA_DATA.cronograma;
  const list = document.getElementById('schedule-list');
  const count = document.getElementById('schedule-count');
  const filters = document.getElementById('schedule-filters');
  const buttons = [...filters.querySelectorAll('button')];

  list.innerHTML = activities.map(function (activity) {
    return `
      <li class="schedule-entry" data-phase="${UI.escapeHtml(activity.fase)}">
        <details>
          <summary>
            <span class="schedule-time">${UI.escapeHtml(activity.hora)}</span>
            <span class="schedule-title">${UI.escapeHtml(activity.bloque)}</span>
          </summary>
          <p>${UI.escapeHtml(activity.detalle)}</p>
        </details>
      </li>`;
  }).join('');

  function showPhase(phase) {
    let visible = 0;
    for (const entry of list.children) {
      entry.hidden = phase !== 'all' && entry.dataset.phase !== phase;
      if (!entry.hidden) visible++;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', button.dataset.phase === phase);
    count.textContent = visible === 1 ? '1 actividad' : visible + ' actividades';
  }

  filters.addEventListener('click', function (event) {
    const button = event.target.closest('button');
    if (button) showPhase(button.dataset.phase);
  });

  UI.initNav('cronograma');
  showPhase('all');
})();
