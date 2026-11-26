const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { createContext, runInContext } = require('node:vm');

const root = join(__dirname, '../../apps/web');
const source = readFileSync(join(root, 'modules/hardware-encendido/js/encendido.js'), 'utf8');
const data = readFileSync(join(root, 'shared/js/data.js'), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function clock() {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  return {
    now: () => now,
    setInterval(callback, delay) {
      timers.set(++nextId, { callback, delay, time: now + delay });
      return nextId;
    },
    clearInterval(id) { timers.delete(id); },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const pending = [...timers.values()].filter(timer => timer.time <= end);
        if (!pending.length) break;
        const timer = pending.sort((left, right) => left.time - right.time)[0];
        now = timer.time;
        timer.time += timer.delay;
        timer.callback();
      }
      now = end;
    }
  };
}

function fixture({ serialAvailable = true, writeError = false } = {}) {
  const timer = clock();
  const writes = [];
  const messages = [];
  const audio = [];
  const opened = [];
  let closed = 0;
  let streamController;
  const events = new Map();
  const panel = { hidden: false };
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, disabled: false, textContent: '', innerHTML: '',
      addEventListener(type, callback) { events.set(id + ':' + type, callback); }
    });
    return elements.get(id);
  };
  const port = {
    open: async options => opened.push(options.baudRate),
    close: async () => { closed++; },
    readable: new ReadableStream({ start(controller) { streamController = controller; } }),
    writable: new WritableStream({
      write(data) {
        writes.push({ time: timer.now(), command: new TextDecoder().decode(data) });
        if (writeError) throw new Error('Puerto de ensayo sin conexión');
      }
    })
  };
  const window = {
    CIYA_CONFIG: { relayCommand: 'RELAY_ON\n', serialBaudRate: 9600 },
    CIYA_UI: { escapeHtml: value => value, toast: (message, type) => messages.push({ message, type }) },
    CIYA_SOUND: Object.fromEntries(['enable', 'countdown', 'go', 'beep', 'ignite'].map(method => [
      method, () => audio.push({ method, time: timer.now() })
    ])),
    CIYA_STORE: { carrera: id => window.CIYA_DATA.carreras.find(career => career.id === id) }
  };
  const document = {
    activeElement: null,
    getElementById: element,
    querySelector: selector => selector === '[data-panel="encendido"]' ? panel : null,
    addEventListener: (type, callback) => events.set(type, callback)
  };
  const context = createContext({
    window,
    document,
    navigator: serialAvailable ? { serial: { requestPort: async () => port } } : {},
    TextDecoder, TextEncoder,
    performance: { now: timer.now },
    setInterval: timer.setInterval,
    clearInterval: timer.clearInterval
  });
  runInContext(data, context);
  runInContext(source, context);
  const ignite = window.CIYA_IGNITE;
  ignite.mount();
  ignite.setup();

  return {
    ignite, timer, element, opened, writes, messages, audio, port,
    closed: () => closed,
    async connect() {
      const disconnected = ignite.connect();
      await flush();
      return { disconnected };
    },
    async send(chunk) {
      streamController.enqueue(new TextEncoder().encode(chunk));
      await flush();
    },
    unplug() { streamController.close(); },
    arm() {
      const button = element('serial-arm');
      button.onclick({ currentTarget: button });
    },
    key({ code = 'Space', repeat = false, tag = 'DIV', hidden = false } = {}) {
      panel.hidden = hidden;
      document.activeElement = { tagName: tag };
      let prevented = false;
      events.get('keydown')({ code, repeat, preventDefault() { prevented = true; } });
      return prevented;
    },
    manual() { events.get('ignicion-manual:click')(); }
  };
}

test('sin placa la tecla de respaldo ejecuta los 10 segundos y el audio local', () => {
  const f = fixture({ serialAvailable: false });
  assert.equal(f.key(), true);
  assert.equal(f.ignite.status().count, 10);
  f.timer.advance(9999);
  assert.equal(f.ignite.status().count, 1);
  assert.equal(f.ignite.status().running, true);
  assert.equal(f.audio.filter(note => note.method === 'countdown').length, 9);
  f.timer.advance(1);
  assert.equal(f.ignite.status().count, 0);
  assert.equal(f.ignite.status().running, false);
  assert.match(f.element('estado-relay').textContent, /Simulación local/);
  assert.deepEqual(f.audio.find(note => note.method === 'go'), { method: 'go', time: 10000 });
  assert.deepEqual(f.writes, []);
});

test('el navegador sin Web Serial muestra el aviso y deja operativo el disparo manual', async () => {
  const f = fixture({ serialAvailable: false });
  await f.ignite.connect();
  assert.equal(f.messages.length, 1);
  assert.match(f.messages[0].message, /Web Serial/);
  f.manual();
  assert.equal(f.ignite.status().running, true);
});

test('la tecla de respaldo respeta la pestaña visible, las repeticiones y los controles', () => {
  const f = fixture();
  const blocked = [{ hidden: true }, { code: 'Enter' }, { repeat: true },
    ...['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].map(tag => ({ tag }))];
  for (const scenario of blocked) {
    assert.equal(f.key(scenario), false);
    assert.equal(f.ignite.status().running, false);
  }
  assert.equal(f.key(), true);
  assert.equal(f.ignite.status().running, true);
});

test('el sensor desconectado en la cuenta mantiene la secuencia sin pulso', async () => {
  const f = fixture();
  const { disconnected } = await f.connect();
  f.arm();
  await f.send('TRIGGER\n');
  assert.equal(f.ignite.status().running, true);
  f.timer.advance(6000);
  f.unplug();
  await disconnected;
  f.timer.advance(4000);
  assert.equal(f.ignite.status().count, 0);
  assert.match(f.element('estado-relay').textContent, /Simulación local/);
  assert.deepEqual(f.writes, []);
});

test('el puerto se abre a 9600 baudios y se limpia al desconectar', async () => {
  const f = fixture();
  const { disconnected } = await f.connect();
  assert.deepEqual(f.opened, [9600]);
  assert.equal(f.element('serial-arm').disabled, false);
  assert.equal(f.element('serial-connect').disabled, true);
  f.arm();
  f.unplug();
  await disconnected;
  assert.equal(f.closed(), 1);
  assert.equal(f.port.readable.locked, false);
  assert.equal(f.port.writable.locked, false);
  assert.equal(f.ignite.status().armed, false);
  assert.equal(f.element('serial-arm').disabled, true);
  assert.equal(f.element('serial-connect').disabled, false);
});

test('un aviso serial sin armar o sin salto de línea no inicia el encendido', async () => {
  const f = fixture();
  const { disconnected } = await f.connect();
  await f.send('SENSOR\n');
  assert.equal(f.ignite.status().running, false);
  f.arm();
  await f.send('SENSOR');
  assert.equal(f.ignite.status().running, false);
  await f.send('\r\n');
  assert.equal(f.ignite.status().running, true);
  f.unplug();
  await disconnected;
});

test('acepta un disparo fragmentado y emite un único comando al llegar a cero', async () => {
  const f = fixture();
  const { disconnected } = await f.connect();
  f.arm();
  await f.send('SE');
  assert.equal(f.ignite.status().running, false);
  await f.send('NSOR\r\nTRIGGER\n');
  assert.equal(f.ignite.status().running, true);
  assert.equal(f.ignite.status().armed, false);
  f.timer.advance(9999);
  assert.deepEqual(f.writes, []);
  f.timer.advance(1);
  await flush();
  assert.deepEqual(f.writes, [{ time: 10000, command: 'RELAY_ON\n' }]);
  assert.match(f.element('estado-relay').textContent, /enviado/);
  f.timer.advance(5000);
  assert.equal(f.writes.length, 1);
  f.unplug();
  await disconnected;
});

test('rechaza mensajes de diagnóstico y recupera el siguiente disparo correcto', async () => {
  const f = fixture();
  const { disconnected } = await f.connect();
  f.arm();
  await f.send('LOG: SENSOR\n\nSENSOR apagado\n10\n');
  assert.equal(f.ignite.status().running, false);
  await f.send(' disparo \n');
  assert.equal(f.ignite.status().running, true);
  f.unplug();
  await disconnected;
});

test('una línea serial demasiado larga se descarta completa antes de aceptar otra', async () => {
  const f = fixture();
  const { disconnected } = await f.connect();
  try {
    f.arm();
    await f.send('X'.repeat(300));
    await f.send('SENSOR\n');
    assert.equal(f.ignite.status().running, false);
    await f.send('IGNITE\n');
    assert.equal(f.ignite.status().running, true);
  } finally {
    f.unplug();
    await disconnected;
  }
});

test('un fallo al escribir el comando deja visible el aviso y completa la secuencia', async () => {
  const f = fixture({ writeError: true });
  const { disconnected } = await f.connect();
  f.manual();
  f.timer.advance(10000);
  await flush();
  assert.equal(f.writes.length, 1);
  assert.match(f.element('estado-relay').textContent, /Error al enviar/);
  f.timer.advance(4500);
  assert.equal(f.ignite.status().step, 5);
  assert.equal(f.audio.at(-1).method, 'ignite');
  f.unplug();
  await disconnected;
});

test('la secuencia respeta el orden y el disparo manual no reinicia una cuenta en marcha', () => {
  const f = fixture();
  f.manual();
  f.timer.advance(5000);
  f.manual();
  assert.equal(f.ignite.status().count, 5);
  f.timer.advance(5000);
  assert.equal(f.ignite.status().step, 0);
  assert.match(f.element('secuencia-encendido').innerHTML,
    /Industrial[\s\S]*Hidráulica[\s\S]*Electromecánica[\s\S]*Sistemas y Software[\s\S]*Electricidad/);
  for (let step = 1; step <= 5; step++) {
    f.timer.advance(900);
    assert.equal(f.ignite.status().step, step);
  }
});
