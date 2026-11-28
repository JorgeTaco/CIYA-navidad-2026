(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const QRCode = window.CIYA_QR_CODE;
  const esc = UI.escapeHtml;

  function template() {
    return `
      <div class="section-head">
        <div><span class="kicker">Docentes organizadores y Asociación Estudiantil</span><h1>Curaduría y Evaluación</h1></div>
      </div>
      <div id="locked" hidden><p class="empty">Esta vista privada requiere una cuenta de administración.</p></div>
      <div id="panel" hidden>
        <section class="section">
          <div class="section-head"><div><h2 id="admin-wishes-title" tabindex="-1">Buzón “Compilando Deseos 2027”</h2><p class="muted">Revisa, aprueba o descarta las frases. Las aprobadas podrán proyectarse en la chocolatada y exportarse para redes de CIYA en enero.</p></div>
            <div class="row"><button class="btn small" id="export-aprobados">Exportar aprobados CSV</button><button class="btn small ghost" id="export-todos">Exportar todos CSV</button></div>
          </div>
          <div class="card"><div id="lista-deseos"></div></div>
          <dialog class="card discard-wish-dialog" id="discard-wish-dialog" aria-labelledby="discard-wish-title" aria-describedby="discard-wish-question">
            <h2 id="discard-wish-title">Descartar mensaje</h2>
            <p id="discard-wish-question">¿Estás seguro de que deseas descartar este mensaje?</p>
            <p class="pin-error" id="discard-wish-error" role="alert" hidden></p>
            <div class="row end">
              <button class="btn ghost" id="discard-wish-cancel" type="button" autofocus>Cancelar</button>
              <button class="btn danger" id="discard-wish-confirm" type="button">Descartar mensaje</button>
            </div>
          </dialog>
        </section>
        <section class="section grid cols-2">
          <form class="card" id="form-puerta">
            <h2>Evaluación de Puertas Decoradas</h2>
            <p class="muted">Jurado: viernes 4 de diciembre, 15:30 – 16:45. Matriz de 100 puntos.</p>
            <div class="field"><label for="puerta-carrera">Carrera evaluada</label><select id="puerta-carrera"></select></div>
            <div id="puerta-criterios"></div>
            <div class="field"><label for="puerta-notas">Observaciones</label><textarea id="puerta-notas" maxlength="400"></textarea></div>
            <button class="btn primary wide" id="guardar-puerta" type="submit">Guardar evaluación</button>
          </form>
          <div class="card"><h3>Resultado de puertas</h3><div id="ranking-puertas"></div></div>
        </section>
        <section class="section card">
          <h2>Calificaciones de villancicos registradas</h2>
          <div id="lista-scores"></div>
        </section>
        <section class="section card" id="admin-gold">
          <h2>Impresión privada de los QR Dorados</h2>
          <p>Imprime los tres QR oficiales para colocarlos en la facultad. El primer escaneo reserva el código de canje. Mantén privado este listado.</p>
          <div class="grid auto gold-print-grid" id="gold-links"></div>
          <div class="row">
            <button class="btn" id="print-gold" type="button">Imprimir listado privado</button>
            <button class="btn ghost" id="reset-gold-tests" type="button" hidden>Reiniciar escaneos de QR Dorados (pruebas)</button>
          </div>
        </section>
        <section class="section card" id="admin-import">
          <h2>Importar respaldo de la primera versión</h2>
          <p>Revisa los datos antes de importarlos a una instancia nueva. Confirma solo las acreditaciones verificadas presencialmente.</p>
          <input type="file" id="legacy-file" accept=".json,application/json">
          <button class="btn" id="legacy-preview">Revisar archivo</button>
          <div id="legacy-report" aria-live="polite"></div>
          <button class="btn primary" id="legacy-apply" hidden>Importar respaldo revisado</button>
        </section>
      </div>`;
  }

  function mount() {
    document.getElementById('admin-root').innerHTML = template();
  }

  function exportDeseos(OnlyApproved) {
    const rows = [['Nombre', 'Rol', 'Carrera/Área', 'Frase', 'Estado', 'Fecha']];
    Store.get().deseos.filter(function (d) { return !OnlyApproved || d.aprobado; }).forEach(function (d) {
      rows.push([d.nombre, d.rol, d.carrera, d.frase, d.aprobado ? 'Aprobado' : 'Pendiente', UI.dateTime(d.creado)]);
    });
    UI.download(OnlyApproved ? 'ciya2026-deseos-aprobados.csv' : 'ciya2026-deseos-todos.csv', UI.csv(rows), 'text/csv;charset=utf-8');
  }

  function setupImport() {
    let preview;
    const input = document.getElementById('legacy-file');
    const report = document.getElementById('legacy-report');
    const apply = document.getElementById('legacy-apply');

    function reset() {
      preview = null;
      report.replaceChildren();
      apply.hidden = true;
    }
    input.addEventListener('change', reset);
    document.getElementById('legacy-preview').onclick = async function () {
      reset();
      try {
        const file = input.files[0];
        if (!file) throw new Error('Selecciona un respaldo de la primera versión.');
        const backup = JSON.parse(await file.text());
        if (!backup || !Array.isArray(backup.attendees) || backup.version === 2) {
          throw new Error('El archivo debe contener la lista de asistentes de la primera versión.');
        }
        const records = ['donations', 'groups', 'deseos', 'scores', 'puertas', 'qrClaims', 'muro', 'winners'];
        records.forEach(function (key) {
          if (backup[key] === undefined) backup[key] = [];
          if (!Array.isArray(backup[key])) throw new Error('Lista inválida en el respaldo: ' + key);
        });
        const ids = new Set();
        const emails = new Map();
        const checks = [];
        for (const person of backup.attendees) {
          const cedula = String(person.cedula == null ? '' : person.cedula).trim();
          if (!/^\d{10}$/.test(cedula) || ids.has(cedula)) throw new Error('Cédula inválida o duplicada: ' + cedula);
          ids.add(cedula);
          const email = String(person.email == null ? '' : person.email).trim().toLowerCase();
          if (email) emails.set(email, (emails.get(email) || 0) + 1);
          const label = document.createElement('label');
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = cedula;
          checkbox.disabled = !person.nombre || !email || !Data.carreras.some(function (career) { return career.id === person.carrera; });
          label.append(checkbox, ' ' + (person.nombre || 'Registro pendiente') + ' · ' + cedula);
          checks.push({ label, checkbox, email });
        }
        const donations = backup.donations;
        const claims = backup.qrClaims.filter(function (claim) { return claim.canjeado === true; });
        for (const item of [...donations, ...claims]) {
          if (!ids.has(String(item.cedula == null ? '' : item.cedula).trim())) throw new Error('Hay aportes o canjes sin asistente asociado.');
        }
        if (new Set(claims.map(function (claim) { return claim.codigo; })).size !== claims.length ||
          new Set(claims.map(function (claim) { return claim.cedula; })).size !== claims.length) {
          throw new Error('Hay canjes duplicados. Revisa el respaldo antes de continuar.');
        }
        const summary = document.createElement('p');
        summary.textContent = ids.size + ' asistentes, ' + donations.length + ' donaciones, ' + claims.length + ' canjes, ' +
          backup.groups.length + ' grupos y ' + backup.deseos.length + ' deseos. Marca solo los ingresos verificados.';
        report.append(summary);
        if (Array.from(emails.values()).some(function (count) { return count > 1; })) {
          const warning = document.createElement('p');
          warning.textContent = 'Hay correos repetidos. Solo se puede confirmar un registro por correo.';
          report.append(warning);
        }
        if (backup.groups.some(function (group) { return group.carreras && group.carreras.length > 1; })) {
          const warning = document.createElement('p');
          warning.textContent = 'Los grupos con varias carreras se importarán con la primera carrera registrada.';
          report.append(warning);
        }
        checks.forEach(function ({ label }) { report.append(label, document.createElement('br')); });
        preview = { backup, checks, id: Store.newRequestId() };
        apply.hidden = false;
      } catch (error) {
        report.textContent = error.message;
      }
    };

    apply.onclick = async function () {
      if (!preview) return;
      const verified = preview.checks.filter(function (entry) { return entry.checkbox.checked; });
      if (new Set(verified.map(function (entry) { return entry.email; })).size !== verified.length) {
        return UI.toast('Selecciona un solo registro por correo.', 'bad');
      }
      if (!confirm('¿Importar el archivo con ' + verified.length + ' acreditaciones verificadas?')) return;
      apply.disabled = true;
      try {
        await Store.importLegacy(preview.backup, verified.map(function (entry) { return entry.checkbox.value; }), preview.id);
        reset();
        input.value = '';
        UI.toast('Respaldo importado.');
      } catch (error) {
        UI.toast(error.message, 'bad');
      } finally {
        apply.disabled = false;
      }
    };
  }

  function setupDiscardDialog() {
    const list = document.getElementById('lista-deseos');
    const dialog = document.getElementById('discard-wish-dialog');
    const error = document.getElementById('discard-wish-error');
    const cancelButton = document.getElementById('discard-wish-cancel');
    const confirmButton = document.getElementById('discard-wish-confirm');
    const discardSelector = '[data-moderate="discard"]';
    let wishId;

    list.addEventListener('click', function (event) {
      const trigger = event.target.closest(discardSelector);
      if (!trigger) return;
      wishId = trigger.dataset.id;
      error.hidden = true;
      dialog.showModal();
    });
    cancelButton.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('cancel', function (event) {
      if (confirmButton.disabled) event.preventDefault();
    });
    dialog.addEventListener('close', function () {
      if (dialog.open) return;
      const trigger = Array.from(list.querySelectorAll(discardSelector)).find(function (button) {
        return button.dataset.id === wishId;
      });
      (trigger || document.getElementById('admin-wishes-title')).focus();
    });
    confirmButton.addEventListener('click', async function () {
      confirmButton.disabled = true;
      cancelButton.disabled = true;
      error.hidden = true;
      try {
        await Store.action('moderate', { id: wishId, decision: 'discard' }, true);
        dialog.close();
        UI.toast('Mensaje descartado.');
      } catch (failure) {
        error.textContent = failure.message;
        error.hidden = false;
      } finally {
        confirmButton.disabled = false;
        cancelButton.disabled = false;
        if (dialog.open) confirmButton.focus();
      }
    });
  }

  async function setupGoldTestReset() {
    const button = document.getElementById('reset-gold-tests');
    try {
      const capability = await Store.goldTestReset(false);
      if (capability.enabled !== true) return;
    } catch {
      return;
    }
    button.hidden = false;
    button.addEventListener('click', async function () {
      button.disabled = true;
      try {
        const result = await Store.goldTestReset(true);
        UI.toast(result.reset ? 'Los QR Dorados pendientes se pueden volver a escanear.' : 'No hay escaneos pendientes que reiniciar.');
      } catch (error) {
        UI.toast(error.message, 'bad');
      } finally {
        button.disabled = false;
      }
    });
  }

  function setup() {
    document.getElementById('puerta-carrera').innerHTML = Data.carreras.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.nombre) + '</option>';
    }).join('');
    document.getElementById('puerta-criterios').innerHTML = Data.criteriosPuertas.map(function (c) {
      return '<div class="field"><label for="puerta-' + c.id + '">' + esc(c.nombre) + ' (0–' + c.peso + ')</label>' +
        '<input id="puerta-' + c.id + '" type="number" min="0" max="' + c.peso + '" value="0" required></div>';
    }).join('') + '<p><strong>Total: <span id="puerta-total">0</span> / 100</strong></p>';
    document.querySelectorAll('#puerta-criterios input').forEach(function (input) {
      input.addEventListener('input', function () {
        const total = Data.criteriosPuertas.reduce(function (sum, c) {
          return sum + Number(document.getElementById('puerta-' + c.id).value || 0);
        }, 0);
        document.getElementById('puerta-total').textContent = total;
      });
    });

    document.getElementById('form-puerta').addEventListener('submit', function (event) {
      const criterios = {};
      Data.criteriosPuertas.forEach(function (criterion) {
        criterios[criterion.id] = Number(document.getElementById('puerta-' + criterion.id).value);
      });
      UI.submit(event, 'door', { subject: document.getElementById('puerta-carrera').value, criterios,
        observaciones: document.getElementById('puerta-notas').value.trim() }, true,
        function () { UI.toast('Evaluación guardada.'); });
    });
    document.getElementById('print-gold').onclick = function () {
      document.body.classList.add('print-gold');
      window.print();
    };
    window.addEventListener('afterprint', function () { document.body.classList.remove('print-gold'); });
    setupImport();
    setupDiscardDialog();
    setupGoldTestReset();

    document.getElementById('export-aprobados').addEventListener('click', function () { exportDeseos(true); });
    document.getElementById('export-todos').addEventListener('click', function () { exportDeseos(false); });
    Store.subscribe(render);
  }

  function render(state) {
    document.getElementById('lista-deseos').innerHTML = state.deseos.length ? state.deseos.slice().reverse().map(function (d) {
      return '<div class="timeline-step" style="align-items:flex-start"><div class="grow"><strong>' + esc(d.nombre) + '</strong> <span class="badge">' + esc(d.rol) + '</span> ' +
        '<span class="badge">' + esc(d.carrera) + '</span> <span class="badge ' + (d.aprobado ? 'ok' : 'warn') + '">' + (d.aprobado ? 'Aprobado' : 'Pendiente') + '</span>' +
        '<p style="margin:0.4rem 0 0">“' + esc(d.frase) + '”</p><small>' + esc(UI.dateTime(d.creado)) + '</small></div>' +
        '<div class="row"><button class="btn small" data-moderate="approve" data-id="' + esc(d.id) + '">Aprobar</button>' +
        '<button class="btn small danger" data-moderate="discard" data-id="' + esc(d.id) + '">Descartar</button></div></div>';
    }).join('') : '<p class="empty">Aún no hay frases enviadas.</p>';

    document.querySelectorAll('[data-moderate="approve"]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        UI.submit(event, 'moderate', { id: button.dataset.id, decision: 'approve' }, true,
          function () { UI.toast('Decisión guardada.'); });
      });
    });

    document.getElementById('gold-links').innerHTML = (state.goldLinks || []).map(function (gold) {
      const url = new URL('qr.html#dorado=' + gold.secret, location.href).href;
      const title = 'QR Dorado ' + gold.slot;
      let qr = '';
      try {
        qr = QRCode.toSvg(url, { label: 'Código oficial del ' + title, margin: 4 });
      } catch {}
      return `<article class="card gold-print-card">
        <h3>${esc(title)}</h3>
        ${qr}
        <p class="break-url">${esc(url)}</p>
        <button class="btn small" type="button" data-copy-gold="${esc(url)}">Copiar URL</button>
      </article>`;
    }).join('');
    document.querySelectorAll('[data-copy-gold]').forEach(function (button) {
      button.onclick = function () { UI.copy(button.dataset.copyGold); };
    });

    const puestos = state.puertas.slice().sort(function (a, b) { return b.total - a.total; });
    document.getElementById('ranking-puertas').innerHTML = puestos.length ? puestos.map(function (p, index) {
      const carrera = Store.carrera(p.carrera);
      return '<div class="ranking-row"><div class="ranking-head"><span>' + (index + 1) + '. ' + esc(carrera.nombre) + '</span><strong>' + Number(p.total) + '/100</strong></div>' +
        '<div class="bar"><span style="width:' + Number(p.total) + '%;--bar-color:' + carrera.color + '"></span></div>' +
        (p.observaciones ? '<small>' + esc(p.observaciones) + '</small>' : '') + '</div>';
    }).join('') : '<p class="empty">Sin evaluaciones registradas.</p>';

    document.getElementById('lista-scores').innerHTML = UI.table(['Grupo', 'Creatividad', 'Musical', 'Escena', 'Aplauso', 'Total'],
      state.scores.map(function (s) {
        const group = state.groups.find(function (g) { return g.id === s.grupoId; });
        return [esc(group ? group.nombre : 'Grupo'), Number((s.criterios && s.criterios.creatividad) || 0), Number((s.criterios && s.criterios.musical) || 0), Number((s.criterios && s.criterios.escena) || 0), Number(s.aplauso || 0), Number(s.total) + '/100'];
      })
    );
  }

  async function init() {
    if (!Store.configured()) {
      location.replace('index.html');
      return;
    }
    mount();
    UI.initNav('admin');
    const ok = await UI.requireAccount('admin', 'Panel administrativo');
    if (!ok) {
      document.getElementById('locked').hidden = false;
      return;
    }
    document.getElementById('panel').hidden = false;
    await Store.init('admin');
    setup();
  }

  window.CIYA_ADMIN = { mount, init };
  init();
})();
