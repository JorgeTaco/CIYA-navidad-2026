(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const esc = UI.escapeHtml;
  const linterna = { carrera: 'sistemas', frase: 'Feliz Navidad CIYA', blink: true };

  function template() {
    return `
      <section class="event-hero" id="inicio">
        <div class="event-art" aria-hidden="true"><span></span></div>
        <span class="kicker">4 de diciembre de 2026 · Hall principal CIYA</span>
        <h1>Ingenio que ilumina <em>la Navidad</em></h1>
        <nav class="event-actions" aria-label="Actividades principales">
          <a class="event-action lantern-link" href="portal.html?modo=linterna#linterna">
            <span class="action-icon" aria-hidden="true">✦</span><span>Mar de Linternas</span>
          </a>
          <a class="event-action route-link" href="qr.html">
            <span class="action-icon" aria-hidden="true">▦</span><span>Ruta QR</span>
          </a>
          <a class="event-action wishes-link" href="#buzon">
            <span class="action-icon" aria-hidden="true">✉</span><span>Buzón 2027</span>
          </a>
          <a class="event-action music-link" href="#villancicos">
            <span class="action-icon" aria-hidden="true">♫</span><span>Villancicos</span>
          </a>
        </nav>
      </section>

      <section class="event-summary" aria-label="Resumen en vivo">
        <div><div class="label">Asistentes</div><div class="stat" id="stat-asistentes">—</div></div>
        <div><div class="label">Boletos</div><div class="stat" id="stat-boletos">—</div></div>
        <div><div class="label">Grupos</div><div class="stat" id="stat-grupos">—</div></div>
        <div><div class="label">Deseos aprobados</div><div class="stat" id="stat-deseos">—</div></div>
      </section>

      <section class="section" id="linterna">
        <div class="section-head">
          <div><span class="kicker">Acto central · 18:25 – 18:55</span><h2>Mar de Linternas</h2></div>
        </div>
        <div class="lantern-layout">
          <div class="card lantern-setup">
            <fieldset class="field">
              <legend>Carrera</legend>
              <div class="chips" id="linterna-carreras"></div>
            </fieldset>
            <fieldset class="field">
              <legend>Mensaje</legend>
              <div class="chips" id="linterna-frases"></div>
              <label class="custom-message" for="linterna-custom">O escribe tu mensaje (hasta 60 caracteres)</label>
              <input id="linterna-custom" maxlength="60" placeholder="Tu mensaje navideño">
            </fieldset>
          </div>
          <div>
            <p class="label">Vista previa</p>
            <div class="lantern-stage" id="lantern-stage">
              <div class="lantern-message" id="lantern-message">Feliz Navidad CIYA</div>
              <div class="lantern-meta" id="lantern-carrera">Selecciona tu carrera</div>
              <button class="btn small ghost lantern-exit" id="lantern-exit" hidden>Salir de pantalla completa</button>
            </div>
            <div class="lantern-controls">
              <button class="btn primary wide" id="lantern-fullscreen">Pantalla completa</button>
              <button class="btn" id="lantern-blink" aria-pressed="true">Parpadeo</button>
              <button class="btn ghost" id="lantern-sync">Sincronizar destello</button>
            </div>
            <button class="btn small ghost" id="copy-url">Copiar enlace de la linterna</button>
          </div>
        </div>
      </section>

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
    container.innerHTML = items.map(function (c) {
      return '<button type="button" class="chip" data-id="' + esc(c.id) + '" style="--chip-color:' + (c.color || 'var(--gold)') + '" aria-pressed="false">' +
        (c.color ? '<span class="carrera-dot" style="--dot-color:' + c.color + '"></span>' : '') + esc(c.nombre) + '</button>';
    }).join('');
    container.querySelectorAll('.chip').forEach(function (button) {
      button.addEventListener('click', function () {
        onChange(button.dataset.id);
      });
    });
  }

  function applyLantern() {
    const stage = document.getElementById('lantern-stage');
    const message = document.getElementById('lantern-message');
    const meta = document.getElementById('lantern-carrera');
    const carrera = Store.carrera(linterna.carrera);
    stage.style.setProperty('--lantern-color', carrera.color);
    message.textContent = linterna.frase;
    meta.textContent = carrera.icono + ' ' + carrera.nombre;
    if (stage.classList.contains('blink') !== linterna.blink) syncLantern();
    document.getElementById('lantern-blink').setAttribute('aria-pressed', linterna.blink);
    document.querySelectorAll('#linterna-carreras .chip, #linterna-frases .chip').forEach(function (button) {
      const selected = button.dataset.id === (button.parentElement.id === 'linterna-carreras' ? linterna.carrera : linterna.frase);
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected);
    });
    try { localStorage.setItem('ciya2026:linterna', JSON.stringify(linterna)); } catch (error) { console.warn(error); }
  }

  function syncLantern() {
    const stage = document.getElementById('lantern-stage');
    const message = document.getElementById('lantern-message');
    stage.classList.remove('blink');
    if (!linterna.blink) return;
    void message.offsetWidth;
    message.style.animationDelay = -((Date.now() % 1600) / 1000) + 's';
    stage.classList.add('blink');
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
        linterna.blink = saved.blink !== false;
      }
    } catch (error) { console.warn(error); }

    renderChips('linterna-carreras', Data.carreras, chooseLanternCarrera);
    renderChips('linterna-frases', Data.frasesLinterna.map(function (phrase) {
      return { id: phrase, nombre: phrase };
    }), chooseLanternFrase);

    const customMessage = document.getElementById('linterna-custom');
    if (!Data.frasesLinterna.includes(linterna.frase)) customMessage.value = linterna.frase;
    customMessage.addEventListener('input', function (event) {
      linterna.frase = event.target.value.trim() || Data.frasesLinterna[0];
      applyLantern();
    });

    document.getElementById('lantern-blink').addEventListener('click', function () {
      linterna.blink = !linterna.blink;
      applyLantern();
    });

    document.getElementById('lantern-sync').addEventListener('click', function () {
      syncLantern();
      UI.toast(linterna.blink ? 'Destello alineado con el reloj del dispositivo.' : 'Activa el parpadeo para ver el destello.');
    });

    const stage = document.getElementById('lantern-stage');
    const exit = document.getElementById('lantern-exit');
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
    document.getElementById('copy-url').addEventListener('click', function () {
      UI.copy(new URL('portal.html?modo=linterna#linterna', location.href).href);
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
    const counters = { asistentes: 'attendees', boletos: 'tickets', grupos: 'groups', deseos: 'wishes' };
    Object.keys(counters).forEach(function (id) {
      document.getElementById('stat-' + id).textContent = state.counts[counters[id]] == null ? '—' : state.counts[counters[id]];
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

  function mount() {
    document.getElementById('portal-root').innerHTML = template();
  }

  async function init() {
    const isLanternMode = new URLSearchParams(location.search).get('modo') === 'linterna';
    if (!isLanternMode && !Store.hasAccessSession()) {
      location.replace('index.html');
      return;
    }
    if (isLanternMode && !Store.hasAccessSession()) {
      Store.enterAsistente();
    }
    mount();
    setupLantern();
    if (isLanternMode) {
      document.body.classList.add('lantern-page');
      document.querySelectorAll('main > section:not(#linterna)').forEach(function (node) { node.hidden = true; });
      const sectionTitle = document.querySelector('#linterna h2');
      const title = document.createElement('h1');
      title.textContent = sectionTitle.textContent;
      sectionTitle.replaceWith(title);
      document.title = 'Mar de Linternas | CIYA Navidad 2026';
      UI.initNav('portal');
      return;
    }
    setupEstaticos();
    UI.initNav('portal');
    await Store.init();
    Store.subscribe(render);
  }

  window.CIYA_PORTAL = { mount, init };
  init();
})();
