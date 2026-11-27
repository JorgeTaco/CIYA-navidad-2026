(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const esc = UI.escapeHtml;
  const linterna = { carrera: 'sistemas', frase: 'Feliz Navidad CIYA', brillo: 'med' };
  const brightnessLevels = ['min', 'med', 'max'];
  const lanternThemes = {
    electricidad: ['#d4af37', 'bolt'],
    electromecanica: ['#b52b3b', 'settings'],
    industrial: ['#c026d3', 'engineering'],
    hidraulica: ['#0284c7', 'water_drop'],
    sistemas: ['#10b981', 'terminal']
  };
  const metrics = [
    ['asistentes', 'attendees', 'Asistentes', 'groups'],
    ['boletos', 'tickets', 'Boletos registrados', 'confirmation_number'],
    ['grupos', 'groups', 'Grupos participantes', 'mic'],
    ['deseos', 'wishes', 'Deseos aprobados', 'favorite']
  ];
  const activities = [
    ['lantern-link', 'portal.html?modo=linterna#linterna', 'wb_twilight', 'Mar de Linternas', 'Ilumina el evento con el color de tu carrera.'],
    ['route-link', 'qr.html', 'qr_code_scanner', 'Ruta Tecnológica QR', 'Explora los códigos del campus.'],
    ['wishes-link', '#buzon', 'mark_email_unread', 'Buzón Digital 2027', 'Comparte un deseo para el próximo año.'],
    ['music-link', '#villancicos', 'music_note', 'Villancicos CIYA', 'Inscribe a tu grupo y consulta el orden.']
  ];
  let lanternMatrix;

  function lanternTemplate(heading) {
    return `
      <section class="section lantern-section" id="linterna">
        <header class="lantern-heading">
          <span class="feature-icon">${UI.icon('lightbulb')}</span>
          <div><${heading}>Mar de Linternas</${heading}><p>Acto central · 18:25 – 18:55</p></div>
        </header>
        <div class="lantern-layout">
          <div class="lantern-display">
            <div class="lantern-stage" id="lantern-stage" data-brightness="med">
              <div class="lantern-screen-header">
                <span class="lantern-screen-label">Marquesina LED</span>
                <button class="btn small lantern-exit" id="lantern-exit" hidden>Salir de pantalla completa</button>
              </div>
              <div class="lantern-board">
                <canvas id="lantern-canvas" aria-hidden="true" hidden></canvas>
                <p class="lantern-message" id="lantern-message">Feliz Navidad CIYA</p>
              </div>
              <div class="lantern-bar">
                <span class="lantern-meta" id="lantern-carrera">Sistemas y Software</span>
                <span class="lantern-progress" id="lantern-part" role="status" hidden></span>
                <button class="btn small" id="lantern-next" hidden>Siguiente parte</button>
              </div>
            </div>
            <div class="lantern-adjustments">
              <button class="btn small" type="button" id="lantern-pause" disabled>${UI.icon('pause')}<span>Pausar</span></button>
              <div class="brightness-controls" role="group" aria-label="Brillo visual">
                ${UI.icon('brightness_medium')}
                <button class="btn small" type="button" data-brightness="min" aria-pressed="false" aria-label="Brillo mínimo">Mín.</button>
                <button class="btn small" type="button" data-brightness="med" aria-pressed="true" aria-label="Brillo medio">Med.</button>
                <button class="btn small" type="button" data-brightness="max" aria-pressed="false" aria-label="Brillo máximo">Máx.</button>
              </div>
            </div>
            <div class="lantern-controls">
              <button class="btn primary" type="button" id="lantern-fullscreen">Pantalla completa</button>
            </div>
          </div>
          <div class="lantern-setup">
            <fieldset class="field">
              <legend>Carrera</legend>
              <div class="chips" id="linterna-carreras"></div>
            </fieldset>
            <fieldset class="field">
              <legend>Mensaje navideño</legend>
              <div class="chips" id="linterna-frases"></div>
              <label class="custom-message" for="linterna-custom">Mensaje propio (hasta 60 caracteres)</label>
              <input id="linterna-custom" maxlength="60" placeholder="Tu mensaje navideño" aria-describedby="linterna-feedback">
              <p class="hint" id="linterna-feedback" role="status" hidden></p>
            </fieldset>
          </div>
        </div>
      </section>`;
  }

  function template() {
    return `
      <section class="portal-hero" id="inicio">
        <div class="portal-intro">
          <span class="portal-date">${UI.icon('calendar_month')} 4 dic 2026 · Hall CIYA · UTC Latacunga</span>
          <h1>Ingenio que ilumina <em>la Navidad</em></h1>
          <p>Punto de encuentro, ciencia aplicada y fraternidad navideña de la comunidad universitaria UTC.</p>
        </div>
        <figure class="portal-illustration">
          <img src="modules/portal-linterna/media/cotopaxi.svg" width="340" height="190" alt="El Cotopaxi bajo un árbol navideño dibujado con circuitos">
          <figcaption>5 carreras, 1 energía solidaria</figcaption>
        </figure>
      </section>

      <section class="section" aria-labelledby="event-metrics-title">
        <div class="section-head portal-section-head">
          <h2 id="event-metrics-title">${UI.icon('sensors')} Métricas del evento</h2>
          <p class="metric-status" id="metrics-status" role="status">Consultando métricas…</p>
        </div>
        <div class="event-summary">
          ${metrics.map(function ([name, , label, symbol]) {
            return `<div class="metric-card metric-${name}">
              <div class="metric-heading"><span class="label">${label}</span><span class="feature-icon">${UI.icon(symbol)}</span></div>
              <div class="stat" id="stat-${name}">—</div>
            </div>`;
          }).join('')}
        </div>
      </section>

      <section class="section" aria-labelledby="event-activities-title">
        <h2 id="event-activities-title">Actividades centrales</h2>
        <div class="event-actions">
          ${activities.map(function ([className, href, symbol, title, description]) {
            return `<a class="event-action ${className}" href="${href}">
              <span class="feature-icon">${UI.icon(symbol)}</span>
              <div><h3>${title}</h3><p>${description}</p></div>
              ${UI.icon('arrow_forward_ios')}
            </a>`;
          }).join('')}
        </div>
      </section>

      ${lanternTemplate('h2')}

      <nav class="portal-shortcuts" aria-label="Accesos rápidos">
        <a class="btn primary" href="cronograma.html">${UI.icon('schedule')} Cronograma</a>
        <a class="btn accent" href="qr.html">${UI.icon('qr_code_scanner')} Explorar Ruta QR</a>
      </nav>

      <section class="section card" id="registro">
        <h2>Registro para el Gran Sorteo</h2>
        <p>Acude a la mesa del hall de 17:00 a 17:45 con tu credencial o documento de identificación. Recepción verificará tu ingreso y enviará el comprobante a tu correo.</p>
        <ul>
          <li>Ingreso acreditado y mensaje en el Muro de la Empatía: 1 boleto base.</li>
          <li>Juguete funcional: 2 boletos extra. Funda de caramelos: 1 boleto extra.</li>
          <li>QR Dorado canjeado: 3 boletos extra.</li>
        </ul>
        <p class="hint">Donaciones y canjes de 08:00 a 17:45. Cada estudiante puede ganar un premio y tiene 45 segundos para presentarse con su identificación.</p>
      </section>

      <section class="section" id="villancicos">
        <div class="section-head"><div><span class="kicker">Actividad I · 17:45 – 18:25</span><h2>Concurso de Villancicos “CIYA tiene Talento”</h2></div></div>
        <div class="grid cols-2">
          <div id="inscripciones-root"></div>
          <div class="card"><h3>Orden de presentación</h3><div id="lista-grupos"><p class="empty">Consultando los grupos inscritos…</p></div></div>
        </div>
      </section>

      <section class="section" id="buzon">
        <div class="section-head"><div><span class="kicker">QR junto al Rincón Instagrameable</span><h2>Buzón “Compilando Deseos 2027”</h2></div></div>
        <div class="grid cols-2">
          <div id="buzon-root"></div>
          <div class="card"><h3>Frases aprobadas</h3><div class="frases-aprobadas" id="frases-aprobadas"><p class="empty">Consultando las frases aprobadas…</p></div></div>
        </div>
      </section>

      <section class="section card" id="muro">
        <h2>Muro de la Empatía</h2>
        <p>Deja tu mensaje en el muro del hall y pide que lo confirmen en recepción para recibir el boleto base.</p>
      </section>

      <section class="section" id="puertas">
        <div class="section-head"><div><span class="kicker">Actividad II</span><h2>Puertas Decoradas por Carrera</h2></div></div>
        <div class="card">
          <div class="grid cols-2">
            <div><h3>Espacios asignados</h3><div id="espacios-puertas"></div></div>
            <div><h3>Matriz de evaluación (100 puntos)</h3><div id="criterios-puertas"></div><p class="hint">Instalación hasta las 15:00. Jurado: 15:30 – 16:45. Se prioriza reciclaje, bajo costo y protección de bienes institucionales.</p></div>
          </div>
        </div>
      </section>

      <section class="section" id="ranking">
        <div class="section-head"><h2>Copa Solidaria Inter-Carreras</h2></div>
        <div class="card" id="ranking-portal"><p class="empty">Consultando los aportes por carrera…</p></div>
      </section>`;
  }

  function renderChips(containerId, items, onChange) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(function (item) {
      const style = item.color ? ' style="--chip-color:' + item.color + '"' : '';
      return '<button type="button" class="chip" data-id="' + esc(item.id) + '"' + style + ' aria-pressed="false">' +
        (item.symbol ? UI.icon(item.symbol) : '') + '<span>' + esc(item.nombre) + '</span></button>';
    }).join('');
    container.querySelectorAll('.chip').forEach(function (button) {
      button.addEventListener('click', function () { onChange(button.dataset.id); });
    });
  }

  function saveLantern() {
    try { localStorage.setItem('ciya2026:linterna', JSON.stringify(linterna)); } catch {}
  }

  function setLanternBrightness(level) {
    linterna.brillo = level;
    document.getElementById('lantern-stage').dataset.brightness = level;
    document.querySelectorAll('.brightness-controls button').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.brightness === level);
    });
    saveLantern();
  }

  function applyLantern() {
    const stage = document.getElementById('lantern-stage');
    const message = document.getElementById('lantern-message');
    const meta = document.getElementById('lantern-carrera');
    const carrera = Store.carrera(linterna.carrera);
    const [color] = lanternThemes[carrera.id];
    stage.style.setProperty('--lantern-color', color);
    message.textContent = linterna.frase;
    meta.textContent = carrera.nombre;
    if (lanternMatrix) lanternMatrix.show(linterna.frase, color);
    document.querySelectorAll('#linterna-carreras .chip, #linterna-frases .chip').forEach(function (button) {
      const selected = button.dataset.id === (button.parentElement.id === 'linterna-carreras' ? linterna.carrera : linterna.frase);
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected);
    });
    saveLantern();
  }

  function chooseLanternCarrera(id) {
    linterna.carrera = id;
    applyLantern();
  }

  function chooseLanternFrase(frase) {
    linterna.frase = frase;
    document.getElementById('linterna-custom').value = '';
    applyLantern();
  }

  function setupLantern() {
    try {
      const saved = JSON.parse(localStorage.getItem('ciya2026:linterna') || 'null');
      if (saved && typeof saved.frase === 'string' && Data.carreras.some(function (career) { return career.id === saved.carrera; })) {
        linterna.carrera = saved.carrera;
        linterna.frase = saved.frase.trim().slice(0, 60) || Data.frasesLinterna[0];
        if (brightnessLevels.includes(saved.brillo)) linterna.brillo = saved.brillo;
      }
    } catch (error) { console.warn(error); }

    renderChips('linterna-carreras', Data.carreras.map(function (career) {
      const [color, symbol] = lanternThemes[career.id];
      return { id: career.id, nombre: career.nombre, color, symbol };
    }), chooseLanternCarrera);
    renderChips('linterna-frases', Data.frasesLinterna.map(function (phrase) {
      return { id: phrase, nombre: phrase };
    }), chooseLanternFrase);

    const customMessage = document.getElementById('linterna-custom');
    if (!Data.frasesLinterna.includes(linterna.frase)) customMessage.value = linterna.frase;
    customMessage.addEventListener('input', function (event) {
      linterna.frase = event.target.value.trim() || Data.frasesLinterna[0];
      applyLantern();
    });

    const stage = document.getElementById('lantern-stage');
    const exit = document.getElementById('lantern-exit');
    const canvas = document.getElementById('lantern-canvas');
    const pause = document.getElementById('lantern-pause');
    const next = document.getElementById('lantern-next');
    const progress = document.getElementById('lantern-part');
    const feedback = document.getElementById('linterna-feedback');
    lanternMatrix = window.CIYA_LANTERN_MATRIX.create(canvas, function (state) {
      pause.disabled = state.mode !== 'scroll';
      pause.querySelector('.material-symbols-outlined').textContent = state.paused ? 'play_arrow' : 'pause';
      pause.lastElementChild.textContent = state.paused ? 'Reanudar' : 'Pausar';
      next.hidden = progress.hidden = state.mode !== 'parts';
      progress.textContent = next.hidden ? '' : 'Parte ' + state.part + ' de ' + state.count;
      feedback.hidden = state.missing.size === 0;
      feedback.textContent = feedback.hidden ? '' : 'Algunos símbolos se representan con un signo de interrogación.';
    });
    if (lanternMatrix) {
      canvas.hidden = false;
      document.getElementById('lantern-message').classList.add('is-drawn');
      pause.addEventListener('click', lanternMatrix.togglePlaying);
      next.addEventListener('click', lanternMatrix.nextPart);
    }
    document.querySelectorAll('.brightness-controls button').forEach(function (button) {
      button.addEventListener('click', function () { setLanternBrightness(button.dataset.brightness); });
    });
    setLanternBrightness(linterna.brillo);

    const fullscreen = document.getElementById('lantern-fullscreen');
    fullscreen.addEventListener('click', async function () {
      stage.classList.add('live');
      exit.hidden = false;
      exit.focus({ preventScroll: true });
      try {
        if (stage.requestFullscreen) await stage.requestFullscreen();
      } catch { /* The CSS view is available with or without fullscreen permission. */ }
    });
    function closePreview() {
      stage.classList.remove('live');
      exit.hidden = true;
      fullscreen.focus({ preventScroll: true });
    }
    exit.addEventListener('click', async function () {
      if (document.fullscreenElement === stage) await document.exitFullscreen();
      else closePreview();
    });
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement && stage.classList.contains('live')) closePreview();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !document.fullscreenElement && stage.classList.contains('live')) closePreview();
    });
    applyLantern();
  }

  function setupEstaticos() {
    document.getElementById('espacios-puertas').innerHTML = Data.carreras.map(function (c) {
      return '<p><span class="carrera-dot" style="--dot-color:' + c.color + '"></span><strong>' + esc(c.nombre) + '</strong><br><small>Aulas ' + esc(c.aula) + '</small></p>';
    }).join('');
    document.getElementById('criterios-puertas').innerHTML = Data.criteriosPuertas.map(function (c) {
      return '<p><strong>' + esc(c.nombre) + ' · ' + c.peso + '%</strong><br><small>' + esc(c.detalle) + '</small></p>';
    }).join('');
  }

  function render(state) {
    const status = document.getElementById('metrics-status');
    const online = Store.isRemote();
    status.textContent = online ? 'En vivo' : state.ranking.length ? 'Última consulta' : 'Métricas no disponibles';
    status.classList.toggle('online', online);
    metrics.forEach(function ([id, key]) {
      document.getElementById('stat-' + id).textContent = state.counts[key] ?? '—';
    });
    if (!state.ranking.length) {
      document.getElementById('lista-grupos').textContent = 'Orden de presentación aún no disponible.';
      document.getElementById('frases-aprobadas').textContent = 'Frases aprobadas aún no disponibles.';
      document.getElementById('ranking-portal').textContent = 'Marcador aún no disponible.';
      return;
    }
    document.getElementById('lista-grupos').innerHTML = state.groups.map(function (group) {
      return '<div class="timeline-step"><span class="step-index">' + group.orden + '</span><div><strong>' +
        esc(group.nombre) + '</strong><br><small>' + esc(group.categoria) + ' · ' +
        esc(Store.carrera(group.carrera).nombre) + '</small></div></div>';
    }).join('') || '<p class="empty">Aún no hay grupos inscritos.</p>';
    document.getElementById('frases-aprobadas').innerHTML = state.deseos.slice(-3).map(function (wish) {
      return '<blockquote class="muted">“' + esc(wish.frase) + '” — ' + esc(wish.nombre) + '</blockquote>';
    }).join('') || '<p class="empty">Aún no hay frases aprobadas.</p>';
    UI.renderRanking('ranking-portal', Store.ranking());
  }

  function mount(isLanternMode) {
    document.getElementById('portal-root').innerHTML = isLanternMode ? lanternTemplate('h1') : template();
  }

  async function init() {
    const isLanternMode = new URLSearchParams(location.search).get('modo') === 'linterna';
    mount(isLanternMode);
    setupLantern();
    if (isLanternMode) {
      document.body.classList.add('lantern-page');
      document.title = 'Mar de Linternas | CIYA Navidad 2026';
      document.getElementById('sync-status').hidden = true;
      UI.initNav('portal');
      return;
    }
    setupEstaticos();
    UI.initNav('portal');
    if (Store.configured()) await Store.init();
    Store.subscribe(render);
  }

  window.CIYA_PORTAL = { mount, init };
  init();
})();
