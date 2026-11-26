(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const esc = UI.escapeHtml;

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
          const cedula = String(person.cedula ?? '').trim();
          if (!/^\d{10}$/.test(cedula) || ids.has(cedula)) throw new Error('Cédula inválida o duplicada: ' + cedula);
          ids.add(cedula);
          const email = String(person.email ?? '').trim().toLowerCase();
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
          if (!ids.has(String(item.cedula ?? '').trim())) throw new Error('Hay aportes o canjes sin asistente asociado.');
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
        if (backup.groups.some(function (group) { return group.carreras?.length > 1; })) {
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

  function setup() {
    document.getElementById('puerta-carrera').innerHTML = Data.carreras.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.nombre) + '</option>';
    }).join('');
    document.getElementById('puerta-criterios').innerHTML = Data.criteriosPuertas.map(function (c) {
      return '<div class="field"><label for="puerta-' + c.id + '">' + esc(c.nombre) + ' (0–' + c.peso + ')</label>' +
        '<input id="puerta-' + c.id + '" type="number" min="0" max="' + c.peso + '" value="0"></div>';
    }).join('') + '<p><strong>Total: <span id="puerta-total">0</span> / 100</strong></p>';
    document.querySelectorAll('#puerta-criterios input').forEach(function (input) {
      input.addEventListener('input', function () {
        const total = Data.criteriosPuertas.reduce(function (sum, c) {
          return sum + Number(document.getElementById('puerta-' + c.id).value || 0);
        }, 0);
        document.getElementById('puerta-total').textContent = total;
      });
    });

    document.getElementById('guardar-puerta').addEventListener('click', function (event) {
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

    document.getElementById('export-aprobados').addEventListener('click', function () { exportDeseos(true); });
    document.getElementById('export-todos').addEventListener('click', function () { exportDeseos(false); });
    UI.initNav('admin');
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

    document.querySelectorAll('[data-moderate]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        UI.submit(event, 'moderate', { id: button.dataset.id, decision: button.dataset.moderate }, true,
          function () { UI.toast('Decisión guardada.'); });
      });
    });

    document.getElementById('gold-links').innerHTML = (state.goldLinks || []).map(function (gold) {
      const url = new URL('qr.html#dorado=' + gold.secret, location.href).href;
      return '<p>QR Dorado ' + gold.slot + ' · <span class="break-url">' + esc(url) +
        '</span> <button class="btn small" data-copy-gold="' + esc(url) + '">Copiar URL</button></p>';
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
        return [esc(group ? group.nombre : 'Grupo'), Number(s.criterios?.creatividad || 0), Number(s.criterios?.musical || 0), Number(s.criterios?.escena || 0), Number(s.aplauso || 0), Number(s.total) + '/100'];
      })
    );
  }

  async function init() {
    const ok = await UI.requireAccount('admin', 'Panel administrativo');
    if (!ok) {
      document.getElementById('locked').hidden = false;
      return;
    }
    document.getElementById('panel').hidden = false;
    document.getElementById('logout').addEventListener('click', function () { UI.logout('admin'); });
    await Store.init('admin');
    setup();
  }

  init();
})();
