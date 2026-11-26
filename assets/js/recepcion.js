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
    byId('receipt-card').hidden = false;
    if (result.pendiente) {
      byId('chk-result').textContent = 'Operación registrada. Los boletos serán válidos al acreditar el ingreso.';
      return;
    }
    const count = result.tickets.length;
    const summary = count + (count === 1 ? ' boleto' : ' boletos');
    const text = result.nombre + ' · ' + summary + '\n' + result.tickets.join('\n');
    byId('chk-result').innerHTML = '<p><strong>' + esc(result.nombre) + '</strong> · ' + summary +
      '</p><p class="ticket-list">' + result.tickets.map(esc).join('<br>') +
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

  function bind(id, action, payload, reset) {
    const form = byId(id);
    form.addEventListener('submit', function (event) {
      UI.submit(event, action, payload(), true, function (result) {
        showReceipt(result);
        form.reset();
        if (reset) reset();
        if (form.getClientRects().length) byId('chk-result').focus();
        UI.toast('Operación registrada.');
      });
    });
  }

  function setupTabs() {
    const tablist = document.querySelector('.reception-tabs');
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

    function selectTab(selected) {
      tabs.forEach(function (tab) {
        const active = tab === selected;
        tab.setAttribute('aria-selected', active);
        tab.tabIndex = active ? 0 : -1;
        byId(tab.getAttribute('aria-controls')).hidden = !active;
      });
    }

    tabs.forEach(function (tab) { tab.onclick = function () { selectTab(tab); }; });
    tablist.addEventListener('keydown', function (event) {
      const index = tabs.indexOf(event.target);
      const last = tabs.length - 1;
      const targets = { ArrowLeft: (index + last) % tabs.length, ArrowRight: (index + 1) % tabs.length,
        Home: 0, End: last };
      const next = tabs[targets[event.key]];
      if (!next) return;
      event.preventDefault();
      selectTab(next);
      next.focus();
    });
  }

  function render(state) {
    if (state.ranking.length) UI.renderRanking('ranking-recepcion', Store.ranking());
    else byId('ranking-recepcion').textContent = 'Marcador aún no disponible.';
    byId('count-asistentes').textContent = state.counts.attendees ?? '—';
    byId('count-donaciones').textContent = state.counts.donations ?? '—';
    byId('lista-asistentes').innerHTML = UI.table(['Estudiante', 'Cédula', 'Carrera', 'Acreditación'],
      state.attendees.filter(function (person) { return person.checked_in_at; }).map(function (person) {
        return [esc(person.nombre), esc(person.cedula), esc(Store.carrera(person.carrera).nombre), esc(UI.dateTime(person.checked_in_at))];
      }), true);
    byId('lista-donaciones').innerHTML = UI.table(['Donante', 'Carrera', 'Tipo', 'Cantidad', 'Puntos'],
      state.donations.map(function (item) {
        return [esc(item.nombre || item.cedula), esc(Store.carrera(item.carrera).nombre), esc(item.tipo), item.cantidad, item.puntos];
      }), true);
    byId('estado-dorados').innerHTML = state.qrClaims.map(function (gold) {
      return '<span class="badge ' + (gold.canjeado ? 'warn' : 'ok') + '">QR ' + gold.slot + ' · ' + (gold.canjeado ? 'Canjeado' : 'Sin canjear') + '</span>';
    }).join('');
    const sealed = state.sealed === true;
    byId('estado-cierre').textContent = sealed ? 'Datos sellados. El respaldo está disponible en escenario.' :
      state.recepcionCerrada ? 'Horario terminado. Sella los datos para generar el respaldo.' : 'Cierre programado a las 17:45.';
    byId('btn-cerrar').disabled = sealed || !state.recepcionCerrada;
    byId('reception-workspace').hidden = state.recepcionCerrada;
    paintMailStatus(state);
  }

  function setup() {
    setupTabs();
    const options = window.CIYA_DATA.carreras.map(function (career) {
      return '<option value="' + esc(career.id) + '">' + esc(career.nombre) + '</option>';
    }).join('');
    ['chk-carrera', 'chk-don-carrera', 'don-carrera'].forEach(function (id) { byId(id).innerHTML = options; });
    byId('chk-carrera').onchange = function () { byId('chk-don-carrera').value = value('chk-carrera'); };
    const checkinDonation = byId('chk-donation-fields');
    function revealCheckinDonation() {
      checkinDonation.disabled = !value('chk-don-tipo');
      checkinDonation.hidden = checkinDonation.disabled;
    }
    byId('chk-don-tipo').onchange = revealCheckinDonation;
    bind('form-checkin', 'checkin', function () {
      return { cedula: value('chk-cedula'), nombre: value('chk-nombre'), email: value('chk-email'),
        carrera: value('chk-carrera'), wall: value('chk-muro'), confirmed: checked('chk-confirm'),
        donation: value('chk-don-tipo') ? donation('chk-don-') : null };
    }, function () {
      checkinDonation.closest('details').open = false;
      revealCheckinDonation();
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
    UI.initNav('recepcion');
    if (!await UI.requireAccount('recepcion', 'Panel de recepción')) {
      byId('locked').hidden = false;
      return;
    }
    byId('panel').hidden = false;
    byId('reception-session').hidden = false;
    byId('logout').onclick = UI.logout;
    await Store.init('recepcion');
    setup();
    Store.subscribe(render);
  }

  init();
})();
