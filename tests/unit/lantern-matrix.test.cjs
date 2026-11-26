const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const window = {};
const source = join(__dirname, '../../apps/web/modules/portal-linterna/js/lantern-matrix.js');
runInNewContext(readFileSync(source, 'utf8'), { window });
const { compileText, layoutFor } = window.CIYA_LANTERN_MATRIX;

test('dibuja letras españolas, números y símbolos sin descartar caracteres', () => {
  const compiled = compileText('¿n\u0303andÚ, pingüino 2026? ★ ♥');
  assert.equal(compiled.missing.size, 0);
  assert.ok(compiled.columns.some(bits => bits > 0));
  assert.notDeepEqual(compileText('Ñ').columns, compileText('N').columns);
  assert.deepEqual(Array.from(compileText(',').columns), [96, 48]);
  assert.deepEqual(Array.from(compileText(':').columns), [54, 54]);
  const unsupported = compileText('🎄');
  assert.deepEqual(Array.from(unsupported.missing), ['🎄']);
  assert.deepEqual(unsupported.columns, compileText('?').columns);
});

test('una palabra corta queda fija y una frase se adapta a la orientación', () => {
  const short = compileText('CIYA');
  const greeting = compileText('Feliz Navidad CIYA');
  const horizontal = layoutFor(greeting, 700, 200, 'horizontal', false);
  const vertical = layoutFor(greeting, 320, 190, 'vertical', false);
  assert.equal(layoutFor(short, 320, 190, 'horizontal', false).mode, 'fixed');
  assert.equal(horizontal.mode, 'scroll');
  assert.equal(horizontal.capacity, 52);
  assert.equal(vertical.mode, 'fixed');
  assert.equal(vertical.lines.length, 3);
  assert.ok(vertical.lines.every(line => line.length <= vertical.capacity));
});

test('el movimiento reducido divide incluso palabras largas en partes completas', () => {
  const message = compileText('X'.repeat(60));
  const parts = layoutFor(message, 270, 135, 'vertical', true);
  assert.equal(parts.mode, 'parts');
  assert.ok(parts.lines.length > 1);
  assert.ok(parts.lines.every(line => line.length <= parts.capacity && (line.length + 1) % 6 === 0));
  assert.equal(parts.lines.reduce((letters, line) => letters + (line.length + 1) / 6, 0), 60);
});

function rendererFixture({ available = true, portrait = false, reduced = false } = {}) {
  const callbacks = new Map();
  const modes = { portrait, reduced };
  const notifications = [];
  let nextFrame = 0;
  let resize;
  let intersection;
  let bounds = { width: 720, height: 200 };
  let image;
  let path;
  const context = {
    globalAlpha: 1,
    setTransform() {},
    clearRect() { image = []; },
    beginPath() { path = []; },
    moveTo() {},
    arc(x, y, radius) { path.push([x, y, radius]); },
    fill() { image.push({ tone: this.fillStyle, path, alpha: this.globalAlpha }); }
  };
  const canvas = {
    width: 0, height: 0,
    getContext: () => available ? context : null,
    getBoundingClientRect: () => bounds
  };
  const mediaListeners = new Map();
  const sandbox = {
    window: {
      devicePixelRatio: 3,
      matchMedia(query) {
        const key = query.includes('portrait') ? 'portrait' : 'reduced';
        return {
          get matches() { return modes[key]; },
          addEventListener(name, callback) { mediaListeners.set(key, callback); }
        };
      },
      requestAnimationFrame(callback) { callbacks.set(++nextFrame, callback); return nextFrame; },
      cancelAnimationFrame(id) { callbacks.delete(id); }
    },
    ResizeObserver: class {
      constructor(callback) { resize = callback; }
      observe() {}
    },
    IntersectionObserver: class {
      constructor(callback) { intersection = callback; }
      observe() {}
    }
  };
  runInNewContext(readFileSync(source, 'utf8'), sandbox);
  const renderer = sandbox.window.CIYA_LANTERN_MATRIX.create(canvas, state => notifications.push(state));
  return {
    renderer, canvas,
    state: () => notifications.at(-1),
    image: () => image,
    pendingFrames: () => callbacks.size,
    visible(isIntersecting) { intersection([{ isIntersecting }]); },
    resize(width, height) { bounds = { width, height }; resize(); },
    media(key, matches) { modes[key] = matches; mediaListeners.get(key)(); },
    frame(time) {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach(callback => callback(time));
    }
  };
}

test('cae a texto cuando el navegador no ofrece Canvas 2D', () => {
  assert.equal(rendererFixture({ available: false }).renderer, null);
});

test('dibuja texto fijo y colores de carrera sin pedir recursos ni animar', () => {
  const f = rendererFixture();
  f.renderer.show('CIYA', '#ef476f');
  assert.equal(f.state().mode, 'fixed');
  assert.equal(f.pendingFrames(), 0);
  assert.equal(f.image()[2].tone, 'rgb(245, 137, 163)');
  assert.ok(f.image()[2].path.length > 10);
  f.renderer.show('CIYA', '#4cc9f0');
  assert.equal(f.image()[2].tone, 'rgb(140, 220, 245)');
  assert.equal(f.canvas.width, 1440);
});

test('la marquesina avanza, se pausa y reanuda sin saltar el estado', () => {
  const f = rendererFixture();
  f.renderer.show('Feliz Navidad CIYA', '#ffd166');
  assert.equal(f.state().mode, 'scroll');
  const first = f.image();
  for (let time = 0; time <= 850; time += 50) f.frame(time);
  assert.notDeepEqual(f.image(), first);
  f.renderer.togglePlaying();
  assert.equal(f.state().paused, true);
  assert.equal(f.pendingFrames(), 0);
  const paused = f.image();
  f.frame(5000);
  assert.equal(f.image(), paused);
  f.renderer.togglePlaying();
  f.frame(5500);
  assert.equal(f.image(), paused);
  f.frame(5600);
  assert.notDeepEqual(f.image(), paused);
});

test('al girar el dispositivo reorienta el mensaje sin cambiarlo ni pedir red', () => {
  const f = rendererFixture();
  f.renderer.show('Feliz Navidad CIYA', '#ffd166');
  assert.equal(f.state().mode, 'scroll');
  f.resize(320, 220);
  f.media('portrait', true);
  assert.equal(f.state().mode, 'fixed');
  assert.equal(f.state().count, 3);
  assert.equal(f.pendingFrames(), 0);
  assert.equal(f.canvas.width, 640);
  f.resize(720, 200);
  f.media('portrait', false);
  assert.equal(f.state().mode, 'scroll');
  assert.equal(f.pendingFrames(), 1);
});

test('movimiento reducido permite recorrer y volver al inicio de las partes con todo local', () => {
  const f = rendererFixture({ reduced: true });
  f.renderer.show('X'.repeat(60), '#ffd166');
  const count = f.state().count;
  assert.equal(f.state().mode, 'parts');
  assert.ok(count > 1);
  for (let part = 1; part <= count; part++) {
    assert.equal(f.state().part, part);
    assert.equal(f.pendingFrames(), 0);
    f.renderer.nextPart();
  }
  assert.equal(f.state().part, 1);
});

test('detiene la marquesina fuera de pantalla y vuelve al mostrarla', () => {
  const f = rendererFixture();
  f.renderer.show('Feliz Navidad CIYA', '#ffd166');
  assert.equal(f.pendingFrames(), 1);
  f.visible(false);
  assert.equal(f.pendingFrames(), 0);
  f.visible(true);
  assert.equal(f.pendingFrames(), 1);
});
