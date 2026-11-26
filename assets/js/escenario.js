(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const Sound = window.CIYA_SOUND;
  const CFG = window.CIYA_CONFIG;
  const esc = UI.escapeHtml;

  let activeTab = 'villancicos';
  const cron = { remaining: 180, running: false, timer: null };
  const aplauso = { value: 0, stream: null, context: null, analyser: null, frame: null, data: null };
  const rotacion = { timer: null, index: 0 };
  const ignicion = { count: 10, running: false, timer: null, step: -1, sequenceTimer: null };
  const serial = { port: null, reader: null, writer: null };
  const ruleta = { spinning: false, current: null, timer: null, remaining: 45, excluded: [], rotation: 0, wheelTimer: null };

  function activeGroup() {
    const select = document.getElementById('vil-grupo-activo');
    const state = Store.get();
    if (!select || !select.value) return state.groups[0] || null;
    return state.groups.find(function (g) { return g.id === select.value; }) || null;
  }

  function formatTime(seconds) {
    const min = Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, '0');
    const sec = Math.max(0, seconds) % 60;
    return min + ':' + String(sec).padStart(2, '0');
  }

  function renderStage() {
    const screen = document.getElementById('stage-screen');
    if (!screen) return;
    if (activeTab === 'villancicos') {
      const group = activeGroup();
      screen.innerHTML =
        '<span class="kicker">CIYA tiene Talento</span>' +
        '<h2>' + esc(group ? group.nombre : 'Concurso de Villancicos') + '</h2>' +
        '<p class="muted">' + esc(group ? group.categoria + ' · ' + group.integrantes.length + ' integrantes' : 'Esperando grupos inscritos') + '</p>' +
        '<div class="big-number">' + formatTime(cron.remaining) + '</div>' +
        '<div style="width:min(520px,90%);margin-top:1rem"><div class="bar"><span style="width:' + aplauso.value + '%;--bar-color:var(--green)"></span></div>' +
        '<small>Aplausómetro: ' + Math.round(aplauso.value) + ' / 100</small></div>';
    } else if (activeTab === 'ranking') {
      const rows = Store.ranking();
      const max = Math.max(1, rows.reduce(function (sum, r) { return sum + r.puntos; }, 0));
      screen.innerHTML = '<span class="kicker">Copa Solidaria Inter-Carreras</span><h2>Ranking en vivo</h2><div style="width:min(700px,100%)">' +
        rows.map(function (r) {
          return '<div class="ranking-row"><div class="ranking-head"><span>' + esc(r.nombre) + '</span><strong>' + r.puntos + ' pts</strong></div>' +
            '<div class="bar"><span style="width:' + Math.round((r.puntos / max) * 100) + '%;--bar-color:' + r.color + '"></span></div></div>';
        }).join('') + '</div>';
    } else if (activeTab === 'deseos') {
      const aprobados = Store.get().deseos.filter(function (d) { return d.aprobado; });
      const frase = aprobados[rotacion.index % Math.max(1, aprobados.length)];
      screen.innerHTML = '<span class="kicker">Compilando Deseos 2027</span>' +
        '<h2 style="font-size:clamp(1.6rem,4.5vw,3rem);text-wrap:balance">' + (frase ? '“' + esc(frase.frase) + '”' : 'Esperando frases aprobadas') + '</h2>' +
        '<p class="muted">' + (frase ? esc(frase.nombre) + ' · ' + esc(frase.rol) + ' · ' + esc(frase.carrera) : 'La curaduría aprobará las frases enviadas') + '</p>';
    } else if (activeTab === 'encendido') {
      screen.innerHTML = '<span class="kicker">5 carreras, 1 energía</span>' +
        '<h2>Encendido del Árbol CIYA 2026</h2>' +
        '<div class="big-number">' + (ignicion.running ? ignicion.count : 'LISTO') + '</div>' +
        '<div class="row" style="justify-content:center;margin-top:1rem">' + Data.secuenciaEncendido.map(function (id, index) {
          const c = Store.carrera(id);
          const cls = index === ignicion.step ? 'active' : index < ignicion.step ? 'done' : '';
          return '<span class="badge ' + cls + '" style="border-color:' + c.color + ';color:' + c.color + '">' + c.sigla + '</span>';
        }).join('') + '</div>';
    } else if (activeTab === 'ruleta') {
      const winner = ruleta.current;
      screen.innerHTML = '<span class="kicker">Gran Sorteo Digital</span><h2>' + (winner ? 'Ganador: ' + esc(winner.nombre) : 'Gran Ruleta Digital') + '</h2>' +
        '<div class="wheel-wrap"><div class="wheel-pointer"></div><div class="wheel" id="ruleta-wheel"></div></div>' +
        '<p class="muted">' + (winner ? 'Presenta tu identificación ante la Comisión. Tiempo: ' + ruleta.remaining + ' s' : 'Gira la ruleta para comenzar') + '</p>';
      const wheel = document.getElementById('ruleta-wheel');
      if (wheel && !ruleta.spinning && ruleta.rotation) wheel.style.transform = 'rotate(' + (ruleta.rotation % 360) + 'deg)';
    } else {
      screen.innerHTML = '<span class="kicker">Respaldo local</span><h2>Modo contingencia</h2><p class="muted">Descarga el JSON desde el panel lateral antes de las 17:45.</p>';
    }
  }

  function renderSequence() {
    const container = document.getElementById('secuencia-encendido');
    if (!container) return;
    container.innerHTML = Data.secuenciaEncendido.map(function (id, index) {
      const c = Store.carrera(id);
      const cls = index === ignicion.step ? 'active' : index < ignicion.step ? 'done' : '';
      return '<div class="timeline-step ' + cls + '" style="--step-color:' + c.color + '"><span class="step-index">' + (index + 1) + '</span>' +
        '<span>' + esc(c.nombre) + (index === 4 ? ' · pulso al relé' : '') + '</span></div>';
    }).join('');
  }

  function renderScoreFields() {
    const container = document.getElementById('score-fields');
    container.innerHTML = Data.cristalVillancicos.map(function (c) {
      return '<div class="field"><label for="score-' + c.id + '">' + esc(c.nombre) + ' (0–' + c.peso + ')</label>' +
        '<input id="score-' + c.id + '" type="number" min="0" max="' + c.peso + '" value="0" data-peso="' + c.peso + '" required></div>';
    }).join('') + '<p><strong>Total: <span id="score-total">0</span> / 100</strong></p>';
    container.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', updateScoreTotal);
    });
  }

  function updateScoreTotal() {
    const total = Data.cristalVillancicos.reduce(function (sum, c) {
      return sum + Number(document.getElementById('score-' + c.id).value || 0);
    }, 0);
    document.getElementById('score-total').textContent = total;
  }

  function startCronometro() {
    if (cron.running) return;
    cron.running = true;
    Sound.enable();
    cron.timer = setInterval(function () {
      cron.remaining -= 1;
      if (cron.remaining <= 0) {
        cron.remaining = 0;
        stopCronometro();
        Sound.go();
        UI.toast('Tiempo de presentación agotado');
      }
      renderStage();
    }, 1000);
    renderStage();
  }

  function stopCronometro() {
    cron.running = false;
    clearInterval(cron.timer);
    cron.timer = null;
    renderStage();
  }

  function resetCronometro() {
    stopCronometro();
    cron.remaining = 180;
    renderStage();
  }

  function stopMic() {
    if (aplauso.frame) cancelAnimationFrame(aplauso.frame);
    if (aplauso.stream) aplauso.stream.getTracks().forEach(function (track) { track.stop(); });
    if (aplauso.context) aplauso.context.close();
    aplauso.frame = null;
    aplauso.stream = null;
    aplauso.context = null;
    aplauso.analyser = null;
    aplauso.value = 0;
    document.getElementById('mic-estado').textContent = 'Micrófono detenido. Usa el control manual.';
    renderStage();
  }

  async function startMic() {
    if (aplauso.stream) stopMic();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      UI.toast('Este navegador no expone micrófono; usa el control manual', 'bad');
      return;
    }
    try {
      aplauso.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      aplauso.context = new AudioContextClass();
      const source = aplauso.context.createMediaStreamSource(aplauso.stream);
      aplauso.analyser = aplauso.context.createAnalyser();
      aplauso.analyser.fftSize = 256;
      aplauso.data = new Uint8Array(aplauso.analyser.fftSize);
      source.connect(aplauso.analyser);
      document.getElementById('mic-estado').textContent = 'Micrófono activo: midiendo aplausos en vivo.';
      const loop = function () {
        aplauso.analyser.getByteTimeDomainData(aplauso.data);
        let sum = 0;
        for (let i = 0; i < aplauso.data.length; i++) {
          const value = (aplauso.data[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / aplauso.data.length);
        aplauso.value = Math.min(100, Math.round(rms * 420));
        document.getElementById('aplauso-manual').value = aplauso.value;
        document.getElementById('aplauso-bar').style.width = aplauso.value + '%';
        renderStage();
        aplauso.frame = requestAnimationFrame(loop);
      };
      loop();
    } catch (error) {
      UI.toast('No se pudo activar el micrófono: ' + error.message, 'bad');
    }
  }

  function startRotation() {
    const aprobados = Store.get().deseos.filter(function (d) { return d.aprobado; });
    if (!aprobados.length) return UI.toast('No hay frases aprobadas todavía', 'bad');
    if (rotacion.timer) clearInterval(rotacion.timer);
    rotacion.index = 0;
    renderStage();
    rotacion.timer = setInterval(function () {
      rotacion.index += 1;
      renderStage();
    }, 8000);
  }

  function stopRotation() {
    clearInterval(rotacion.timer);
    rotacion.timer = null;
  }

  function writeRelay() {
    if (serial.writer) {
      serial.writer.write(new TextEncoder().encode(CFG.relayCommand)).catch(function (error) {
        UI.toast('No se pudo enviar pulso al relé: ' + error.message, 'bad');
      });
      UI.toast('Pulso enviado al relé de Electricidad');
    } else {
      UI.toast('Pulso de relé simulado (sin placa conectada)', 'warn');
    }
  }

  function runSequence() {
    clearInterval(ignicion.sequenceTimer);
    let index = 0;
    ignicion.step = 0;
    renderSequence();
    renderStage();
    ignicion.sequenceTimer = setInterval(function () {
      index += 1;
      if (index >= Data.secuenciaEncendido.length) {
        clearInterval(ignicion.sequenceTimer);
        ignicion.step = Data.secuenciaEncendido.length;
        Sound.ignite();
        renderSequence();
        renderStage();
        Store.update(function (draft) {
          draft.ignition.lastRun = Date.now();
          draft.ignition.relay = true;
        });
        return;
      }
      ignicion.step = index;
      Sound.beep();
      renderSequence();
      renderStage();
    }, 900);
  }

  function startIgnicion() {
    if (ignicion.running) return;
    Sound.enable();
    ignicion.running = true;
    ignicion.count = 10;
    ignicion.step = -1;
    clearInterval(ignicion.sequenceTimer);
    renderSequence();
    renderStage();
    ignicion.timer = setInterval(function () {
      ignicion.count -= 1;
      if (ignicion.count > 0) Sound.countdown();
      if (ignicion.count <= 0) {
        clearInterval(ignicion.timer);
        ignicion.running = false;
        ignicion.count = 0;
        Sound.go();
        writeRelay();
        runSequence();
      }
      renderStage();
    }, 1000);
  }

  async function connectSerial() {
    if (!navigator.serial) {
      UI.toast('Web Serial no disponible en este navegador; usa la tecla de emergencia', 'bad');
      return;
    }
    try {
      serial.port = await navigator.serial.requestPort();
      await serial.port.open({ baudRate: CFG.serialBaudRate });
      serial.writer = serial.port.writable.getWriter();
      document.getElementById('serial-status').textContent = 'Sensor conectado';
      document.getElementById('serial-status').className = 'badge ok';
      const decoder = new TextDecoder();
      serial.reader = serial.port.readable.getReader();
      while (true) {
        const result = await serial.reader.read();
        if (result.done) break;
        const text = decoder.decode(result.value, { stream: true });
        if (/SENSOR|TRIGGER|DISPARO|IGNITE|\b1\b/i.test(text)) startIgnicion();
      }
    } catch (error) {
      document.getElementById('serial-status').textContent = 'Sin conectar';
      UI.toast('No se pudo conectar el sensor: ' + error.message, 'bad');
    }
  }

  function candidates() {
    const state = Store.get();
    return state.attendees.filter(function (a) {
      const tickets = Store.ticketBreakdown(a.cedula);
      return tickets.total > 0 && !tickets.ganado && ruleta.excluded.indexOf(a.cedula) === -1;
    });
  }

  function pickWinner() {
    const pool = [];
    candidates().forEach(function (a) {
      const total = Store.ticketBreakdown(a.cedula).total;
      for (let i = 0; i < total; i++) pool.push(a);
    });
    if (!pool.length) return null;
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    return pool[random[0] % pool.length];
  }

  function clearClaimTimer() {
    clearInterval(ruleta.timer);
    ruleta.timer = null;
  }

  function spin() {
    if (ruleta.spinning) return;
    const winner = pickWinner();
    if (!winner) return UI.toast('No quedan participantes con boletos disponibles', 'bad');
    Sound.enable();
    ruleta.spinning = true;
    ruleta.current = winner;
    ruleta.remaining = 45;
    ruleta.rotation += 1440 + Math.floor(Math.random() * 720);
    clearClaimTimer();
    renderRuleta();
    renderStage();
    requestAnimationFrame(function () {
      const wheel = document.getElementById('ruleta-wheel');
      if (wheel) wheel.style.transform = 'rotate(' + ruleta.rotation + 'deg)';
    });
    ruleta.wheelTimer = setInterval(function () { Sound.tick(); }, 140);
    setTimeout(function () {
      clearInterval(ruleta.wheelTimer);
      ruleta.spinning = false;
      ruleta.rotation = ruleta.rotation % 360;
      Sound.success();
      ruleta.timer = setInterval(function () {
        ruleta.remaining -= 1;
        if (ruleta.remaining <= 0) {
          markAbsent(true);
          return;
        }
        renderRuleta();
        renderStage();
      }, 1000);
      renderRuleta();
      renderStage();
    }, 4100);
  }

  function markDelivered() {
    if (!ruleta.current) return;
    const winner = ruleta.current;
    Store.update(function (draft) {
      draft.winners.push({ cedula: winner.cedula, nombre: winner.nombre, premio: ruleta.current.premio || 'Premio Sorpresa CIYA 2026', creado: Date.now() });
      draft.roulette.history.push({ cedula: winner.cedula, nombre: winner.nombre, estado: 'entregado', creado: Date.now() });
    });
    clearClaimTimer();
    ruleta.current = null;
    ruleta.excluded = [];
    renderRuleta();
    renderStage();
    UI.toast('Premio marcado como entregado a ' + winner.nombre);
  }

  function markAbsent(expired) {
    if (!ruleta.current) return;
    const winner = ruleta.current;
    Store.update(function (draft) {
      draft.roulette.history.push({ cedula: winner.cedula, nombre: winner.nombre, estado: expired ? 'sin comparecencia' : 'ausente', creado: Date.now() });
    });
    ruleta.excluded.push(winner.cedula);
    ruleta.current = null;
    clearClaimTimer();
    renderRuleta();
    renderStage();
    UI.toast(expired ? 'Sin comparecencia en 45 s: se gira nuevamente' : 'Ganador ausente: se gira nuevamente', 'warn');
    setTimeout(spin, 700);
  }

  function renderRuleta() {
    const totalBoletos = candidates().reduce(function (sum, a) { return sum + Store.ticketBreakdown(a.cedula).total; }, 0);
    const state = Store.get();
    document.getElementById('ruleta-boletos').textContent = totalBoletos;
    document.getElementById('ruleta-personas').textContent = candidates().length;
    document.getElementById('ruleta-entregados').textContent = state.winners.length;
    const result = document.getElementById('ruleta-resultado');
    if (ruleta.current) {
      const t = Store.ticketBreakdown(ruleta.current.cedula);
      result.innerHTML = '<div class="card" style="background:rgba(255,209,102,0.12)"><h3>' + esc(ruleta.current.nombre) + '</h3>' +
        '<p>' + esc(Store.carrera(ruleta.current.carrera).nombre) + ' · ' + t.total + ' boletos</p>' +
        '<p><strong>' + (ruleta.spinning ? 'Girando…' : ruleta.remaining + ' segundos para presentarse') + '</strong></p>' +
        '<div class="row"><button class="btn primary small" id="premio-entregado">Marcar premio entregado</button>' +
        '<button class="btn danger small" id="premio-ausente">Ausente / girar de nuevo</button></div></div>';
      const entregado = document.getElementById('premio-entregado');
      const ausente = document.getElementById('premio-ausente');
      if (entregado) entregado.addEventListener('click', markDelivered);
      if (ausente) ausente.addEventListener('click', function () { markAbsent(false); });
    } else {
      result.innerHTML = '<p class="empty">' + (ruleta.spinning ? 'La ruleta está girando…' : 'Lista para girar.') + '</p>';
    }
    document.getElementById('ruleta-historial').innerHTML = UI.table(['Premiado', 'Estado', 'Fecha'], state.roulette.history.map(function (h) {
      return [esc(h.nombre), esc(h.estado), esc(UI.dateTime(h.creado))];
    }));
  }

  function render(state) {
    const select = document.getElementById('vil-grupo-activo');
    const previous = select.value;
    select.innerHTML = state.groups.length ? state.groups.slice().sort(function (a, b) { return a.orden - b.orden; }).map(function (g) {
      return '<option value="' + g.id + '">' + g.orden + '. ' + esc(g.nombre) + '</option>';
    }).join('') : '<option value="">Sin grupos inscritos</option>';
    if (previous && state.groups.some(function (g) { return g.id === previous; })) select.value = previous;

    document.getElementById('scores-list').innerHTML = UI.table(['Grupo', 'Total', 'Aplauso'], state.scores.map(function (s) {
      const group = state.groups.find(function (g) { return g.id === s.grupoId; });
      return [esc(group ? group.nombre : 'Grupo'), s.total + '/100', s.aplauso];
    }));

    document.getElementById('ranking-detalle').innerHTML = Store.ranking().map(function (r, index) {
      return '<p><strong>' + (index + 1) + '. ' + esc(r.nombre) + '</strong> — ' + r.puntos + ' pts<br><small>' +
        r.juguetes + ' juguetes · ' + r.caramelos + ' fundas · ' + r.donantes + ' donantes únicos</small></p>';
    }).join('');

    document.getElementById('deseos-lista').innerHTML = state.deseos.filter(function (d) { return d.aprobado; }).map(function (d) {
      return '<blockquote>“' + esc(d.frase) + '” — ' + esc(d.nombre) + '</blockquote>';
    }).join('') || '<p class="empty">Sin frases aprobadas.</p>';

    document.getElementById('estado-relay').innerHTML = state.ignition.lastRun
      ? '<span class="badge ok">Último disparo: ' + esc(UI.dateTime(state.ignition.lastRun)) + '</span>'
      : '<span class="badge">Sin disparos registrados</span>';

    renderRuleta();
    renderSequence();
    renderStage();
  }

  function setup() {
    renderScoreFields();
    renderSequence();
    UI.initNav('escenario');

    document.querySelectorAll('.stage-tabs .btn').forEach(function (button) {
      button.addEventListener('click', function () {
        activeTab = button.dataset.tab;
        document.querySelectorAll('.stage-tabs .btn').forEach(function (b) { b.classList.toggle('active', b === button); });
        document.querySelectorAll('.tab-panel').forEach(function (panel) { panel.hidden = panel.dataset.panel !== activeTab; });
        renderStage();
      });
    });

    document.getElementById('audio-toggle').addEventListener('click', function () {
      Sound.enable();
      UI.toast('Audio del navegador habilitado');
    });
    document.getElementById('cronometro-start').addEventListener('click', startCronometro);
    document.getElementById('cronometro-pause').addEventListener('click', stopCronometro);
    document.getElementById('cronometro-reset').addEventListener('click', resetCronometro);
    document.getElementById('mic-start').addEventListener('click', startMic);
    document.getElementById('mic-stop').addEventListener('click', stopMic);
    document.getElementById('aplauso-manual').addEventListener('input', function (event) {
      aplauso.value = Number(event.target.value);
      document.getElementById('aplauso-bar').style.width = aplauso.value + '%';
      renderStage();
    });
    document.getElementById('vil-grupo-activo').addEventListener('change', renderStage);

    document.getElementById('form-score').addEventListener('submit', function (event) {
      event.preventDefault();
      const group = activeGroup();
      if (!group) return UI.toast('No hay grupo seleccionado', 'bad');
      const total = Data.cristalVillancicos.reduce(function (sum, c) {
        return sum + Number(document.getElementById('score-' + c.id).value || 0);
      }, 0);
      const detalle = {};
      Data.cristalVillancicos.forEach(function (c) {
        detalle[c.id] = Number(document.getElementById('score-' + c.id).value || 0);
      });
      Store.update(function (draft) {
        draft.scores.push({
          id: UI.uid('sc'),
          grupoId: group.id,
          total: total,
          aplauso: Math.round(aplauso.value),
          detalle: detalle,
          creado: Date.now()
        });
      });
      UI.toast('Calificación guardada: ' + total + ' / 100');
    });

    document.getElementById('deseos-play').addEventListener('click', startRotation);
    document.getElementById('deseos-stop').addEventListener('click', stopRotation);
    document.getElementById('serial-connect').addEventListener('click', connectSerial);
    document.getElementById('ignicion-manual').addEventListener('click', startIgnicion);
    document.getElementById('ruleta-girar').addEventListener('click', spin);
    document.addEventListener('keydown', function (event) {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (event.code === 'Space' && activeTab === 'encendido' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        event.preventDefault();
        startIgnicion();
      }
    });

    document.getElementById('backup-download').addEventListener('click', function () {
      UI.download('ciya2026-respaldo-' + new Date().toISOString().slice(0, 10) + '.json', Store.exportJson());
      UI.toast('Respaldo local descargado');
    });
    document.getElementById('backup-load').addEventListener('click', function () {
      const file = document.getElementById('backup-file').files[0];
      if (!file) return UI.toast('Selecciona un archivo JSON', 'bad');
      const reader = new FileReader();
      reader.onload = function () {
        try {
          Store.importJson(reader.result);
          UI.toast('Respaldo restaurado');
        } catch (error) {
          UI.toast('Archivo no válido: ' + error.message, 'bad');
        }
      };
      reader.readAsText(file);
    });
  }

  async function init() {
    const ok = await UI.pinGate('escenario', 'Consola de escenario');
    if (!ok) {
      document.getElementById('locked').hidden = false;
      return;
    }
    document.getElementById('panel').hidden = false;
    document.getElementById('logout').addEventListener('click', function () { UI.logout('escenario'); });
    await Store.init();
    setup();
    Store.subscribe(render);
  }

  init();
})();
