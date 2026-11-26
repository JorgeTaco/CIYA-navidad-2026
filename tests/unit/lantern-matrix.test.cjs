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
