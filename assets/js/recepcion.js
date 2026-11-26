(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const esc = UI.escapeHtml;

  function carreraOptions() {
    return Data.carreras.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nombre) + '</option>'; }).join('');
  }

  function setup() {
    ['chk-carrera', 'don-carrera'].forEach(function (id) { document.getElementById(id).innerHTML = carreraOptions(); });
    document.getElementById('oro-codigo').innerHTML = Data.dorados.map(function (d) {
      return '<option value="' + d.codigo + '">' + d.codigo + ' — ' + esc(d.pista) + '</option>';
    }).join('');

    document.getElementById('form-checkin').addEventListener('submit', function (event) {
      event.preventDefault();
      const nombre = document.getElementById('chk-nombre').value.trim();
      const cedula = document.getElementById('chk-cedula').value.trim();
      const email = document.getElementById('chk-email').value.trim();
      const carrera = document.getElementById('chk-carrera').value;
      const mensaje = document.getElementById('chk-muro').value.trim();
      const tipo = document.getElementById('don-tipo').value;
      const cantidad = Math.max(1, Number(document.getElementById('don-cantidad').value) || 1);
      const carreraDonacion = document.getElementById('don-carrera').value;
      const state = Store.get();

      if (state.attendees.some(function (a) { return a.cedula === cedula; })) return UI.toast('La cédula ya está registrada', 'bad');
      if (state.attendees.some(function (a) { return a.email.toLowerCase() === email.toLowerCase(); })) return UI.toast('El correo ya está registrado', 'bad');

      Store.update(function (draft) {
        draft.attendees.push({ id: UI.uid('as'), nombre: nombre, cedula: cedula, email: email, carrera: carrera, checkin: true, creado: Date.now() });
        if (mensaje) draft.muro.push({ id: UI.uid('mu'), cedula: cedula, nombre: nombre, carrera: carrera, mensaje: mensaje, creado: Date.now() });
        if (tipo) {
          const puntos = (tipo === 'juguete' ? Data.ponderaciones.juguete : Data.ponderaciones.caramelos) * cantidad;
          draft.donations.push({ id: UI.uid('do'), cedula: cedula, nombre: nombre, tipo: tipo, cantidad: cantidad, carrera: carreraDonacion, puntos: puntos, creado: Date.now() });
        }
      });

      const tickets = Store.ticketBreakdown(cedula);
      document.getElementById('chk-result').innerHTML =
        '<p><strong>' + esc(nombre) + '</strong> · ' + tickets.total + ' boletos</p>' +
        '<p class="muted">Ingreso ' + tickets.base + ' · Muro ' + tickets.muro + ' · Donaciones ' + tickets.donaciones + ' · QR Dorados ' + tickets.dorados + '</p>' +
        '<div class="row"><button class="btn small" id="chk-mail">Enviar al correo</button><button class="btn small ghost" id="chk-copy">Copiar</button></div>';
      const body = 'CIYA Navidad 2026 — comprobante de inscripción\nNombre: ' + nombre + '\nCédula: ' + cedula +
        '\nCarrera: ' + Store.carrera(carrera).nombre + '\nBoletos: ' + tickets.total + '\nPresenta tu identificación antes de las 17:45.';
      document.getElementById('chk-mail').addEventListener('click', function () {
        location.href = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent('Comprobante CIYA 2026') + '&body=' + encodeURIComponent(body);
      });
      document.getElementById('chk-copy').addEventListener('click', function () { UI.copy(body); });
      event.target.reset();
      document.getElementById('chk-carrera').value = carrera;
      document.getElementById('don-carrera').value = carreraDonacion;
      document.getElementById('don-cantidad').value = 1;
      UI.toast('Asistente registrado' + (tipo ? ' y donación contabilizada' : ''));
    });

    document.getElementById('btn-oro').addEventListener('click', function () {
      const codigo = document.getElementById('oro-codigo').value;
      const cedula = document.getElementById('oro-cedula').value.trim();
      if (!document.getElementById('oro-declaracion').checked) return UI.toast('Debes confirmar la declaración de juego limpio', 'bad');
      const state = Store.get();
      const asistente = state.attendees.find(function (a) { return a.cedula === cedula; });
      if (!asistente) return UI.toast('El asistente debe registrarse primero', 'bad');
      if (state.qrClaims.some(function (q) { return q.codigo === codigo && q.canjeado; })) return UI.toast('Ese QR Dorado ya fue canjeado', 'bad');
      if (state.qrClaims.some(function (q) { return q.cedula === cedula && q.canjeado; })) return UI.toast('Este estudiante ya canjeó un QR Dorado', 'bad');
      Store.update(function (draft) {
        draft.qrClaims.push({ id: UI.uid('qr'), codigo: codigo, cedula: cedula, nombre: asistente.nombre, canjeado: true, creado: Date.now() });
      });
      document.getElementById('oro-cedula').value = '';
      document.getElementById('oro-declaracion').checked = false;
      UI.toast('QR Dorado validado: +3 boletos para ' + asistente.nombre);
    });

    document.getElementById('btn-cerrar').addEventListener('click', function () {
      if (!confirm('¿Cerrar formalmente la recepción a las 17:45?')) return;
      Store.update(function (draft) { draft.recepcionCerrada = true; });
      UI.toast('Recepción cerrada');
    });

    document.getElementById('export-ranking').addEventListener('click', function () {
      const filas = [['Carrera', 'Puntos', 'Juguetes', 'Fundas', 'Donantes únicos']];
      Store.ranking().forEach(function (r) { filas.push([r.nombre, r.puntos, r.juguetes, r.caramelos, r.donantes]); });
      const csv = filas.map(function (fila) { return fila.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      UI.download('ciya2026-ranking.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
    });

    UI.initNav('recepcion');
    Store.subscribe(render);
  }

  function render(state) {
    const rows = Store.ranking();
    const max = Math.max(1, rows.reduce(function (sum, r) { return sum + r.puntos; }, 0));
    document.getElementById('ranking-recepcion').innerHTML = rows.map(function (r, index) {
      return '<div class="ranking-row"><div class="ranking-head"><span>' + (index + 1) + '. ' + esc(r.nombre) + '</span><strong>' + r.puntos + ' pts</strong></div>' +
        '<div class="bar"><span style="width:' + Math.round((r.puntos / max) * 100) + '%;--bar-color:' + r.color + '"></span></div>' +
        '<small>' + r.juguetes + ' juguetes · ' + r.caramelos + ' fundas · ' + r.donantes + ' donantes únicos</small></div>';
    }).join('');

    document.getElementById('count-asistentes').textContent = state.attendees.length;
    document.getElementById('count-donaciones').textContent = state.donations.length;
    document.getElementById('lista-asistentes').innerHTML = UI.table(
      ['Nombre', 'Cédula', 'Carrera', 'Boletos'],
      state.attendees.slice(-12).reverse().map(function (a) {
        return [esc(a.nombre), esc(a.cedula), esc(Store.carrera(a.carrera).sigla), Store.ticketBreakdown(a.cedula).total];
      })
    );
    document.getElementById('lista-donaciones').innerHTML = UI.table(
      ['Donante', 'Tipo', 'Cant.', 'Beneficiada', 'Puntos'],
      state.donations.slice(-12).reverse().map(function (d) {
        return [esc(d.nombre), d.tipo === 'juguete' ? 'Juguete' : 'Caramelos', d.cantidad, esc(Store.carrera(d.carrera).sigla), d.puntos];
      })
    );

    document.getElementById('estado-dorados').innerHTML = Data.dorados.map(function (d) {
      const claim = state.qrClaims.find(function (q) { return q.codigo === d.codigo; });
      return '<div class="row between"><span><strong>' + d.codigo + '</strong></span>' +
        '<span class="badge ' + (claim ? 'bad' : 'ok') + '">' + (claim ? 'Canjeado' : 'Disponible') + '</span></div>';
    }).join('');

    document.getElementById('estado-cierre').innerHTML = state.recepcionCerrada
      ? '<span class="badge warn">Recepción cerrada · ' + esc(UI.dateTime(state.updatedAt)) + '</span>'
      : '<span class="badge ok">Recepción abierta</span>';
  }

  async function init() {
    const ok = await UI.pinGate('recepcion', 'Panel de recepción');
    if (!ok) {
      document.getElementById('locked').hidden = false;
      return;
    }
    document.getElementById('panel').hidden = false;
    document.getElementById('logout').addEventListener('click', function () { UI.logout('recepcion'); });
    await Store.init();
    setup();
  }

  init();
})();
