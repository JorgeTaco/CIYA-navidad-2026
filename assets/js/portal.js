(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const esc = UI.escapeHtml;

  const linterna = { carrera: 'sistemas', frase: 'Feliz Navidad CIYA', blink: true };

  function carreraOptions() {
    return Data.carreras.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.nombre) + '</option>';
    }).join('');
  }

  function fillSelects() {
    document.getElementById('vil-carrera').innerHTML = carreraOptions();
    document.getElementById('vil-categoria').innerHTML = Data.categoriasVillancicos.map(function (category) {
      return '<option>' + esc(category) + '</option>';
    }).join('');
  }

  function renderChips(containerId, items, selectedId, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = items.map(function (c) {
      const active = selectedId === c.id;
      return '<button type="button" class="chip' + (active ? ' active' : '') + '" data-id="' + c.id + '" style="--chip-color:' + (c.color || 'var(--line)') + '" aria-pressed="' + active + '">' +
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
    stage.style.background = 'radial-gradient(circle at 50% 38%, ' + carrera.color + ', #040a14 78%)';
    message.textContent = linterna.frase;
    meta.textContent = carrera.icono + ' ' + carrera.nombre;
    if (stage.classList.contains('blink') !== linterna.blink) syncLantern();
    document.getElementById('lantern-preview').textContent = linterna.frase;
    document.getElementById('lantern-blink').textContent = 'Parpadeo: ' + (linterna.blink ? 'activo' : 'apagado');
    try { localStorage.setItem('ciya2026:linterna', JSON.stringify(linterna)); } catch (error) { console.warn(error); }
  }

  function syncLantern() {
    const stage = document.getElementById('lantern-stage');
    const message = document.getElementById('lantern-message');
    stage.classList.remove('blink');
    if (!linterna.blink) return;
    // Recompute the animation origin whenever the operator aligns the pulse.
    void message.offsetWidth;
    message.style.animationDelay = -((Date.now() % 1600) / 1000) + 's';
    stage.classList.add('blink');
  }

  function chooseLanternCarrera(id) {
    linterna.carrera = id;
    renderChips('linterna-carreras', Data.carreras, id, chooseLanternCarrera);
    applyLantern();
  }

  function chooseLanternFrase(frase) {
    linterna.frase = frase;
    document.getElementById('linterna-custom').value = '';
    renderPhrases();
    applyLantern();
  }

  function renderPhrases() {
    const phrases = Data.frasesLinterna.map(function (phrase) { return { id: phrase, nombre: phrase }; });
    renderChips('linterna-frases', phrases, linterna.frase, chooseLanternFrase);
  }

  function setupLantern() {
    try {
      const saved = JSON.parse(localStorage.getItem('ciya2026:linterna') || 'null');
      if (saved && typeof saved.frase === 'string' && Data.carreras.some(function (career) { return career.id === saved.carrera; })) {
        linterna.carrera = saved.carrera;
        linterna.frase = saved.frase.slice(0, 60);
        linterna.blink = saved.blink !== false;
      }
    } catch (error) { console.warn(error); }

    renderChips('linterna-carreras', Data.carreras, linterna.carrera, chooseLanternCarrera);
    renderPhrases();

    document.getElementById('linterna-custom').addEventListener('input', function (event) {
      linterna.frase = event.target.value.trim() || Data.frasesLinterna[0];
      renderPhrases();
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
    document.getElementById('lantern-fullscreen').addEventListener('click', async function () {
      stage.classList.add('live');
      exit.hidden = false;
      try {
        if (stage.requestFullscreen) await stage.requestFullscreen();
      } catch { /* The CSS view is available with or without fullscreen permission. */ }
    });
    exit.addEventListener('click', function () {
      stage.classList.remove('live');
      exit.hidden = true;
      if (document.fullscreenElement) document.exitFullscreen();
      document.getElementById('lantern-fullscreen').focus();
    });
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement) {
        stage.classList.remove('live');
        exit.hidden = true;
      }
    });
    document.getElementById('copy-url').addEventListener('click', function () {
      UI.copy(new URL('index.html?modo=linterna#linterna', location.href).href);
    });
    applyLantern();
  }

  function setupForms() {
    const value = function (id) { return document.getElementById(id).value.trim(); };
    const group = document.getElementById('form-villancicos');
    group.addEventListener('submit', function (event) {
      return UI.submit(event, 'group', {
        nombre: value('vil-grupo'), representante: value('vil-representante'),
        integrantes: value('vil-integrantes').split('\n').map(function (name) { return name.trim(); }).filter(Boolean),
        carrera: value('vil-carrera'), cancion: value('vil-cancion'), categoria: value('vil-categoria')
      }, false, function () {
        group.reset();
        UI.toast('Grupo inscrito en el orden de presentación.');
      });
    });
    const wish = document.getElementById('form-deseo');
    wish.addEventListener('submit', function (event) {
      return UI.submit(event, 'wish', {
        nombre: value('des-nombre'), rol: value('des-rol'), carrera: value('des-carrera'), frase: value('des-frase')
      }, false, function () {
        wish.reset();
        UI.toast('Frase enviada a curaduría.');
      });
    });
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
      document.getElementById('stat-' + id).textContent = state.counts[counters[id]] ?? '—';
    });
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

  async function init() {
    setupLantern();
    if (new URLSearchParams(location.search).get('modo') === 'linterna') {
      document.querySelectorAll('main > section:not(#linterna), #sync-status').forEach(function (node) { node.hidden = true; });
      return;
    }
    fillSelects();
    setupForms();
    setupEstaticos();
    UI.initNav();
    await Store.init();
    Store.subscribe(render);
  }

  init();
})();
