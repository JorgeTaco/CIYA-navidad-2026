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

  function template() {
    return `
      <div class="section-head reception-heading">
        <h1>Recepción solidaria</h1>
        <div class="row" id="reception-session" hidden>
          <span class="sync-pill" id="sync-status">Conectando</span>
          <button class="btn ghost small" id="logout">Cerrar sesión</button>
        </div>
      </div>
      <div id="locked" hidden><p class="empty">Inicia sesión con una cuenta de recepción.</p></div>
      <div id="panel" hidden>
        <section class="reception-workspace" id="reception-workspace" aria-label="Operaciones de recepción">
          <div class="reception-tabs" role="tablist" aria-label="Operaciones">
            <button id="tab-acreditar" type="button" role="tab" aria-controls="panel-acreditar" aria-selected="true">Acreditar</button>
            <button id="tab-donar" type="button" role="tab" aria-controls="panel-donar" aria-selected="false" tabindex="-1">Donar</button>
            <button id="tab-canjear" type="button" role="tab" aria-controls="panel-canjear" aria-selected="false" tabindex="-1">Canjear</button>
          </div>
          <div id="panel-acreditar" role="tabpanel" aria-labelledby="tab-acreditar">
            <form class="card" id="form-checkin">
              <h2>Acreditación presencial</h2>
              <p class="hint">De 17:00 a 17:45. Verifica la identidad y matrícula del estudiante.</p>
              <div class="field"><label for="chk-nombre">Nombre completo</label><input id="chk-nombre" maxlength="120" required autocomplete="name"></div>
              <div class="form-row">
                <div class="grow field"><label for="chk-cedula">Cédula</label><input id="chk-cedula" required inputmode="numeric" pattern="[0-9]{10}"></div>
                <div class="grow field"><label for="chk-carrera">Carrera</label><select id="chk-carrera" required></select></div>
              </div>
              <div class="field"><label for="chk-email">Correo para el comprobante</label><input id="chk-email" type="email" maxlength="254" required></div>
              <div class="field"><label for="chk-muro">Mensaje verificado en el Muro de la Empatía</label><input id="chk-muro" maxlength="140"></div>
              <label><input id="chk-confirm" type="checkbox" required> Identidad y elegibilidad verificadas en persona</label>
              <details>
                <summary>Agregar una donación a este registro</summary>
                <div class="field"><label for="chk-don-tipo">Tipo</label><select id="chk-don-tipo"><option value="">Sin donación</option><option value="juguete">Juguete funcional</option><option value="caramelos">Funda de caramelos</option></select></div>
                <fieldset id="chk-donation-fields" disabled hidden>
                  <div class="field"><label for="chk-don-cantidad">Cantidad</label><input id="chk-don-cantidad" type="number" min="1" max="1000" value="1" required></div>
                  <div class="field"><label for="chk-don-carrera">Carrera beneficiada</label><select id="chk-don-carrera" required></select></div>
                  <label><input id="chk-don-confirm" type="checkbox" required> Aporte válido con mensaje de empatía</label>
                </fieldset>
              </details>
              <button class="btn primary wide" type="submit">Acreditar y emitir comprobante</button>
            </form>
            <details class="card wall-confirmation">
              <summary>Confirmar mensaje del muro después del ingreso</summary>
              <form id="form-wall">
                <div class="field"><label for="wall-cedula">Cédula acreditada</label><input id="wall-cedula" required inputmode="numeric" pattern="[0-9]{10}"></div>
                <div class="field"><label for="wall-mensaje">Mensaje verificado</label><input id="wall-mensaje" maxlength="140" required></div>
                <button class="btn primary wide" type="submit">Confirmar mensaje</button>
              </form>
            </details>
          </div>
          <div id="panel-donar" role="tabpanel" aria-labelledby="tab-donar" hidden>
            <form class="card" id="form-donation">
              <h2>Registrar una donación</h2>
              <p class="hint">De 08:00 a 17:45. Juguete funcional y completo o funda industrial sellada de al menos 200 g. Cada aporte debe llevar un mensaje de empatía.</p>
              <div class="field"><label for="don-cedula">Cédula del donante</label><input id="don-cedula" required inputmode="numeric" pattern="[0-9]{10}"></div>
              <div class="form-row">
                <div class="grow field"><label for="don-tipo">Tipo</label><select id="don-tipo"><option value="juguete">Juguete funcional</option><option value="caramelos">Funda de caramelos</option></select></div>
                <div class="grow field"><label for="don-cantidad">Cantidad</label><input id="don-cantidad" type="number" min="1" max="1000" value="1" required></div>
              </div>
              <div class="field"><label for="don-carrera">Carrera beneficiada</label><select id="don-carrera"></select></div>
              <label><input id="don-confirm" type="checkbox" required> Aporte válido con mensaje de empatía</label>
              <button class="btn primary wide" type="submit">Contabilizar donación</button>
            </form>
          </div>
          <div id="panel-canjear" role="tabpanel" aria-labelledby="tab-canjear" hidden>
            <form class="card" id="form-gold">
              <h2>Validar QR Dorado</h2>
              <p class="hint">Verifica la pantalla activa y la credencial estudiantil antes de las 17:45.</p>
              <div class="field"><label for="oro-codigo">Clave de la pantalla activa</label><input id="oro-codigo" required maxlength="16" pattern="[A-Fa-f0-9]{16}" autocomplete="off" autocapitalize="characters"></div>
              <div class="field"><label for="oro-cedula">Cédula del estudiante</label><input id="oro-cedula" inputmode="numeric" pattern="[0-9]{10}" required></div>
              <label><input id="oro-declaracion" type="checkbox" required> Pantalla activa, credencial estudiantil y juego limpio verificados</label>
              <button class="btn primary wide" type="submit">Validar y asignar 3 boletos</button>
            </form>
            <div class="gold-availability" id="estado-dorados" aria-label="Estado de los QR Dorados"></div>
          </div>
        </section>
        <section class="card receipt-card" id="receipt-card" aria-labelledby="receipt-heading" hidden>
          <h2 id="receipt-heading">Último comprobante</h2>
          <div id="chk-result" tabindex="-1" aria-live="polite"></div>
        </section>
        <section class="section">
          <div class="section-head"><div><span class="kicker">En vivo</span><h2>Copa Solidaria Inter-Carreras</h2></div><button class="btn small" id="export-ranking">Descargar ranking CSV</button></div>
          <div class="card" id="ranking-recepcion"></div>
        </section>
        <section class="section grid cols-2" aria-label="Registros de recepción">
          <details class="card record-list"><summary>Asistentes registrados <span class="badge" id="count-asistentes">—</span></summary><div id="lista-asistentes"></div></details>
          <details class="card record-list"><summary>Donaciones registradas <span class="badge" id="count-donaciones">—</span></summary><div id="lista-donaciones"></div></details>
        </section>
        <section class="section card">
          <div class="row between"><div><h3>Cierre de recepción</h3><p class="muted">El cierre formal es a las 17:45. Al cerrar, la consola de escenario puede descargar el respaldo local JSON de la ruleta y el ranking.</p></div><button class="btn danger" id="btn-cerrar">Marcar cierre de recepción</button></div>
          <p id="estado-cierre"></p>
        </section>
      </div>`;
  }

  function mount() {
    document.getElementById('recepcion-root').innerHTML = template();
  }

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
    byId('count-asistentes').textContent = state.counts.attendees == null ? '—' : state.counts.attendees;
    byId('count-donaciones').textContent = state.counts.donations == null ? '—' : state.counts.donations;
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
    mount();
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

  window.CIYA_RECEPCION = { mount, init };
  init();
})();
