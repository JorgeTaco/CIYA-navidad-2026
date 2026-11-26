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
    ['reg-carrera', 'muro-carrera'].forEach(function (id) {
      const select = document.getElementById(id);
      if (select) select.innerHTML = carreraOptions();
    });
    const categoria = document.getElementById('vil-categoria');
    if (categoria) categoria.innerHTML = Data.categoriasVillancicos.map(function (c) {
      return '<option>' + esc(c) + '</option>';
    }).join('');
  }

  function renderCarreraChips(containerId, selectedIds, multi, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = Data.carreras.map(function (c) {
      const active = multi ? selectedIds.includes(c.id) : selectedIds === c.id;
      return '<button type="button" class="chip' + (active ? ' active' : '') + '" data-id="' + c.id + '" style="--chip-color:' + c.color + '">' +
        '<span class="carrera-dot" style="--dot-color:' + c.color + '"></span>' + esc(c.nombre) + '</button>';
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
    meta.textContent = carrera.sigla + ' · ' + carrera.nombre;
    stage.classList.toggle('blink', linterna.blink);
    document.getElementById('lantern-preview').textContent = linterna.frase;
    document.getElementById('lantern-blink').textContent = 'Parpadeo: ' + (linterna.blink ? 'activo' : 'apagado');
    try { localStorage.setItem('ciya2026:linterna', JSON.stringify(linterna)); } catch (error) { console.warn(error); }
  }

  function chooseLanternCarrera(id) {
    linterna.carrera = id;
    renderCarreraChips('linterna-carreras', id, false, chooseLanternCarrera);
    applyLantern();
  }

  function chooseLanternFrase(frase) {
    linterna.frase = frase;
    document.getElementById('linterna-custom').value = '';
    renderCarreraChips('linterna-frases', frase, false, chooseLanternFrase);
    applyLantern();
  }

  function setupLantern() {
    try {
      const saved = JSON.parse(localStorage.getItem('ciya2026:linterna') || 'null');
      if (saved && saved.frase && saved.carrera) Object.assign(linterna, saved);
    } catch (error) { console.warn(error); }

    renderCarreraChips('linterna-carreras', linterna.carrera, false, chooseLanternCarrera);
    renderCarreraChips('linterna-frases', linterna.frase, false, chooseLanternFrase);

    document.getElementById('linterna-custom').addEventListener('input', function (event) {
      if (!event.target.value.trim()) return;
      linterna.frase = event.target.value.trim();
      applyLantern();
    });

    document.getElementById('lantern-blink').addEventListener('click', function () {
      linterna.blink = !linterna.blink;
      applyLantern();
    });

    document.getElementById('lantern-sync').addEventListener('click', function () {
      const message = document.getElementById('lantern-message');
      const offset = -((Date.now() % 1600) / 1000);
      message.style.animationDelay = offset + 's';
      UI.toast('Destello sincronizado con el reloj del evento');
    });

    const stage = document.getElementById('lantern-stage');
    const exit = document.getElementById('lantern-exit');
    document.getElementById('lantern-fullscreen').addEventListener('click', async function () {
      try {
        if (stage.requestFullscreen) await stage.requestFullscreen();
        else if (stage.webkitRequestFullscreen) await stage.webkitRequestFullscreen();
        else stage.classList.add('live');
      } catch (error) {
        stage.classList.add('live');
      }
      exit.hidden = false;
    });
    exit.addEventListener('click', function () {
      stage.classList.remove('live');
      if (document.fullscreenElement) document.exitFullscreen();
    });
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement) {
        stage.classList.remove('live');
        exit.hidden = true;
      }
    });
    document.getElementById('copy-url').addEventListener('click', function () { UI.copy(location.href.split('#')[0]); });
    applyLantern();
  }

  function setupRegistro() {
    document.getElementById('form-registro').addEventListener('submit', function (event) {
      event.preventDefault();
      const nombre = document.getElementById('reg-nombre').value.trim();
      const cedula = document.getElementById('reg-cedula').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const carrera = document.getElementById('reg-carrera').value;
      const mensaje = document.getElementById('reg-muro').value.trim();
      const state = Store.get();
      if (state.attendees.some(function (a) { return a.cedula === cedula; })) return UI.toast('La cédula ya está registrada', 'bad');
      if (state.attendees.some(function (a) { return a.email.toLowerCase() === email.toLowerCase(); })) return UI.toast('El correo ya está registrado', 'bad');

      Store.update(function (draft) {
        draft.attendees.push({ id: UI.uid('as'), nombre: nombre, cedula: cedula, email: email, carrera: carrera, checkin: true, createdAt: Date.now() });
        if (mensaje) draft.muro.push({ id: UI.uid('mu'), cedula: cedula, nombre: nombre, carrera: carrera, mensaje: mensaje, createdAt: Date.now() });
      });

      const tickets = Store.ticketBreakdown(cedula);
      const body = 'Hola ' + nombre + ',\n\nTu registro para el Gran Sorteo Digital CIYA 2026 fue exitoso.\n' +
        'Carrera: ' + Store.carrera(carrera).nombre + '\nBoletos: ' + tickets.total + '\n' +
        'Detalle: ingreso ' + tickets.base + ', muro ' + tickets.muro + ', donaciones ' + tickets.donaciones + ', QR Dorados ' + tickets.dorados + '.\n\nPresenta tu cédula el 4 de diciembre antes de las 17:45.';
      document.getElementById('reg-result').innerHTML =
        '<p><strong>' + esc(nombre) + '</strong> quedó registrado con <strong>' + tickets.total + '</strong> boletos.</p>' +
        '<p class="muted">Ingreso ' + tickets.base + ' · Muro ' + tickets.muro + ' · Donaciones ' + tickets.donaciones + ' · QR Dorados ' + tickets.dorados + '</p>' +
        '<div class="row"><button class="btn small" id="mail-tickets">Enviar al correo</button><button class="btn small ghost" id="copy-tickets">Copiar comprobante</button></div>' +
        '<p class="hint" style="margin-top:0.6rem">Se abrirá tu app de correo con el comprobante listo para enviar a ' + esc(email) + '.</p>';
      document.getElementById('mail-tickets').addEventListener('click', function () {
        location.href = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent('Boletos CIYA Navidad 2026') + '&body=' + encodeURIComponent(body);
      });
      document.getElementById('copy-tickets').addEventListener('click', function () { UI.copy(body); });
      event.target.reset();
      UI.toast('Registro guardado y boletos generados');
    });
  }

  const selectedCarreras = new Set();

  function chooseVillancicoCarrera(id) {
    if (selectedCarreras.has(id)) selectedCarreras.delete(id); else selectedCarreras.add(id);
    renderCarreraChips('vil-carreras', Array.from(selectedCarreras), true, chooseVillancicoCarrera);
  }

  function setupVillancicos() {
    renderCarreraChips('vil-carreras', [], true, chooseVillancicoCarrera);

    document.getElementById('form-villancicos').addEventListener('submit', function (event) {
      event.preventDefault();
      const fueraDePlazo = Date.now() > new Date('2026-12-03T17:30:00').getTime();
      if (fueraDePlazo) UI.toast('Fuera del plazo oficial: se registra como inscripción durante el evento', 'warn');
      if (!selectedCarreras.size) return UI.toast('Selecciona al menos una carrera', 'bad');
      const integrantes = document.getElementById('vil-integrantes').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      Store.update(function (draft) {
        draft.groups.push({
          id: UI.uid('gr'),
          orden: draft.groups.length + 1,
          nombre: document.getElementById('vil-grupo').value.trim(),
          integrantes: integrantes,
          carreras: Array.from(selectedCarreras),
          cancion: document.getElementById('vil-cancion').value.trim(),
          categoria: document.getElementById('vil-categoria').value,
          fueraDePlazo: fueraDePlazo,
          creado: Date.now()
        });
      });
      event.target.reset();
      selectedCarreras.clear();
      renderCarreraChips('vil-carreras', [], true, chooseVillancicoCarrera);
      UI.toast('Grupo inscrito en el orden de presentación');
    });
  }

  function setupBuzon() {
    document.getElementById('form-deseo').addEventListener('submit', function (event) {
      event.preventDefault();
      const nombre = document.getElementById('des-nombre').value.trim();
      Store.update(function (draft) {
        draft.deseos.push({
          id: UI.uid('de'),
          nombre: nombre,
          rol: document.getElementById('des-rol').value,
          carrera: document.getElementById('des-carrera').value.trim(),
          frase: document.getElementById('des-frase').value.trim(),
          aprobado: false,
          creado: Date.now()
        });
      });
      event.target.reset();
      UI.toast('Frase enviada a curaduría');
    });
  }

  function setupMuro() {
    document.getElementById('form-muro').addEventListener('submit', function (event) {
      event.preventDefault();
      const cedula = document.getElementById('muro-cedula').value.trim();
      const state = Store.get();
      const asistente = state.attendees.find(function (a) { return a.cedula === cedula; });
      if (!asistente) return UI.toast('Registra primero tu ingreso en el hall', 'bad');
      Store.update(function (draft) {
        draft.muro.push({
          id: UI.uid('mu'),
          cedula: cedula,
          nombre: asistente.nombre,
          carrera: document.getElementById('muro-carrera').value,
          mensaje: document.getElementById('muro-mensaje').value.trim(),
          creado: Date.now()
        });
      });
      event.target.reset();
      UI.toast('Mensaje publicado: +1 boleto');
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

  function renderRanking(state) {
    const rows = Store.ranking();
    const max = Math.max(1, rows.reduce(function (sum, r) { return sum + r.puntos; }, 0));
    document.getElementById('ranking-portal').innerHTML = rows.map(function (r, index) {
      return '<div class="ranking-row"><div class="ranking-head"><span>' + (index + 1) + '. ' + esc(r.nombre) + '</span>' +
        '<strong>' + r.puntos + ' pts · ' + r.juguetes + ' juguetes · ' + r.caramelos + ' fundas</strong></div>' +
        '<div class="bar"><span style="width:' + Math.round((r.puntos / max) * 100) + '%;--bar-color:' + r.color + '"></span></div></div>';
    }).join('') + '<p class="hint">Desempate: mayor número de juguetes operativos y luego mayor número de donantes únicos.</p>';
  }

  function render(state) {
    document.getElementById('stat-asistentes').textContent = state.attendees.length;
    document.getElementById('stat-boletos').textContent = state.attendees.reduce(function (sum, a) {
      return sum + Store.ticketBreakdown(a.cedula).total;
    }, 0);
    document.getElementById('stat-grupos').textContent = state.groups.length;
    document.getElementById('stat-deseos').textContent = state.deseos.length;

    document.getElementById('lista-grupos').innerHTML = state.groups.length ? state.groups.slice().sort(function (a, b) {
      return a.orden - b.orden;
    }).map(function (g) {
      return '<div class="timeline-step"><span class="step-index">' + g.orden + '</span><div><strong>' + esc(g.nombre) + '</strong>' +
        '<br><small>' + esc(g.categoria) + ' · ' + esc(g.cancion) + (g.fueraDePlazo ? ' · <span class="badge warn">Durante el evento</span>' : '') + '<br>' + g.integrantes.length + ' integrantes · ' +
        esc(g.carreras.map(function (id) { return Store.carrera(id).nombre; }).join(', ')) + '</small></div></div>';
    }).join('') : '<p class="empty">Aún no hay grupos inscritos.</p>';

    const misDeseos = state.deseos.filter(function (d) { return d.nombre.toLowerCase() === document.getElementById('des-nombre').value.trim().toLowerCase(); });
    document.getElementById('deseo-estado').innerHTML = misDeseos.length ? misDeseos.map(function (d) {
      return '<p>' + esc(d.frase) + ' <span class="badge ' + (d.aprobado ? 'ok' : 'warn') + '">' + (d.aprobado ? 'Aprobado' : 'En revisión') + '</span></p>';
    }).join('') : '<p class="empty">Completa el nombre para ver tus envíos.</p>';
    document.getElementById('frases-aprobadas').innerHTML = state.deseos.filter(function (d) { return d.aprobado; }).slice(-3).map(function (d) {
      return '<blockquote class="muted">“' + esc(d.frase) + '” — ' + esc(d.nombre) + '</blockquote>';
    }).join('');

    document.getElementById('lista-muro').innerHTML = state.muro.length ? state.muro.slice(-8).reverse().map(function (m) {
      return '<p><strong>' + esc(m.nombre) + '</strong> <small>' + esc(Store.carrera(m.carrera).sigla) + '</small><br>' + esc(m.mensaje) + '</p>';
    }).join('') : '<p class="empty">Sé la primera persona en dejar un mensaje.</p>';

    renderRanking(state);
  }

  async function init() {
    fillSelects();
    setupLantern();
    setupRegistro();
    setupVillancicos();
    setupBuzon();
    setupMuro();
    setupEstaticos();
    UI.initNav();
    await Store.init();
    Store.subscribe(render);
    document.getElementById('des-nombre').addEventListener('input', function () { render(Store.get()); });
  }

  init();
})();
