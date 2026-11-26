(function () {
  'use strict';

  const UI = window.CIYA_UI;
  const Data = window.CIYA_DATA;
  const Sound = window.CIYA_SOUND;
  const CFG = window.CIYA_CONFIG;
  const esc = UI.escapeHtml;
  const ignicion = { count: 10, running: false, timer: null, step: -1, sequenceTimer: null };
  const serial = { port: null, reader: null, writer: null, armed: false, connecting: false };

  function template() {
    return `
      <h2>Encendido 5 en 1 (local/offline)</h2>
      <p class="muted">Reacción: Industrial → Hidráulica → Electromecánica → Sistemas → Electricidad. El sensor Arduino/ESP32 dispara la cuenta regresiva por puerto serial.</p>
      <div class="row"><button class="btn small" id="serial-connect">Conectar sensor serial</button><button class="btn small" id="serial-arm" disabled>Armar disparo del sensor</button><span class="badge" id="serial-status">Sin conectar</span></div>
      <p class="hint" id="serial-hint">Usa Chrome o Edge de escritorio. Ante una falla de la conexión serial, coordina el disparo con el operador de Electricidad.</p>
      <button class="btn primary wide" id="ignicion-manual" style="margin-top:0.6rem">Disparar cuenta regresiva manualmente</button>
      <p class="hint" style="margin-top:0.6rem"><strong>Tecla de emergencia:</strong> barra espaciadora inicia la cuenta local. Electricidad dispone de un interruptor físico independiente.</p>
      <div id="secuencia-encendido" style="margin-top:1rem"></div>
      <div id="estado-relay" style="margin-top:0.8rem">Simulación local: placa desconectada.</div>
      <p class="muted">${esc(String(CFG.serialBaudRate))} baudios · comando de relé: ${esc(JSON.stringify(CFG.relayCommand))}</p>`;
  }

  function mount() {
    const root = document.getElementById('encendido-root');
    if (root) root.innerHTML = template();
  }

  function status() {
    return { count: ignicion.count, running: ignicion.running, step: ignicion.step, armed: serial.armed };
  }

  function relayStatus(message, kind) {
    const statusNode = document.getElementById('estado-relay');
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.className = 'badge ' + kind;
  }

  async function writeRelay() {
    if (!serial.writer) {
      relayStatus('Simulación local: placa desconectada.', 'warn');
      return;
    }
    try {
      await serial.writer.write(new TextEncoder().encode(CFG.relayCommand));
      relayStatus('Comando enviado a la placa.', 'ok');
    } catch (error) {
      relayStatus('Error al enviar el comando. Avisa a Electricidad.', 'bad');
    }
  }

  function renderSequence() {
    const container = document.getElementById('secuencia-encendido');
    if (!container) return;
    container.innerHTML = Data.secuenciaEncendido.map(function (id, index) {
      const c = window.CIYA_STORE.carrera(id);
      const cls = index === ignicion.step ? 'active' : index < ignicion.step ? 'done' : '';
      return '<div class="timeline-step ' + cls + '" style="--step-color:' + c.color + '"><span class="step-index">' + (index + 1) + '</span>' +
        '<span>' + esc(c.nombre) + (index === 4 ? ' · pulso al relé' : '') + '</span></div>';
    }).join('');
  }

  function runSequence() {
    ignicion.step = 0;
    renderSequence();
    if (window.CIYA_STAGE_RENDER) window.CIYA_STAGE_RENDER();
    ignicion.sequenceTimer = setInterval(function () {
      ignicion.step += 1;
      if (ignicion.step >= Data.secuenciaEncendido.length) {
        clearInterval(ignicion.sequenceTimer);
        ignicion.sequenceTimer = null;
        Sound.ignite();
      } else {
        Sound.beep();
      }
      renderSequence();
      if (window.CIYA_STAGE_RENDER) window.CIYA_STAGE_RENDER();
    }, 900);
  }

  function startIgnicion() {
    if (ignicion.running || ignicion.sequenceTimer) return;
    serial.armed = false;
    const arm = document.getElementById('serial-arm');
    if (arm) arm.textContent = 'Armar disparo del sensor';
    Sound.enable();
    ignicion.running = true;
    ignicion.count = 10;
    ignicion.step = -1;
    const deadline = performance.now() + 10000;
    relayStatus('Cuenta en curso.', 'warn');
    renderSequence();
    if (window.CIYA_STAGE_RENDER) window.CIYA_STAGE_RENDER();
    ignicion.timer = setInterval(function () {
      const seconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      if (seconds === ignicion.count) return;
      ignicion.count = seconds;
      if (seconds === 0) {
        clearInterval(ignicion.timer);
        ignicion.running = false;
        Sound.go();
        writeRelay();
        runSequence();
      } else {
        Sound.countdown();
        if (window.CIYA_STAGE_RENDER) window.CIYA_STAGE_RENDER();
      }
    }, 50);
  }

  async function connectSerial() {
    if (serial.connecting) return;
    if (!navigator.serial) return UI.toast('Web Serial requiere Chrome o Edge de escritorio.', 'bad');
    serial.connecting = true;
    const connect = document.getElementById('serial-connect');
    const arm = document.getElementById('serial-arm');
    const statusNode = document.getElementById('serial-status');
    connect.disabled = true;
    try {
      serial.port = await navigator.serial.requestPort();
      await serial.port.open({ baudRate: CFG.serialBaudRate });
      serial.writer = serial.port.writable.getWriter();
      serial.reader = serial.port.readable.getReader();
      statusNode.textContent = 'Sensor conectado';
      arm.disabled = false;
      let buffer = '';
      const decoder = new TextDecoder();
      while (true) {
        const packet = await serial.reader.read();
        if (packet.done) break;
        buffer += decoder.decode(packet.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        if (buffer.length > 256) buffer = '';
        for (const line of lines) {
          if (serial.armed && /^(SENSOR|TRIGGER|DISPARO|IGNITE|1)$/i.test(line.trim())) startIgnicion();
        }
      }
    } catch (error) {
      if (error.name !== 'NotFoundError') UI.toast('Puerto serial interrumpido: ' + error.message, 'bad');
    } finally {
      if (serial.reader) serial.reader.releaseLock();
      if (serial.writer) serial.writer.releaseLock();
      if (serial.port) await serial.port.close().catch(function () {});
      Object.assign(serial, { port: null, reader: null, writer: null, armed: false, connecting: false });
      statusNode.textContent = 'Sin conectar';
      arm.textContent = 'Armar disparo del sensor';
      arm.disabled = true;
      connect.disabled = false;
    }
  }

  function setup() {
    document.getElementById('serial-connect').addEventListener('click', connectSerial);
    document.getElementById('ignicion-manual').addEventListener('click', startIgnicion);
    document.getElementById('serial-arm').onclick = function (event) {
      Sound.enable();
      serial.armed = !serial.armed;
      event.currentTarget.textContent = serial.armed ? 'Desarmar disparo' : 'Armar disparo del sensor';
    };
    document.addEventListener('keydown', function (event) {
      const panel = document.querySelector('[data-panel="encendido"]');
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (!event.repeat && event.code === 'Space' && panel && !panel.hidden &&
          !['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) {
        event.preventDefault();
        startIgnicion();
      }
    });
  }

  window.CIYA_IGNITE = {
    mount: mount,
    status: status,
    renderSequence: renderSequence,
    start: startIgnicion,
    connect: connectSerial,
    setup: setup
  };
})();
