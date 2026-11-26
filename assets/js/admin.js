(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const esc = UI.escapeHtml;

  function csv(rows) {
    return '\ufeff' + rows.map(function (row) {
      return row.map(function (value) { return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
  }

  function exportDeseos(OnlyApproved) {
    const rows = [['Nombre', 'Rol', 'Carrera/Área', 'Frase', 'Estado', 'Fecha']];
    Store.get().deseos.filter(function (d) { return !OnlyApproved || d.aprobado; }).forEach(function (d) {
      rows.push([d.nombre, d.rol, d.carrera, d.frase, d.aprobado ? 'Aprobado' : 'Pendiente', UI.dateTime(d.creado)]);
    });
    UI.download(OnlyApproved ? 'ciya2026-deseos-aprobados.csv' : 'ciya2026-deseos-todos.csv', csv(rows), 'text/csv;charset=utf-8');
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

    document.getElementById('guardar-puerta').addEventListener('click', function () {
      const carrera = document.getElementById('puerta-carrera').value;
      const detalle = {};
      const total = Data.criteriosPuertas.reduce(function (sum, c) {
        const value = Number(document.getElementById('puerta-' + c.id).value || 0);
        detalle[c.id] = value;
        return sum + value;
      }, 0);
      Store.update(function (draft) {
        const existing = draft.puertas.find(function (p) { return p.carrera === carrera; });
        const registro = {
          carrera: carrera,
          detalle: detalle,
          total: total,
          notas: document.getElementById('puerta-notas').value.trim(),
          evaluado: Date.now()
        };
        if (existing) Object.assign(existing, registro);
        else draft.puertas.push(registro);
      });
      UI.toast('Evaluación guardada: ' + total + ' / 100');
    });

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
        '<div class="row"><button class="btn small" data-aprobar="' + d.id + '">Aprobar</button>' +
        '<button class="btn small danger" data-descartar="' + d.id + '">Descartar</button></div></div>';
    }).join('') : '<p class="empty">Aún no hay frases enviadas.</p>';

    document.querySelectorAll('[data-aprobar]').forEach(function (button) {
      button.addEventListener('click', function () {
        Store.update(function (draft) {
          const item = draft.deseos.find(function (d) { return d.id === button.dataset.aprobar; });
          if (item) item.aprobado = true;
        });
        UI.toast('Frase aprobada');
      });
    });
    document.querySelectorAll('[data-descartar]').forEach(function (button) {
      button.addEventListener('click', function () {
        Store.update(function (draft) {
          draft.deseos = draft.deseos.filter(function (d) { return d.id !== button.dataset.descartar; });
        });
        UI.toast('Frase descartada');
      });
    });

    const puestos = state.puertas.slice().sort(function (a, b) { return b.total - a.total; });
    document.getElementById('ranking-puertas').innerHTML = puestos.length ? puestos.map(function (p, index) {
      const carrera = Store.carrera(p.carrera);
      return '<div class="ranking-row"><div class="ranking-head"><span>' + (index + 1) + '. ' + esc(carrera.nombre) + '</span><strong>' + p.total + '/100</strong></div>' +
        '<div class="bar"><span style="width:' + p.total + '%;--bar-color:' + carrera.color + '"></span></div>' +
        (p.notas ? '<small>' + esc(p.notas) + '</small>' : '') + '</div>';
    }).join('') : '<p class="empty">Sin evaluaciones registradas.</p>';

    document.getElementById('lista-scores').innerHTML = UI.table(['Grupo', 'Creatividad', 'Musical', 'Escena', 'Aplauso', 'Total'],
      state.scores.map(function (s) {
        const group = state.groups.find(function (g) { return g.id === s.grupoId; });
        return [esc(group ? group.nombre : 'Grupo'), s.detalle.creatividad || 0, s.detalle.musical || 0, s.detalle.escena || 0, s.aplauso, s.total + '/100'];
      })
    );
  }

  async function init() {
    const ok = await UI.pinGate('admin', 'Panel administrativo');
    if (!ok) {
      document.getElementById('locked').hidden = false;
      return;
    }
    document.getElementById('panel').hidden = false;
    document.getElementById('logout').addEventListener('click', function () { UI.logout('admin'); });
    await Store.init();
    setup();
  }

  init();
})();
