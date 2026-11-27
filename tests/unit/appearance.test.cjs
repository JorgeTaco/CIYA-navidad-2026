const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const source = readFileSync(join(__dirname, '../../apps/web/shared/js/appearance.js'), 'utf8');
const key = 'ciya2026:theme';

function loadAppearance({ dark = false, saved = null, storageBlocked = false } = {}) {
  const root = { dataset: {} };
  const meta = {};
  const events = new Map();
  const documentEvents = new Map();
  const buttonEvents = new Map();
  const attributes = new Map();
  const button = {
    firstElementChild: {},
    setAttribute: (name, value) => attributes.set(name, String(value)),
    addEventListener: (name, callback) => buttonEvents.set(name, callback)
  };
  let stored = saved;
  let systemChanged;
  const system = { matches: dark, addEventListener: (_, callback) => { systemChanged = callback; } };
  runInNewContext(source, {
    document: {
      documentElement: root,
      addEventListener: (name, callback) => documentEvents.set(name, callback),
      querySelector: selector => selector.startsWith('meta') ? meta : { prepend() {} },
      createElement: tag => tag === 'button' ? button : { getContext: () => null }
    },
    window: {
      matchMedia: () => system,
      addEventListener: (name, callback) => events.set(name, callback)
    },
    localStorage: {
      getItem(name) {
        assert.equal(name, key);
        if (storageBlocked) throw new Error('Almacenamiento desactivado');
        return stored;
      },
      setItem(name, value) {
        assert.equal(name, key);
        if (storageBlocked) throw new Error('Almacenamiento desactivado');
        stored = value;
      }
    }
  });
  return {
    root, meta, attributes, events,
    ready: () => documentEvents.get('DOMContentLoaded')(),
    click: () => buttonEvents.get('click')(),
    setSystem(value) { system.matches = value; systemChanged(); },
    setStored(value) { stored = value; },
    getStored: () => stored
  };
}

test('el tema inicial sigue al dispositivo hasta que el usuario elige', () => {
  const app = loadAppearance({ dark: true, saved: 'inválido' });
  assert.equal(app.root.dataset.theme, 'dark');
  assert.equal(app.meta.content, '#0d1b2c');
  app.ready();
  assert.equal(app.attributes.get('aria-pressed'), 'true');
  app.click();
  assert.equal(app.getStored(), 'light');
  assert.equal(app.attributes.get('aria-pressed'), 'false');
  app.setSystem(false);
  app.setSystem(true);
  assert.equal(app.root.dataset.theme, 'light');
});

test('actualiza la preferencia al volver a la página y al cambiarla en otra pestaña', () => {
  const app = loadAppearance({ saved: 'dark' });
  app.ready();
  app.setStored('light');
  app.events.get('pageshow')({ persisted: true });
  assert.equal(app.root.dataset.theme, 'light');
  app.events.get('storage')({ key, newValue: 'dark' });
  assert.equal(app.root.dataset.theme, 'dark');
  app.events.get('storage')({ key: null, newValue: null });
  assert.equal(app.root.dataset.theme, 'light');
});

test('se puede alternar el tema con el almacenamiento local desactivado', () => {
  const app = loadAppearance({ storageBlocked: true });
  app.ready();
  app.click();
  assert.equal(app.root.dataset.theme, 'dark');
  assert.equal(app.attributes.get('aria-pressed'), 'true');
});
