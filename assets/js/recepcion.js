(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const esc = UI.escapeHtml;
  const byId = function (id) { return document.getElementById(id); };
  const value = function (id) { return byId(id).value.trim(); };
  const checked = function (id) { return byId(id).checked; };
  const receiptStatus = {
    pending: 'Correo pendiente',
    sending: 'Correo en proceso',
    accepted: 'Correo aceptado por el proveedor',
    failed: 'No se pudo enviar el correo. Copia el comprobante para entregarlo.',
    uncertain: 'Envío sin confirmación. Revisa el registro de Brevo y usa el comprobante en pantalla.'
  };
  let displayedReceipt;

  function paintMailStatus(state) {
    const status = byId('receipt-status');
    if (status && displayedReceipt) {
      const nextStatus = receiptStatus[state.receipts[displayedReceipt]];
      if (nextStatus || !status.textContent) status.textContent = nextStatus || receiptStatus.pending;
    }
  }

  function showReceipt(result) {
    displayedReceipt = result.id;
    if (result.pendiente) {
      byId('chk-result').textContent = 'Operación registrada. Los boletos serán válidos al acreditar el ingreso.';
      return;
    }
    const text = result.nombre + ' · ' + result.tickets.length + ' boletos\n' + result.tickets.join('\n');
    byId('chk-result').innerHTML = '<p><strong>' + esc(result.nombre) + '</strong> · ' + result.tickets.length +
      ' boletos</p><p class="ticket-list">' + result.tickets.map(esc).join('<br>') +
      '</p><p id="receipt-status"></p><button class="btn small" id="copy-receipt">Copiar comprobante</button>';
    byId('copy-receipt').onclick = function () { UI.copy(text); };
    paintMailStatus(Store.get());
  }

  function donation(prefix) {
    return {
      tipo: value(prefix + 'tipo'), cantidad: Number(value(prefix + 'cantidad')),
      carrera: value(prefix + 'carrera'), confirmed: checked(prefix + 'confirm')
    };
  }

  function bind(id, action, payload) {
    const form = byId(id);
    form.addEventListener('submit', function (event) {
      UI.submit(event, action, payload(), true, function (result) {
        showReceipt(result);
        form.reset();
        UI.toast('Operación registrada.');
      });
    });
  }

  function render(state) {
    UI.renderRanking('ranking-recepcion', Store.ranking());
    byId('count-asistentes').textContent = state.counts.attendees ?? '—';
    byId('count-donaciones').textContent = state.counts.donations ?? '—';
    byId('lista-asistentes').innerHTML = UI.table(['Estudiante', 'Cédula', 'Carrera', 'Acreditación'],
      state.attendees.filter(function (person) { return person.checked_in_at; }).map(function (person) {
        return [esc(person.nombre), esc(person.cedula), esc(Store.carrera(person.carrera).nombre), esc(UI.dateTime(person.checked_in_at))];
      }));
    byId('lista-donaciones').innerHTML = UI.table(['Donante', 'Carrera', 'Tipo', 'Cantidad', 'Puntos'],
      state.donations.map(function (item) {
        return [esc(item.nombre || item.cedula), esc(Store.carrera(item.carrera).nombre), esc(item.tipo), item.cantidad, item.puntos];
      }));
    byId('estado-dorados').innerHTML = state.qrClaims.map(function (gold) {
      return '<p>QR Dorado ' + gold.slot + ' · ' + (gold.canjeado ? 'Canjeado' : 'Sin canjear') + '</p>';
    }).join('');
    const sealed = state.sealed === true;
    byId('estado-cierre').textContent = sealed ? 'Datos sellados. El respaldo está disponible en escenario.' :
      state.recepcionCerrada ? 'Horario terminado. Sella los datos para generar el respaldo.' : 'Cierre programado a las 17:45.';
    byId('btn-cerrar').disabled = sealed || !state.recepcionCerrada;
    document.querySelectorAll('#form-checkin button, #form-wall button, #form-donation button, #form-gold button')
      .forEach(function (button) { button.closest('form').hidden = state.recepcionCerrada; });
    paintMailStatus(state);
  }

  function setup() {
    const options = window.CIYA_DATA.carreras.map(function (career) {
      return '<option value="' + esc(career.id) + '">' + esc(career.nombre) + '</option>';
    }).join('');
    ['chk-carrera', 'chk-don-carrera', 'don-carrera'].forEach(function (id) { byId(id).innerHTML = options; });
    byId('chk-carrera').onchange = function () { byId('chk-don-carrera').value = value('chk-carrera'); };
    bind('form-checkin', 'checkin', function () {
      return { cedula: value('chk-cedula'), nombre: value('chk-nombre'), email: value('chk-email'),
        carrera: value('chk-carrera'), wall: value('chk-muro'), confirmed: checked('chk-confirm'),
        donation: value('chk-don-tipo') ? donation('chk-don-') : null };
    });
    bind('form-wall', 'checkin', function () {
      return { cedula: value('wall-cedula'), wall: value('wall-mensaje'), confirmOnly: true };
    });
    bind('form-donation', 'donate', function () { return { ...donation('don-'), cedula: value('don-cedula') }; });
    bind('form-gold', 'redeem', function () {
      return { cedula: value('oro-cedula'), code: value('oro-codigo').toUpperCase(), confirmed: checked('oro-declaracion') };
    });
    byId('btn-cerrar').onclick = async function (event) {
      if (!confirm('¿Sellar el registro final para el respaldo de escenario?')) return;
      await UI.submit(event, 'seal', {}, true, function () { UI.toast('Recepción sellada.'); });
      render(Store.get());
    };
    byId('export-ranking').onclick = function () {
      const rows = Store.ranking().map(function (r) { return [r.puesto, r.nombre, r.puntos, r.juguetes, r.caramelos, r.total, r.donantes]; });
      rows.unshift(['Puesto', 'Carrera', 'Puntos', 'Juguetes', 'Fundas', 'Total', 'Donantes únicos']);
      UI.download('ciya2026-ranking.csv', UI.csv(rows), 'text/csv;charset=utf-8');
    };
  }

  async function init() {
    if (!await UI.requireAccount('recepcion', 'Panel de recepción')) {
      byId('locked').hidden = false;
      return;
    }
    byId('panel').hidden = false;
    byId('logout').onclick = UI.logout;
    UI.initNav('recepcion');
    await Store.init('recepcion');
    setup();
    Store.subscribe(render);
  }

  init();
})();
