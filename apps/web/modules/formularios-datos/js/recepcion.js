(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const esc = UI.escapeHtml;
  const byId = function (id) { return document.getElementById(id); };
  const value = function (id) { return byId(id).value.trim(); };
  const checked = function (id) { return byId(id).checked; };
  const operations = [
    { id: 'acreditar', label: 'Acreditar', title: 'Acreditación presencial', template: checkinTemplate, setup: setupCheckin },
    { id: 'donar', label: 'Donar', title: 'Registrar una donación', template: donationTemplate, setup: setupDonation },
    { id: 'canjear', label: 'Canjear', title: 'Validar QR Dorado', template: goldTemplate, setup: setupGold }
  ];
  const mode = new URLSearchParams(location.search).get('modo');
  const operation = operations.find(function (item) { return item.id === mode; });
  const receiptStatus = {
    pending: 'Correo pendiente',
    sending: 'Correo en proceso',
    accepted: 'Correo aceptado por el proveedor',
    failed: 'No se pudo enviar el correo. Copia el comprobante para entregarlo.',
    uncertain: 'Envío sin confirmación. Revisa el registro de Brevo y usa el comprobante en pantalla.'
  };
  let displayedReceipt;

  function selectOptions(items) {
    return items.map(function (item) {
      return '<option value="' + esc(item.id) + '">' + esc(item.nombre) + '</option>';
    }).join('');
  }

  function checkinTemplate() {
    const careers = selectOptions(Data.carreras);
    return `
      <form class="card" id="form-checkin" aria-labelledby="reception-title">
        <p class="hint">Verifica la identidad y matrícula del estudiante.</p>
        <div class="field"><label for="chk-nombre">Nombre completo</label><input id="chk-nombre" maxlength="120" required autocomplete="name"></div>
        <div class="form-row">
          <div class="grow field"><label for="chk-cedula">Cédula</label><input id="chk-cedula" required inputmode="numeric" pattern="[0-9]{10}"></div>
          <div class="grow field"><label for="chk-carrera">Carrera</label><select id="chk-carrera" required>${careers}</select></div>
        </div>
        <div class="form-row">
          <div class="grow field"><label for="chk-ciclo">Ciclo</label><select id="chk-ciclo" required>${selectOptions(Data.ciclos)}</select></div>
          <div class="grow field"><label for="chk-email">Correo para el comprobante</label><input id="chk-email" type="email" maxlength="254" required></div>
        </div>
        <div class="field"><label for="chk-muro">Mensaje verificado en el Muro de la Empatía</label><input id="chk-muro" maxlength="140"></div>
        <label><input id="chk-confirm" type="checkbox" required> Identidad y elegibilidad verificadas en persona</label>
        <details>
          <summary>Agregar una donación a este registro</summary>
          <div class="field"><label for="chk-don-tipo">Tipo</label><select id="chk-don-tipo"><option value="">Sin donación</option><option value="juguete">Juguete funcional</option><option value="caramelos">Funda de caramelos</option></select></div>
          <fieldset id="chk-donation-fields" disabled hidden>
            <div class="field"><label for="chk-don-cantidad">Cantidad</label><input id="chk-don-cantidad" type="number" min="1" max="1000" value="1" required></div>
            <div class="field"><label for="chk-don-carrera">Carrera beneficiada</label><select id="chk-don-carrera" required>${careers}</select></div>
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
      </details>`;
  }

  function donationTemplate() {
    return `
      <form class="card" id="form-donation" aria-labelledby="reception-title">
        <p class="hint">Juguete funcional y completo o funda industrial sellada de al menos 200 g. Cada aporte debe llevar un mensaje de empatía.</p>
        <div class="field"><label for="don-cedula">Cédula del donante</label><input id="don-cedula" required inputmode="numeric" pattern="[0-9]{10}"></div>
        <div class="form-row">
          <div class="grow field"><label for="don-tipo">Tipo</label><select id="don-tipo"><option value="juguete">Juguete funcional</option><option value="caramelos">Funda de caramelos</option></select></div>
          <div class="grow field"><label for="don-cantidad">Cantidad</label><input id="don-cantidad" type="number" min="1" max="1000" value="1" required></div>
        </div>
        <div class="field"><label for="don-carrera">Carrera beneficiada</label><select id="don-carrera">${selectOptions(Data.carreras)}</select></div>
        <label><input id="don-confirm" type="checkbox" required> Aporte válido con mensaje de empatía</label>
        <button class="btn primary wide" type="submit">Contabilizar donación</button>
      </form>`;
  }

  function goldTemplate() {
    return `
      <form class="card" id="form-gold" aria-labelledby="reception-title">
        <p class="hint">Verifica la captura del QR Dorado y la credencial estudiantil. El canje está disponible hasta el sellado de recepción.</p>
        <div class="field">
          <label for="oro-codigo">Código de canje</label>
          <input id="oro-codigo" required autocomplete="off" autocapitalize="characters" spellcheck="false"
            aria-describedby="oro-codigo-ayuda oro-codigo-error">
          <p class="hint" id="oro-codigo-ayuda">Ingresa el código de la captura, por ejemplo CIYA-ORO-01.</p>
          <p class="pin-error" id="oro-codigo-error" role="alert" hidden></p>
        </div>
        <div class="field"><label for="oro-cedula">Cédula del estudiante</label><input id="oro-cedula" inputmode="numeric" pattern="[0-9]{10}" required></div>
        <label><input id="oro-declaracion" type="checkbox" required> Captura del QR Dorado, credencial estudiantil y juego limpio verificados</label>
        <button class="btn primary wide" type="submit">Validar y asignar 3 boletos</button>
      </form>
      <div class="gold-availability" id="estado-dorados" aria-label="Estado de los QR Dorados"></div>`;
  }

  function navigationTemplate() {
    const links = [{ href: 'recepcion.html', label: 'Resumen', active: !operation }].concat(
      operations.map(function (item) {
        return { href: 'recepcion.html?modo=' + item.id, label: item.label, active: item === operation };
      })
    );
    return `<nav class="reception-nav" aria-label="Operaciones de recepción">
      ${links.map(function (link) {
        return '<a class="btn ' + (link.active ? 'primary' : 'ghost') + '" href="' + link.href + '"' +
          (link.active ? ' aria-current="page"' : '') + '>' + link.label + '</a>';
      }).join('')}
    </nav>`;
  }

  function operationTemplate() {
    return `
      <div class="card" id="reception-sealed" role="status" hidden>
        <p>Recepción está sellada. Consulta los registros en <a href="recepcion.html">Resumen</a>.</p>
      </div>
      <section class="reception-workspace" id="reception-workspace" aria-labelledby="reception-title">
        ${operation.template()}
      </section>
      <section class="card receipt-card" id="receipt-card" aria-labelledby="receipt-heading" hidden>
        <h2 id="receipt-heading">Último comprobante</h2>
        <div id="chk-result" tabindex="-1" aria-live="polite"></div>
      </section>`;
  }

  function recordList(id, title, icon) {
    return `
      <details class="card record-list record-list-${id}">
        <summary class="record-summary">
          <span class="feature-icon">${UI.icon(icon)}</span>
          <span class="record-title">${title}</span>
          <span class="record-count" id="count-${id}">—</span>
          <span class="record-chevron" aria-hidden="true"></span>
        </summary>
        <div class="record-content" id="lista-${id}"></div>
      </details>`;
  }

  function overviewTemplate() {
    return `
      <section class="section">
        <div class="section-head"><div><span class="kicker">En vivo</span><h2>Copa Solidaria Inter-Carreras</h2></div><button class="btn small" id="export-ranking">Descargar ranking CSV</button></div>
        <div class="card" id="ranking-recepcion"></div>
      </section>
      <section class="section reception-records" aria-label="Registros de recepción">
        ${recordList('asistentes', 'Asistentes registrados', 'groups')}
        ${recordList('donaciones', 'Donaciones registradas', 'favorite')}
      </section>
      <section class="section card">
        <div class="row between"><div><h3>Cierre de recepción</h3><p class="muted">Cuando termines de registrar los datos, marca el cierre para sellarlos y generar el respaldo local de la ruleta y el ranking.</p></div><button class="btn danger" id="btn-cerrar" disabled>Marcar cierre de recepción</button></div>
        <p id="estado-cierre"></p>
      </section>`;
  }

  function template(title) {
    return `
      <div class="section-head reception-heading">
        <h1 id="reception-title">${title}</h1>
      </div>
      <div id="locked" hidden><p class="empty">Inicia sesión con una cuenta de recepción.</p></div>
      <div id="panel" hidden>
        ${navigationTemplate()}
        ${operation ? operationTemplate() : overviewTemplate()}
      </div>`;
  }

  function mount() {
    const root = byId('recepcion-root');
    const title = operation ? operation.title : 'Recepción solidaria';
    root.classList.toggle('reception-operation', Boolean(operation));
    root.innerHTML = template(title);
    document.title = title + ' | CIYA Navidad 2026';
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
      const data = payload();
      if (!data) {
        event.preventDefault();
        return;
      }
      UI.submit(event, action, data, true, function (result) {
        showReceipt(result);
        form.reset();
        if (reset) reset();
        if (form.getClientRects().length) byId('chk-result').focus();
        UI.toast('Operación registrada.');
      });
    });
  }

  function renderOverview(state) {
    if (state.ranking.length) UI.renderRanking('ranking-recepcion', Store.ranking());
    else byId('ranking-recepcion').textContent = 'Marcador aún no disponible.';
    byId('count-asistentes').textContent = state.counts.attendees == null ? '—' : state.counts.attendees;
    byId('count-donaciones').textContent = state.counts.donations == null ? '—' : state.counts.donations;
    byId('lista-asistentes').innerHTML = UI.table(['Estudiante', 'Cédula', 'Carrera', 'Ciclo', 'Acreditación'],
      state.attendees.filter(function (person) { return person.checked_in_at; }).map(function (person) {
        return [esc(person.nombre), esc(person.cedula), esc(Store.carrera(person.carrera).nombre),
          esc(Store.cicloNombre(person.ciclo) || '—'), esc(UI.dateTime(person.checked_in_at))];
      }), true);
    byId('lista-donaciones').innerHTML = UI.table(['Donante', 'Carrera', 'Tipo', 'Cantidad', 'Puntos'],
      state.donations.map(function (item) {
        return [esc(item.nombre || item.cedula), esc(Store.carrera(item.carrera).nombre), esc(item.tipo), item.cantidad, item.puntos];
      }), true);
    const sealed = state.sealed === true;
    byId('estado-cierre').textContent = sealed ? 'Datos sellados. El respaldo está disponible en escenario.' :
      'Recepción está abierta. Puedes registrar información o confirmar el cierre en cualquier fecha.';
    byId('btn-cerrar').disabled = sealed;
  }

  function renderOperation(state) {
    const sealed = state.sealed === true;
    byId('reception-workspace').hidden = sealed;
    byId('reception-sealed').hidden = !sealed;
    if (operation.id === 'canjear') {
      byId('estado-dorados').innerHTML = state.qrClaims.map(function (gold) {
        return '<span class="badge ' + (gold.canjeado ? 'warn' : 'ok') + '">QR ' + gold.slot + ' · ' + (gold.canjeado ? 'Canjeado' : 'Sin canjear') + '</span>';
      }).join('');
    }
    paintMailStatus(state);
  }

  function setupCheckin() {
    byId('chk-carrera').onchange = function () { byId('chk-don-carrera').value = value('chk-carrera'); };
    const checkinDonation = byId('chk-donation-fields');
    function revealCheckinDonation() {
      checkinDonation.disabled = !value('chk-don-tipo');
      checkinDonation.hidden = checkinDonation.disabled;
    }
    byId('chk-don-tipo').onchange = revealCheckinDonation;
    bind('form-checkin', 'checkin', function () {
      return { cedula: value('chk-cedula'), nombre: value('chk-nombre'), email: value('chk-email'),
        carrera: value('chk-carrera'), ciclo: value('chk-ciclo'), wall: value('chk-muro'), confirmed: checked('chk-confirm'),
        donation: value('chk-don-tipo') ? donation('chk-don-') : null };
    }, function () {
      checkinDonation.closest('details').open = false;
      revealCheckinDonation();
    });
    bind('form-wall', 'checkin', function () {
      return { cedula: value('wall-cedula'), wall: value('wall-mensaje'), confirmOnly: true };
    });
  }

  function setupDonation() {
    bind('form-donation', 'donate', function () { return { ...donation('don-'), cedula: value('don-cedula') }; });
  }

  function normalizeGoldCode(raw) {
    return raw.replace(/\s/g, '').toUpperCase();
  }

  function setupGold() {
    const codeInput = byId('oro-codigo');
    const error = byId('oro-codigo-error');
    function normalizeCodeInput(event) {
      if (event.isComposing) return;
      const { value: raw, selectionStart, selectionEnd, selectionDirection } = codeInput;
      const code = normalizeGoldCode(raw);
      if (code !== raw) {
        codeInput.value = code;
        codeInput.setSelectionRange(
          normalizeGoldCode(raw.slice(0, selectionStart)).length,
          normalizeGoldCode(raw.slice(0, selectionEnd)).length,
          selectionDirection
        );
      }
      codeInput.removeAttribute('aria-invalid');
      error.hidden = true;
    }
    codeInput.addEventListener('input', normalizeCodeInput);
    codeInput.addEventListener('compositionend', normalizeCodeInput);
    bind('form-gold', 'redeem', function () {
      const code = normalizeGoldCode(codeInput.value).replace(/-/g, '');
      const match = /^CIYAORO(0[1-3])$/.exec(code);
      if (!match) {
        codeInput.setAttribute('aria-invalid', 'true');
        error.hidden = false;
        error.textContent = /^DORADO[0-9]/.test(code)
          ? 'Ese es un código de prueba. Usa el código que muestra el QR Dorado impreso.'
          : 'Revisa que el código sea CIYA-ORO-01, CIYA-ORO-02 o CIYA-ORO-03.';
        codeInput.focus();
        return null;
      }
      return { cedula: value('oro-cedula'), code: 'CIYA-ORO-' + match[1], confirmed: checked('oro-declaracion') };
    });
  }

  function setupOverview() {
    byId('btn-cerrar').onclick = async function (event) {
      if (!confirm('¿Sellar la recepción? Se cerrará el registro y se generará el respaldo final de Escenario.')) return;
      await UI.submit(event, 'seal', {}, true, function () { UI.toast('Recepción sellada.'); });
      renderOverview(Store.get());
    };
    byId('export-ranking').onclick = function () {
      const rows = Store.ranking().map(function (r) { return [r.puesto, r.nombre, r.puntos, r.juguetes, r.caramelos, r.total, r.donantes]; });
      rows.unshift(['Puesto', 'Carrera', 'Puntos', 'Juguetes', 'Fundas', 'Total', 'Donantes únicos']);
      UI.download('ciya2026-ranking.csv', UI.csv(rows), 'text/csv;charset=utf-8');
    };
  }

  async function init() {
    if (!Store.configured()) {
      location.replace('index.html');
      return;
    }
    mount();
    UI.initNav('recepcion');
    if (!await UI.requireAccount('recepcion', 'Panel de recepción')) {
      byId('locked').hidden = false;
      return;
    }
    await Store.init('recepcion');
    if (operation) {
      operation.setup();
      Store.subscribe(renderOperation);
    } else {
      setupOverview();
      Store.subscribe(renderOverview);
    }
    byId('panel').hidden = false;
  }

  window.CIYA_RECEPCION = { mount, init };
  init();
})();
