const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { createContext, runInContext } = require('node:vm');

function loadShared({ configured = true, storedSession = null, storedRoles = null } = {}) {
  const storage = new Map();
  if (storedSession) storage.set('ciya2026:session:v2', JSON.stringify(storedSession));
  if (storedRoles) storage.set('ciya2026:roles:v1', JSON.stringify(storedRoles));
  const statusEl = {
    textContent: '',
    classes: new Set(),
    classList: {
      toggle(cls, force) {
        if (force) statusEl.classes.add(cls);
        else statusEl.classes.delete(cls);
      },
      remove(cls) { statusEl.classes.delete(cls); }
    }
  };
  const roleLinksEl = { innerHTML: '' };
  const logoutBtn = { hidden: true, dataset: {}, addEventListener() {} };
  const timers = [];
  const docListeners = [];
  const network = [];
  const context = createContext({
    window: {},
    sessionStorage: {
      getItem: key => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, val) => storage.set(key, String(val)),
      removeItem: key => storage.delete(key)
    },
    document: {
      hidden: false,
      querySelectorAll: sel => {
        if (sel === '[data-role-links]') return [roleLinksEl];
        if (sel === '[data-logout-btn]') return [logoutBtn];
        return [];
      },
      querySelector: () => null,
      getElementById: id => (id === 'sync-status' ? statusEl : null),
      addEventListener: (type, fn) => docListeners.push({ type, fn })
    },
    fetch: async (...args) => { network.push(args); throw new Error('Red desconectada'); },
    setInterval: fn => { timers.push(fn); return timers.length; },
    clearInterval: () => {}
  });
  context.window = context;
  const files = [
    join(__dirname, '..', '..', 'apps', 'web', 'shared', 'js', 'config.js'),
    join(__dirname, '..', '..', 'apps', 'web', 'shared', 'js', 'data.js'),
    join(__dirname, '..', '..', 'apps', 'web', 'shared', 'js', 'store.js'),
    join(__dirname, '..', '..', 'apps', 'web', 'shared', 'js', 'ui.js')
  ];
  for (const filename of files) {
    runInContext(readFileSync(filename, 'utf8'), context);
  }
  context.CIYA_CONFIG.supabaseUrl = configured ? 'https://ciya.supabase.co' : '';
  context.CIYA_CONFIG.supabaseAnonKey = configured ? 'eyJtest' : '';
  return {
    ui: context.CIYA_UI,
    store: context.CIYA_STORE,
    data: context.CIYA_DATA,
    statusEl,
    roleLinksEl,
    logoutBtn,
    timers,
    docListeners,
    network
  };
}

test('escapeHtml neutraliza caracteres especiales HTML', () => {
  const { ui } = loadShared();
  assert.equal(
    ui.escapeHtml(`<script>alert("x&'y")</script>`),
    '&lt;script&gt;alert(&quot;x&amp;&#39;y&quot;)&lt;/script&gt;'
  );
  assert.equal(ui.escapeHtml(null), '');
});

test('csv protege contra inyección de fórmulas y escapa comillas', () => {
  const { ui } = loadShared();
  const output = ui.csv([
    ['Nombre', 'Frase'],
    ['=CMD()', 'Hola "CIYA"'],
    [' +SUM(A1)', 'Normal']
  ]);
  assert.equal(output.startsWith('\ufeff'), true);
  const lines = output.slice(1).split('\n');
  assert.deepEqual(lines, [
    '"Nombre","Frase"',
    '"\'=CMD()","Hola ""CIYA"""',
    '"\' +SUM(A1)","Normal"'
  ]);
});

test('table genera encabezados accesibles y etiquetas móviles cuando stacked=true', () => {
  const { ui } = loadShared();
  const html = ui.table(['Nombre', 'Puntos'], [['Ana', '10']], true);
  assert.match(html, /class="table-wrap table-stack"/);
  assert.match(html, /<th scope="col" role="columnheader">Nombre<\/th>/);
  assert.match(html, /<span class="table-label" aria-hidden="true">Nombre<\/span>/);
  assert.match(ui.table(['Nombre'], []), /Sin registros todavía/);
});

test('initNav es idempotente y respeta el modo escenario local', () => {
  const { ui, statusEl, timers, docListeners } = loadShared();
  ui.initNav('escenario', { local: true });
  assert.equal(statusEl.textContent, 'Escenario local');
  assert.equal(timers.length, 0);

  ui.initNav('acceso');
  ui.initNav('acceso');
  assert.equal(statusEl.textContent, 'Sin sincronización');
  assert.equal(docListeners.length, 0);
});

test('store resuelve carreras conocidas, desconocidas y ranking inicial', () => {
  const { store, data } = loadShared();
  assert.equal(store.carrera('sistemas').nombre, 'Sistemas y Software');
  assert.equal(store.carrera('otra').sigla, '?');
  assert.equal(store.ranking().length, data.carreras.length);
  assert.equal(store.ranking().every(r => r.puntos === 0 && r.puesto === 1), true);
  assert.deepEqual(Array.from(data.ciclos, ciclo => ciclo.id),
    ['nivelacion', 'ciclo1', 'ciclo2', 'ciclo3', 'ciclo4', 'ciclo5', 'ciclo6', 'ciclo7', 'ciclo8']);
});

test('la ficha de villancicos muestra la fecha y traduce los identificadores de carrera y ciclo', () => {
  const { ui } = loadShared();
  const html = ui.villancicoDetails({ carrera: 'sistemas', ciclo: 'ciclo4', categoria: 'Coro de Carrera' });
  assert.match(html, /<time datetime="2026-12-04">Viernes 4 de diciembre de 2026<\/time>/);
  assert.match(html, /<dt>Modalidad<\/dt><dd>Coro de Carrera<\/dd>/);
  assert.match(html, /<dt>Carrera<\/dt><dd>Sistemas y Software<\/dd>/);
  assert.match(html, /<dt>Ciclo<\/dt><dd>4to ciclo<\/dd>/);
});

test('la ficha conserva grupos anteriores sin ciclo y escapa la modalidad guardada', () => {
  const { ui } = loadShared();
  const html = ui.villancicoDetails({ carrera: 'industrial', categoria: '<Modalidad>' });
  assert.match(html, /<dt>Modalidad<\/dt><dd>&lt;Modalidad&gt;<\/dd>/);
  assert.match(html, /<dt>Ciclo<\/dt><dd>Sin registrar<\/dd>/);
});

test('initNav oculta pestañas de otros roles en asistente, recepción y modo local', () => {
  const guest = loadShared();
  guest.ui.initNav('acceso');
  assert.deepEqual(Array.from(guest.roleLinksEl.innerHTML.matchAll(/data-nav="([^"]+)"/g), match => match[1]),
    ['portal', 'qr', 'cronograma']);
  assert.doesNotMatch(guest.roleLinksEl.innerHTML, /index\.html/);
  assert.equal(guest.logoutBtn.hidden, true);

  guest.store.enterAsistente();
  guest.ui.initNav('portal');
  assert.match(guest.roleLinksEl.innerHTML, /portal\.html/);
  assert.match(guest.roleLinksEl.innerHTML, /qr\.html/);
  assert.doesNotMatch(guest.roleLinksEl.innerHTML, /recepcion\.html|escenario\.html|admin\.html/);
  assert.equal(guest.logoutBtn.hidden, false);

  const recepcion = loadShared({
    storedSession: { access_token: 'token', expires_at: 4102444800 },
    storedRoles: { email: 'recepcion@example.test', roles: ['recepcion'], mode: 'staff' }
  });
  assert.deepEqual(Array.from(recepcion.store.sessionRoles()), ['recepcion']);
  recepcion.ui.initNav('recepcion');
  assert.match(recepcion.roleLinksEl.innerHTML, /recepcion\.html/);
  assert.doesNotMatch(recepcion.roleLinksEl.innerHTML, /portal\.html|qr\.html|escenario\.html|admin\.html/);
  assert.equal(recepcion.statusEl.textContent, 'Sin sincronización');

  const localStage = loadShared();
  localStage.ui.initNav('escenario', { local: true });
  assert.deepEqual(Array.from(localStage.roleLinksEl.innerHTML.matchAll(/data-nav="([^"]+)"/g), match => match[1]), ['escenario']);
  assert.equal(localStage.roleLinksEl.hidden, true);
  assert.equal(localStage.logoutBtn.hidden, true);
});

test('sin configuración no hay sesión, Roles ni operaciones', async () => {
  const sinConfig = loadShared({ configured: false });
  assert.equal(sinConfig.store.configured(), false);
  assert.equal(sinConfig.store.hasSession(), false);
  assert.equal(sinConfig.store.hasAccessSession(), false);
  assert.deepEqual(Array.from(sinConfig.store.sessionRoles()), []);
  assert.throws(() => sinConfig.store.enterAsistente(), /Falta la configuración/);
  await assert.rejects(() => sinConfig.store.loginAccount('correo@example.test', 'clave'), /Falta la configuración/);
  await assert.rejects(() => sinConfig.store.action('wish', {}), /Falta la configuración/);
});

test('una sesión con varios roles vuelve al selector desde cualquier panel autorizado', () => {
  const { ui, roleLinksEl, logoutBtn } = loadShared({
    storedSession: { access_token: 'token', expires_at: 4102444800 },
    storedRoles: { email: 'organizacion@example.test', roles: ['recepcion', 'escenario', 'admin'], mode: 'staff' }
  });

  for (const panel of ['recepcion', 'escenario', 'admin']) {
    ui.initNav(panel);
    assert.match(roleLinksEl.innerHTML, /href="index\.html#acceso-panels"/);
    assert.match(roleLinksEl.innerHTML, /Volver a Sesión activa/);
    assert.equal([...roleLinksEl.innerHTML.matchAll(/<a /g)].length, 1);
    assert.equal(logoutBtn.hidden, false);
  }

  ui.initNav('escenario', { local: true });
  assert.equal(roleLinksEl.hidden, true);
  assert.doesNotMatch(roleLinksEl.innerHTML, /acceso-panels/);
});

test('las vistas públicas dirigen al selector a la cuenta con varios módulos', () => {
  const { ui, roleLinksEl } = loadShared({
    storedSession: { access_token: 'token', expires_at: 4102444800 },
    storedRoles: { email: 'organizacion@example.test', roles: ['recepcion', 'escenario'], mode: 'staff' }
  });
  for (const page of ['portal', 'qr', 'cronograma']) {
    ui.initNav(page);
    assert.deepEqual(Array.from(roleLinksEl.innerHTML.matchAll(/data-nav="([^"]+)"/g), match => match[1]),
      ['portal', 'qr', 'cronograma', 'sesion']);
  }
});

test('la navegación pública funciona sin sesión ni configuración de Supabase', () => {
  const { ui, roleLinksEl, logoutBtn } = loadShared({ configured: false });
  for (const page of ['portal', 'qr', 'cronograma']) {
    ui.initNav(page);
    assert.match(roleLinksEl.innerHTML, /portal\.html/);
    assert.match(roleLinksEl.innerHTML, /qr\.html/);
    assert.match(roleLinksEl.innerHTML, /cronograma\.html/);
    assert.doesNotMatch(roleLinksEl.innerHTML, /recepcion\.html|escenario\.html|admin\.html/);
    assert.equal(logoutBtn.hidden, true);
  }
});

test('el acceso de escenario offline no consulta Supabase ni crea tareas de sincronización', async () => {
  for (const configured of [true, false]) {
    const { store, network, timers, docListeners } = loadShared({ configured });
    await store.init('offline');
    assert.equal(store.isRemote(), false);
    assert.deepEqual(network, []);
    assert.deepEqual(timers, []);
    assert.deepEqual(docListeners, []);
  }
});
