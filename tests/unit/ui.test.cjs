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
    docListeners
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
  assert.equal(docListeners.length, 2);
});

test('store resuelve carreras conocidas, desconocidas y ranking inicial', () => {
  const { store, data } = loadShared();
  assert.equal(store.carrera('sistemas').nombre, 'Sistemas y Software');
  assert.equal(store.carrera('otra').sigla, '?');
  assert.equal(store.ranking().length, data.carreras.length);
  assert.equal(store.ranking().every(r => r.puntos === 0 && r.puesto === 1), true);
});

test('initNav oculta pestañas de otros roles en asistente, recepción y modo local', () => {
  const guest = loadShared();
  guest.ui.initNav('acceso');
  assert.equal(guest.roleLinksEl.innerHTML, '<a href="bases.html" data-nav="bases">Bases oficiales</a>');
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
  assert.equal(localStage.roleLinksEl.innerHTML, '<a href="escenario.html" data-nav="escenario">Escenario</a>');
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

test('la navegación pública funciona sin sesión ni configuración de Supabase', () => {
  const { ui, roleLinksEl, logoutBtn } = loadShared({ configured: false });
  for (const page of ['portal', 'qr', 'bases']) {
    ui.initNav(page);
    assert.match(roleLinksEl.innerHTML, /portal\.html/);
    assert.match(roleLinksEl.innerHTML, /qr\.html/);
    assert.match(roleLinksEl.innerHTML, /bases\.html/);
    assert.doesNotMatch(roleLinksEl.innerHTML, /recepcion\.html|escenario\.html|admin\.html/);
    assert.equal(logoutBtn.hidden, true);
  }
});
