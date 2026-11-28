(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const esc = UI.escapeHtml;
  const villancicos = Data.cronograma.find(function (actividad) { return actividad.id === 'villancicos'; });
  const linterna = { carrera: 'sistemas', frase: 'Feliz Navidad CIYA', brillo: 'med' };
  const brightnessLevels = ['min', 'med', 'max'];
  const lanternStyles = {
    electricidad: { symbol: 'bolt' },
    electromecanica: { symbol: 'settings' },
    industrial: { symbol: 'engineering' },
    hidraulica: { symbol: 'water_drop', color: '#2774ff' },
    sistemas: { symbol: 'terminal', color: '#48ef2d' }
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
    ['wishes-link', 'portal.html?modo=buzon', 'mark_email_unread', 'Buzón Digital 2027', 'Comparte un deseo para el próximo año.'],
    ['music-link', 'portal.html?modo=villancicos', 'music_note', 'Villancicos CIYA', 'Inscribe a tu grupo y consulta el orden.']
  ];
  const backArrowSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>';
  let lanternMatrix;

  function lanternTemplate(heading) {
    return `
      <nav class="portal-shortcuts" aria-label="Navegación de actividad">
        <a class="btn ghost" href="portal.html">${backArrowSvg} Volver al portal</a>
      </nav>
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
          <h1>Ingenio que ilumina <em>la Navidad</em></h1>
          <p>Punto de encuentro, ciencia aplicada y fraternidad navideña de la comunidad universitaria UTC.</p>
        </div>
        <figure class="portal-illustration">
          <div class="tree-art">
            <div class="tree-art-content">
              <img src="modules/portal-linterna/media/arbol-navidad.webp" width="1024" height="1024" alt="Árbol de Navidad verde con luces y una estrella doradas">
            </div>
            <div class="tree-sparkles" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
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

      <nav class="portal-shortcuts" aria-label="Accesos rápidos">
        <a class="btn primary" href="cronograma.html">${UI.icon('schedule')} Cronograma</a>
        <a class="btn accent" href="qr.html">${UI.icon('qr_code_scanner')} Explorar Ruta QR</a>
      </nav>

      <section class="section card" id="registro">
        <h2>Registro para el Gran Sorteo</h2>
        <p>Presenta tu credencial o documento de identificación en la mesa del hall. Recepción verificará tu ingreso y enviará el comprobante a tu correo.</p>
        <ul>
          <li>Ingreso acreditado y mensaje en el Muro de la Empatía: 1 boleto base.</li>
          <li>Juguete funcional: 2 boletos extra. Funda de caramelos: 1 boleto extra.</li>
          <li>QR Dorado canjeado: 3 boletos extra.</li>
        </ul>
        <p class="hint">Horario de atención del evento: acreditación de 17:00 a 17:45 y donaciones y canjes de 08:00 a 17:45. Cada estudiante puede ganar un premio y tiene 45 segundos para presentarse con su identificación.</p>
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
            <div><h3>Matriz de evaluación</h3><div id="criterios-puertas"></div><p class="hint">Instalación hasta las 15:00. Jurado: 15:30 – 16:45. Se prioriza reciclaje, bajo costo y protección de bienes institucionales.</p></div>
          </div>
        </div>
      </section>

      <section class="section" id="ranking">
        <div class="section-head"><h2>Copa Solidaria Inter-Carreras</h2></div>
        <div class="card" id="ranking-portal"><p class="empty">Consultando los aportes por carrera…</p></div>
      </section>`;
  }

  function villancicosTemplate() {
    return `
      <nav class="portal-shortcuts" aria-label="Navegación de actividad">
        <a class="btn ghost" href="portal.html">${backArrowSvg} Volver al portal</a>
      </nav>
      <section class="section" id="villancicos" aria-labelledby="villancicos-title">
        <header class="villancicos-header">
          <div class="villancicos-lights" aria-hidden="true">${'<span></span>'.repeat(12)}</div>
          <h1 id="villancicos-title">Concurso de Villancicos <span>CIYA tiene Talento</span></h1>
          <p><time datetime="${esc(Data.evento.fechaISO)}">${esc(Data.evento.fecha)}</time> · ${esc(villancicos.hora)}</p>
          <p>Hall Principal · Hasta 3 minutos por grupo</p>
        </header>
        <div class="grid cols-2 villancicos-layout">
          <section class="card villancicos-program" aria-labelledby="villancicos-program-title">
            <h2 id="villancicos-program-title">Orden de presentación</h2>
            <div id="lista-grupos"><p class="empty">Consultando los grupos inscritos…</p></div>
          </section>
          <div id="inscripciones-root"></div>
        </div>
        <details class="card villancicos-criteria">
          <summary>Criterios de evaluación</summary>
          <ul>${Data.criteriosVillancicos.map(function (criterion) {
            return '<li><strong>' + esc(criterion.nombre) + '</strong><p>' + esc(criterion.detalle) + '</p></li>';
          }).join('')}</ul>
        </details>
        <dialog class="villancico-dialog" id="villancico-dialog" aria-labelledby="villancico-dialog-title">
          <div class="villancico-dialog-shell">
            <header class="villancico-dialog-head">
              <div><p class="kicker" id="villancico-dialog-turn"></p><h3 id="villancico-dialog-title"></h3></div>
              <form method="dialog"><button class="btn small" type="submit" autofocus>Cerrar</button></form>
            </header>
            <div class="villancico-dialog-body" id="villancico-dialog-body"></div>
          </div>
        </dialog>
      </section>`;
  }

  function buzonTemplate() {
    return `
      <nav class="portal-shortcuts" aria-label="Navegación de actividad">
        <a class="btn ghost" href="portal.html">${backArrowSvg} Volver al portal</a>
      </nav>
      <section class="section" id="buzon">
        <div class="section-head"><div><span class="kicker">QR junto al Rincón Instagrameable</span><h1>Buzón “Compilando Deseos 2027”</h1></div></div>
        <div class="grid cols-2">
          <div id="buzon-root"></div>
          <div class="card"><h2>Frases aprobadas</h2><div class="frases-aprobadas" id="frases-aprobadas"><p class="empty">Consultando las frases aprobadas…</p></div></div>
        </div>
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
    const color = lanternStyles[carrera.id]?.color || carrera.color;
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
      return { ...career, ...lanternStyles[career.id] };
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
      return '<p><strong>' + esc(c.nombre) + '</strong><br><small>' + esc(c.detalle) + '</small></p>';
    }).join('');
  }

  function renderVillancicos(groups) {
    const list = document.getElementById('lista-grupos');
    if (!groups.length) {
      list.innerHTML = '<p class="empty">Aún no hay grupos inscritos.</p>';
      return;
    }
    list.innerHTML = `<ol class="villancico-list" role="list">${groups.map(function (group) {
      return `
        <li class="villancico-entry">
          <div class="villancico-entry-head">
            <span class="villancico-turn">Turno ${esc(group.orden)}</span>
            <button class="villancico-trigger" type="button" data-group-id="${esc(group.id)}"
              aria-haspopup="dialog" aria-controls="villancico-dialog">
              <span class="villancico-name">${esc(group.nombre)}</span>
              <span class="villancico-view">Ver ficha ${UI.icon('arrow_forward_ios')}</span>
            </button>
          </div>
          ${UI.villancicoDetails(group)}
        </li>`;
    }).join('')}</ol>`;
  }

  function villancicoFullDetails(group) {
    const integrantes = Array.isArray(group.integrantes) ? group.integrantes.filter(function (name) {
      return typeof name === 'string' && name.trim();
    }) : [];
    return `
      <div class="villancico-representative">
        <span class="feature-icon">${UI.icon('groups')}</span>
        <div><span>Representante del grupo</span><strong>${esc(group.representante || 'Sin registrar')}</strong></div>
      </div>
      ${UI.villancicoDetails(group)}
      <div class="villancico-song"><h4>Obra musical</h4><p>${esc(group.cancion || 'Sin registrar')}</p></div>
      <section class="villancico-members" aria-labelledby="villancico-members-title">
        <h4 id="villancico-members-title">Integrantes${integrantes.length ? ' (' + integrantes.length + ')' : ''}</h4>
        ${integrantes.length ? '<ol>' + integrantes.map(function (name) {
          return '<li>' + esc(name) + '</li>';
        }).join('') + '</ol>' : '<p class="muted">Sin integrantes registrados.</p>'}
      </section>`;
  }

  function setupVillancicosDialog() {
    const list = document.getElementById('lista-grupos');
    const dialog = document.getElementById('villancico-dialog');
    const title = document.getElementById('villancico-dialog-title');
    const turn = document.getElementById('villancico-dialog-turn');
    const body = document.getElementById('villancico-dialog-body');
    let active;

    async function loadDetails(selection) {
      const summary = UI.villancicoDetails(selection.group);
      body.innerHTML = '<p class="empty" role="status">Cargando la ficha del grupo…</p>' + summary;
      try {
        const group = await Store.groupDetails(selection.group.id);
        if (!dialog.open || active !== selection) return;
        body.innerHTML = group ? villancicoFullDetails(group) :
          '<p class="empty" role="status">Este grupo ya no figura en el orden de presentación.</p>';
      } catch {
        if (!dialog.open || active !== selection) return;
        body.innerHTML = '<p class="empty" role="status">No se pudo cargar la ficha completa.</p>' + summary +
          '<button class="btn small villancico-retry" type="button">Reintentar</button>';
        body.querySelector('.villancico-retry').addEventListener('click', function () {
          dialog.querySelector('button[autofocus]').focus();
          loadDetails(selection);
        });
      }
    }

    list.addEventListener('click', function (event) {
      const trigger = event.target.closest('.villancico-trigger');
      if (!trigger) return;
      const group = Store.get().groups.find(function (item) { return item.id === trigger.dataset.groupId; });
      if (!group) return;
      active = { group, trigger };
      title.textContent = group.nombre;
      turn.textContent = 'Turno ' + group.orden;
      dialog.showModal();
      dialog.scrollTop = 0;
      loadDetails(active);
    });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', function () {
      if (!active || dialog.open) return;
      const trigger = active.trigger.isConnected ? active.trigger :
        Array.from(list.querySelectorAll('.villancico-trigger')).find(function (button) {
          return button.dataset.groupId === active.group.id;
        });
      if (trigger) trigger.focus();
      active = null;
    });
  }

  function render(state) {
    const status = document.getElementById('metrics-status');
    const online = Store.isRemote();
    if (status) {
      status.textContent = online ? 'En vivo' : state.ranking.length ? 'Última consulta' : 'Métricas no disponibles';
      status.classList.toggle('online', online);
      metrics.forEach(function ([id, key]) {
        document.getElementById('stat-' + id).textContent = state.counts[key] ?? '—';
      });
    }
    const gruposEl = document.getElementById('lista-grupos');
    const frasesEl = document.getElementById('frases-aprobadas');
    const rankingEl = document.getElementById('ranking-portal');
    if (!state.ranking.length) {
      if (gruposEl) gruposEl.textContent = 'Orden de presentación aún no disponible.';
      if (frasesEl) frasesEl.textContent = 'Frases aprobadas aún no disponibles.';
      if (rankingEl) rankingEl.textContent = 'Marcador aún no disponible.';
      return;
    }
    if (gruposEl) renderVillancicos(state.groups);
    if (frasesEl) {
      frasesEl.innerHTML = state.deseos.slice(-3).map(function (wish) {
        return '<blockquote class="muted">“' + esc(wish.frase) + '” — ' + esc(wish.nombre) + '</blockquote>';
      }).join('') || '<p class="empty">Aún no hay frases aprobadas.</p>';
    }
    if (rankingEl) UI.renderRanking('ranking-portal', Store.ranking());
  }

  function mount(mode) {
    const root = document.getElementById('portal-root');
    if (mode === 'linterna') root.innerHTML = lanternTemplate('h1');
    else if (mode === 'villancicos') root.innerHTML = villancicosTemplate();
    else if (mode === 'buzon') root.innerHTML = buzonTemplate();
    else root.innerHTML = template();
  }

  async function init() {
    const mode = new URLSearchParams(location.search).get('modo');
    mount(mode);
    if (mode === 'linterna') {
      setupLantern();
      document.body.classList.add('lantern-page');
      document.title = 'Mar de Linternas | CIYA Navidad 2026';
      document.getElementById('sync-status').hidden = true;
      UI.initNav('portal');
      return;
    }
    if (mode === 'villancicos') {
      document.title = 'Villancicos CIYA | CIYA Navidad 2026';
      setupVillancicosDialog();
    } else if (mode === 'buzon') {
      document.title = 'Buzón Digital 2027 | CIYA Navidad 2026';
    } else {
      setupEstaticos();
    }
    UI.initNav('portal');
    if (Store.configured()) await Store.init();
    Store.subscribe(render);
  }

  window.CIYA_PORTAL = { mount, init };
  init();
})();
