(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const Sound = window.CIYA_SOUND;
  const esc = UI.escapeHtml;
  const Draw = window.CIYA_DRAW;
  const Ignite = window.CIYA_IGNITE;
  const localMode = location.origin === 'http://127.0.0.1:8080' &&
    new URLSearchParams(location.search).get('modo') === 'local';

  let activeTab = 'villancicos';
  const cron = { remaining: 180, running: false, timer: null };
  const aplauso = { value: 0, db: null, stream: null, context: null, analyser: null, frame: null, data: null };
  const rotacion = { timer: null, index: 0 };
  let draw = null;
  let lastDrawFrame = '';
  let lastTick = 0;

  function template() {
    return `
      <div class="section-head">
        <div><span class="kicker">Laptop + proyector · 16:9</span><h1>Consola de Pantalla Gigante</h1></div>
        <div class="row"><button class="btn small ghost" id="audio-toggle">Activar audio</button><button class="btn small" id="project-fullscreen">Proyección a pantalla completa</button></div>
      </div>
      <div id="locked" hidden><p class="empty">Esta consola requiere una cuenta de escenario.</p></div>

      <div id="panel" hidden>
        <div class="stage-tabs" role="tablist">
          <button class="btn small active" data-tab="villancicos">Villancicos</button>
          <button class="btn small" data-tab="ranking">Ranking</button>
          <button class="btn small" data-tab="deseos">Deseos 2027</button>
          <button class="btn small" data-tab="encendido">Encendido 5 en 1</button>
          <button class="btn small" data-tab="ruleta">Gran Ruleta</button>
          <button class="btn small" data-tab="respaldo">Respaldo local</button>
        </div>

        <div class="stage-grid">
          <div>
            <div class="stage-screen" id="stage-screen" tabindex="0"></div>
            <p class="hint" style="margin-top:0.6rem">Vista optimizada para proyector HD/Full HD. Mantén esta pestaña visible; el contenido se actualiza en tiempo real.</p>
          </div>
          <div>
            <section class="card tab-panel" data-panel="villancicos">
              <h2>Gestor de Villancicos</h2>
              <div class="field"><label for="vil-grupo-activo">Grupo en escenario</label><select id="vil-grupo-activo"></select></div>
              <div class="row"><button class="btn primary" id="cronometro-start">Iniciar 3:00</button><button class="btn" id="cronometro-pause">Pausar</button><button class="btn ghost" id="cronometro-reset">Reiniciar</button></div>
              <h3 style="margin-top:1.2rem">Aplausómetro</h3>
              <p class="muted" id="mic-estado">Activa el micrófono para medir el aplauso o usa el control manual.</p>
              <div class="row"><button class="btn small" id="mic-start">Activar micrófono</button><button class="btn small ghost" id="mic-stop">Detener</button></div>
              <div class="field" style="margin-top:0.8rem"><label for="aplauso-manual">Nivel manual</label><input id="aplauso-manual" type="range" min="0" max="100" value="0"></div>
              <div class="bar"><span id="aplauso-bar" style="width:0%;--bar-color:var(--green)"></span></div>
              <h3 style="margin-top:1.2rem">Calificación del jurado</h3>
              <form id="form-score">
                <div id="score-fields"></div>
                <button class="btn primary wide" type="submit">Guardar calificación</button>
              </form>
              <div id="scores-list" style="margin-top:1rem"></div>
            </section>

            <section class="card tab-panel" data-panel="ranking" hidden>
              <h2>Ranking en vivo</h2>
              <div id="ranking-detalle"></div>
              <p class="hint">Puntuación: juguete 5 pts, funda de caramelos 2 pts. Desempate: juguetes operativos y donantes únicos.</p>
            </section>

            <section class="card tab-panel" data-panel="deseos" hidden>
              <h2>Frases aprobadas</h2>
              <p class="muted">Al iniciar la rotación, se muestra una frase nueva cada 8 segundos.</p>
              <div class="row"><button class="btn small" id="deseos-play">Iniciar rotación</button><button class="btn small ghost" id="deseos-stop">Detener</button></div>
              <div id="deseos-lista" style="margin-top:1rem"></div>
            </section>

            <section class="card tab-panel" data-panel="encendido" hidden>
              <div id="encendido-root"></div>
            </section>

            <section class="card tab-panel" data-panel="ruleta" hidden>
              <h2>Gran Ruleta Digital</h2>
              <p class="muted">Los boletos elegibles del respaldo sellado participan. Un estudiante solo puede ganar un premio.</p>
              <div class="row between"><span>Boletos válidos</span><strong id="ruleta-boletos">0</strong></div>
              <div class="row between"><span>Participantes</span><strong id="ruleta-personas">0</strong></div>
              <div class="row between"><span>Premios entregados</span><strong id="ruleta-entregados">0</strong></div>
              <div class="field"><label for="ruleta-premio">Premio en juego</label><input id="ruleta-premio" maxlength="120" placeholder="Premio Sorpresa CIYA 2026"></div>
              <button class="btn primary wide" id="ruleta-girar" style="margin-top:0.9rem">Girar ruleta</button>
              <div id="ruleta-resultado" style="margin-top:1rem"></div>
              <div id="ruleta-historial" style="margin-top:1rem"></div>
            </section>

            <section class="card tab-panel" data-panel="respaldo" hidden>
              <h2>Respaldo local</h2>
              <p class="muted">Cuando Recepción selle los datos, descarga el JSON con los boletos y el marcador final de donaciones. La ruleta, el ranking y el encendido siguen funcionando sin internet.</p>
              <button class="btn primary wide" id="backup-download" disabled>Descargar Respaldo Local (JSON)</button>
              <div class="field" style="margin-top:1rem"><label for="backup-file">Restaurar desde archivo</label><input id="backup-file" type="file" accept="application/json,.json"></div>
              <button class="btn wide" id="backup-load">Cargar respaldo</button>
              <p class="hint" style="margin-top:1rem">Importa el respaldo en la consola local. Usa una sola pestaña para operar el sorteo.</p>
            </section>
          </div>
        </div>
      </div>`;
  }

  function mount() {
    document.getElementById('escenario-root').innerHTML = template();
    Ignite.mount();
  }

  function wishes() {
    return draw ? (draw.snapshot.wishes || []) : Store.get().deseos.filter(function (wish) { return wish.aprobado; });
  }

  function ranking() {
    return draw ? draw.snapshot.ranking : Store.ranking();
  }

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
      const integrantes = group?.integrantes?.length || 0;
      const level = aplauso.db === null ? 'nivel manual ' + Math.round(aplauso.value) + ' / 100' : aplauso.db + ' dBFS';
      screen.innerHTML = `
        <div class="stage-villancicos">
          <div class="stage-performer">
            <span class="kicker">CIYA tiene Talento${group ? ' · Turno ' + esc(group.orden) : ''}</span>
            <h2>${esc(group ? group.nombre : 'Concurso de Villancicos')}</h2>
            ${group ? UI.villancicoDetails(group) : '<p class="muted">Esperando grupos inscritos</p>'}
            ${group ? `<p class="stage-song">${group.cancion ? 'Obra musical: <strong>' + esc(group.cancion) + '</strong> · ' : ''}
              ${integrantes} ${integrantes === 1 ? 'integrante' : 'integrantes'}</p>` : ''}
          </div>
          <div class="stage-performance">
            <div class="big-number" role="timer" aria-label="Tiempo restante">${formatTime(cron.remaining)}</div>
            <div class="bar"><span style="width:${aplauso.value}%;--bar-color:var(--green)"></span></div>
            <small>Aplausómetro: ${level}</small>
          </div>
        </div>`;
    } else if (activeTab === 'ranking') {
      const rows = ranking();
      const max = Math.max(1, ...rows.map(function (row) { return row.puntos; }));
      screen.innerHTML = '<span class="kicker">Copa Solidaria Inter-Carreras</span><h2>Ranking en vivo</h2><div style="width:min(700px,100%)">' +
        rows.map(function (r) {
          return '<div class="ranking-row"><div class="ranking-head"><span>' + esc(r.nombre) + '</span><strong>' + r.puntos + ' pts</strong></div>' +
            '<div class="bar"><span style="width:' + Math.round((r.puntos / max) * 100) + '%;--bar-color:' + Store.carrera(r.id).color + '"></span></div><small>' + r.juguetes + ' juguetes · ' + r.caramelos + ' fundas · ' + r.total + ' artículos</small></div>';
        }).join('') + '</div>';
    } else if (activeTab === 'deseos') {
      const aprobados = wishes();
      const frase = aprobados[rotacion.index % Math.max(1, aprobados.length)];
      screen.innerHTML = '<span class="kicker">Compilando Deseos 2027</span>' +
        '<h2 class="stage-quote">' + (frase ? '“' + esc(frase.frase) + '”' : 'Esperando frases aprobadas') + '</h2>' +
        '<p class="muted">' + (frase ? esc(frase.nombre) + ' · ' + esc(frase.rol) + ' · ' + esc(frase.carrera) : 'La curaduría aprobará las frases enviadas') + '</p>';
    } else if (activeTab === 'encendido') {
      const estado = Ignite.status();
      screen.innerHTML = '<span class="kicker">5 carreras, 1 energía</span>' +
        '<h2>Encendido del Árbol CIYA 2026</h2>' +
        '<div class="big-number">' + (estado.running ? estado.count : estado.step >= 0 ? '0' : 'LISTO') + '</div>' +
        '<div class="row" style="justify-content:center;margin-top:1rem">' + Data.secuenciaEncendido.map(function (id, index) {
          const c = Store.carrera(id);
          const cls = index === estado.step ? 'active' : index < estado.step ? 'done' : '';
          return '<span class="badge ' + cls + '" style="border-color:' + c.color + ';color:' + c.color + '">' + c.sigla + '</span>';
        }).join('') + '</div>';
    } else if (activeTab === 'ruleta') {
      const pending = draw && draw.current;
      const spinning = pending && pending.expiresAt === null;
      const winner = !spinning && draw && (pending || draw.lastWinner);
      screen.innerHTML = '<span class="kicker">Gran Sorteo Digital</span><h2>' +
        (winner ? esc(winner.nombre) : 'Gran Ruleta Digital') + '</h2>' +
        '<div class="wheel-wrap"><div class="wheel-pointer"></div><div class="wheel' + (spinning ? ' spinning' : '') + '"></div></div>' +
        '<p class="muted">' + (winner ? esc(winner.number) + (pending ? ' · Preséntate: ' +
          Math.max(0, Math.ceil((pending.expiresAt - Date.now()) / 1000)) + ' s' : '') :
          spinning ? 'Girando…' : 'Listo para el siguiente giro') + '</p>';
    } else {
      screen.innerHTML = '<span class="kicker">Respaldo local</span><h2>Modo contingencia</h2><p class="muted">Descarga el JSON cuando Recepción selle los datos.</p>';
    }
  }

  function renderScoreFields() {
    const container = document.getElementById('score-fields');
    container.innerHTML = Data.criteriosVillancicos.map(function (c) {
      return '<div class="field"><label for="score-' + c.id + '">' + esc(c.nombre) + ' (0–' + c.peso + ')</label>' +
        '<input id="score-' + c.id + '" type="number" min="0" max="' + c.peso + '" value="0" data-peso="' + c.peso + '" required></div>';
    }).join('') + '<p><strong>Total: <span id="score-total">0</span> / 100</strong></p>';
    container.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', updateScoreTotal);
    });
  }

  function updateScoreTotal() {
    const total = Data.criteriosVillancicos.reduce(function (sum, c) {
      return sum + Number(document.getElementById('score-' + c.id).value || 0);
    }, 0);
    document.getElementById('score-total').textContent = total;
  }

  function startCronometro() {
    if (cron.running || !cron.remaining) return;
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
    if (aplauso.context) aplauso.context.close().catch(function () {});
    aplauso.frame = null;
    aplauso.stream = null;
    aplauso.context = null;
    aplauso.analyser = null;
    aplauso.value = 0;
    aplauso.db = null;
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
      aplauso.stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: false, noiseSuppression: false, echoCancellation: false } });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      aplauso.context = new AudioContextClass();
      const source = aplauso.context.createMediaStreamSource(aplauso.stream);
      aplauso.analyser = aplauso.context.createAnalyser();
      aplauso.analyser.fftSize = 256;
      aplauso.data = new Uint8Array(aplauso.analyser.fftSize);
      source.connect(aplauso.analyser);
      document.getElementById('mic-estado').textContent = 'Micrófono activo: nivel relativo en dBFS.';
      let lastRender = 0;
      const loop = function (now) {
        aplauso.analyser.getByteTimeDomainData(aplauso.data);
        let sum = 0;
        for (let i = 0; i < aplauso.data.length; i++) {
          const value = (aplauso.data[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / aplauso.data.length);
        aplauso.db = rms > 0 ? Math.max(-60, Math.round(20 * Math.log10(rms))) : -60;
        aplauso.value = (aplauso.db + 60) / 60 * 100;
        document.getElementById('aplauso-manual').value = aplauso.value;
        document.getElementById('aplauso-bar').style.width = aplauso.value + '%';
        if (activeTab === 'villancicos' && now - lastRender > 90) {
          lastRender = now;
          renderStage();
        }
        aplauso.frame = requestAnimationFrame(loop);
      };
      aplauso.frame = requestAnimationFrame(loop);
    } catch (error) {
      stopMic();
      UI.toast('No se pudo activar el micrófono: ' + error.message, 'bad');
    }
  }

  function startRotation() {
    const aprobados = wishes();
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

  function updateDraw() {
    if (!draw) return;
    const now = Date.now();
    if (!document.hidden && activeTab === 'ruleta') draw = Draw.reveal(draw, now);
    if (draw.current && draw.current.expiresAt !== null && now >= draw.current.expiresAt) {
      draw = Draw.finish(draw, 'sin comparecencia', now);
    }
    if (draw.retry) draw = Draw.start(draw, now);
    const pending = draw.current;
    const spinning = pending && pending.expiresAt === null;
    const frame = pending ? pending.number + ':' + (spinning ? 'spin' : Math.ceil((pending.expiresAt - now) / 1000)) :
      'ready:' + draw.history.length;
    if (spinning && now - lastTick > 200) {
      lastTick = now;
      Sound.tick();
    }
    if (lastDrawFrame !== frame) {
      if (pending && !spinning && lastDrawFrame.endsWith(':spin')) Sound.success();
      lastDrawFrame = frame;
      renderRuleta();
      if (activeTab === 'ruleta') renderStage();
    }
  }

  function drawSafely(action) {
    try { action(); }
    catch (error) {
      document.getElementById('ruleta-girar').disabled = true;
      UI.toast('Sorteo detenido: ' + error.message, 'bad');
      return false;
    }
    return true;
  }

  function spin() {
    if (!draw || draw.current) return;
    if (!Draw.eligible(draw).length) return UI.toast('No quedan boletos elegibles.', 'warn');
    Sound.enable();
    drawSafely(function () {
      const prize = document.getElementById('ruleta-premio').value.trim();
      draw = Draw.start(draw, Date.now(), prize);
      updateDraw();
    });
  }

  function renderRuleta() {
    const eligible = Draw.eligible(draw);
    const pending = draw && draw.current;
    const spinning = pending && pending.expiresAt === null;
    const history = draw ? draw.history : [];
    const prize = document.getElementById('ruleta-premio');
    prize.disabled = !draw || Boolean(pending);
    if (pending) prize.value = pending.premio || '';
    document.getElementById('ruleta-girar').disabled = !draw || Boolean(pending) || !eligible.length;
    document.getElementById('ruleta-boletos').textContent = eligible.length;
    document.getElementById('ruleta-personas').textContent = new Set(eligible.map(function (ticket) { return ticket.person; })).size;
    document.getElementById('ruleta-entregados').textContent = history.filter(function (record) { return record.estado === 'entregado'; }).length;
    const result = document.getElementById('ruleta-resultado');
    if (pending && !spinning) {
      result.innerHTML = '<p><strong>' + esc(pending.nombre) + '</strong> · ' + esc(pending.number) + '</p>' +
        '<p>' + Math.max(0, Math.ceil((pending.expiresAt - Date.now()) / 1000)) + ' segundos para presentarse</p>' +
        '<div class="row"><button class="btn primary small" id="premio-entregado">Premio entregado</button>' +
        '<button class="btn danger small" id="premio-ausente">Ausente · volver a girar</button></div>';
      [['premio-entregado', 'entregado'], ['premio-ausente', 'ausente']].forEach(function ([id, status]) {
        document.getElementById(id).onclick = function () {
          drawSafely(function () {
            draw = Draw.finish(draw, status, Date.now());
            updateDraw();
          });
        };
      });
    } else {
      result.textContent = !draw ? 'Carga el respaldo sellado en la consola local.' :
        spinning ? 'Girando…' : eligible.length ? 'Listo para girar.' : 'No quedan boletos elegibles.';
    }
    document.getElementById('ruleta-historial').innerHTML = UI.table(['Estudiante', 'Boleto', 'Premio', 'Estado', 'Fecha'], history.map(function (record) {
      return [esc(record.nombre), esc(record.number), esc(record.premio), esc(record.estado), esc(UI.dateTime(record.creado))];
    }));
  }

  function render(state) {
    const select = document.getElementById('vil-grupo-activo');
    const previous = select.value;
    select.innerHTML = state.groups.length ? state.groups.slice().sort(function (a, b) { return a.orden - b.orden; }).map(function (g) {
      return '<option value="' + esc(g.id) + '">' + g.orden + '. ' + esc(g.nombre) + '</option>';
    }).join('') : '<option value="">Sin grupos inscritos</option>';
    if (previous && state.groups.some(function (g) { return g.id === previous; })) select.value = previous;

    document.getElementById('scores-list').innerHTML = UI.table(['Grupo', 'Total', 'Aplauso'], state.scores.map(function (s) {
      const group = state.groups.find(function (g) { return g.id === s.grupoId; });
      return [esc(group ? group.nombre : 'Grupo'), Number(s.total) + '/100', Number(s.aplauso)];
    }));

    UI.renderRanking('ranking-detalle', ranking());
    document.getElementById('deseos-lista').innerHTML = wishes().map(function (wish) {
      return '<blockquote>“' + esc(wish.frase) + '” — ' + esc(wish.nombre) + '</blockquote>';
    }).join('') || '<p class="empty">Sin frases aprobadas.</p>';
    document.getElementById('backup-download').disabled = !state.snapshot && !draw;

    renderRuleta();
    Ignite.renderSequence();
    renderStage();
  }

  function setup() {
    renderScoreFields();
    Ignite.renderSequence();

    document.querySelectorAll('.stage-tabs .btn').forEach(function (button) {
      button.addEventListener('click', function () {
        activeTab = button.dataset.tab;
        document.querySelectorAll('.stage-tabs .btn').forEach(function (b) { b.classList.toggle('active', b === button); });
        document.querySelectorAll('.tab-panel').forEach(function (panel) { panel.hidden = panel.dataset.panel !== activeTab; });
        renderStage();
      });
    });

    document.getElementById('audio-toggle').addEventListener('click', async function () {
      if (await Sound.enable()) UI.toast('Audio del navegador habilitado');
      else UI.toast('El navegador no pudo activar el audio.', 'warn');
    });
    document.getElementById('cronometro-start').addEventListener('click', startCronometro);
    document.getElementById('cronometro-pause').addEventListener('click', stopCronometro);
    document.getElementById('cronometro-reset').addEventListener('click', resetCronometro);
    document.getElementById('mic-start').addEventListener('click', startMic);
    document.getElementById('mic-stop').addEventListener('click', stopMic);
    document.getElementById('aplauso-manual').addEventListener('input', function (event) {
      const value = Number(event.target.value);
      if (aplauso.stream) stopMic();
      event.target.value = value;
      aplauso.value = value;
      document.getElementById('aplauso-bar').style.width = aplauso.value + '%';
      renderStage();
    });
    document.getElementById('vil-grupo-activo').addEventListener('change', renderStage);

    document.getElementById('form-score').addEventListener('submit', function (event) {
      event.preventDefault();
      const group = activeGroup();
      if (!group || localMode) return UI.toast('Selecciona un grupo en la consola conectada.', 'warn');
      const criterios = {};
      Data.criteriosVillancicos.forEach(function (criterion) {
        criterios[criterion.id] = Number(document.getElementById('score-' + criterion.id).value);
      });
      UI.submit(event, 'score', { subject: group.id, criterios }, true,
        function () { UI.toast('Puntaje guardado.'); });
    });

    document.getElementById('deseos-play').addEventListener('click', startRotation);
    document.getElementById('deseos-stop').addEventListener('click', stopRotation);
    Ignite.setup();
    document.getElementById('project-fullscreen').onclick = async function () {
      const screen = document.getElementById('stage-screen');
      try {
        if (screen.requestFullscreen) await screen.requestFullscreen();
        screen.focus();
      } catch {
        UI.toast('Usa el modo de pantalla completa del navegador.', 'warn');
      }
    };
    document.getElementById('ruleta-girar').addEventListener('click', spin);

    document.getElementById('backup-download').onclick = function () {
      const snapshot = (draw && draw.snapshot) || Store.get().snapshot;
      if (!snapshot) return UI.toast('Recepción debe sellar los datos para generar el respaldo.', 'warn');
      UI.download('ciya2026-escenario-v2.json', JSON.stringify(snapshot, null, 2));
    };
    document.getElementById('backup-load').onclick = async function () {
      const file = document.getElementById('backup-file').files[0];
      if (!file) return UI.toast('Selecciona un archivo JSON.', 'warn');
      try {
        draw = Draw.install(JSON.parse(await file.text()), draw);
        render(Store.get());
        updateDraw();
        UI.toast('Respaldo validado. Ranking y sorteo disponibles sin red.');
      } catch (error) {
        UI.toast(error.message, 'bad');
      }
    };
  }

  function claimLocalConsole() {
    return new Promise(function (resolve, reject) {
      navigator.locks.request('ciya-escenario-local', { ifAvailable: true }, function (lock) {
        resolve(Boolean(lock));
        if (lock) return new Promise(function () {});
      }).catch(reject);
    });
  }

  async function init() {
    mount();
    if (!localMode && !Store.configured()) {
      location.replace('index.html');
      return;
    }
    if (localMode && (!navigator.locks || !await claimLocalConsole().catch(function () { return false; }))) {
      const locked = document.getElementById('locked');
      locked.textContent = 'La consola local requiere Chrome o Edge y una sola pestaña activa.';
      locked.hidden = false;
      return;
    }
    if (!localMode && !await UI.requireAccount('escenario', 'Consola de escenario')) {
      document.getElementById('locked').hidden = false;
      return;
    }
    document.getElementById('panel').hidden = false;
    document.getElementById('backup-load').disabled = !localMode;
    document.getElementById('backup-file').disabled = !localMode;
    document.getElementById('sync-status').textContent = localMode ? 'Escenario local' : 'Conectando';
    UI.initNav('escenario', { local: localMode });
    if (localMode) {
      const form = document.getElementById('form-score');
      form.querySelector('[type=submit]').disabled = true;
      drawSafely(function () { draw = Draw.load(); });
      const timer = setInterval(function () {
        if (!drawSafely(updateDraw)) clearInterval(timer);
      }, 250);
    } else {
      await Store.init('escenario');
    }
    setup();
    Store.subscribe(render);
  }

  window.CIYA_STAGE_RENDER = renderStage;
  window.CIYA_STAGE = { mount: mount, init: init };
  init();
})();
