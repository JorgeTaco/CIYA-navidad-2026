const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { createContext, runInContext } = require('node:vm');

function fixture() {
  const storage = new Map();
  const context = createContext({
    window: {},
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    crypto: { getRandomValues: values => { values[0] = 0; return values; } }
  });
  for (const filename of ['data.js', 'draw.js']) {
    runInContext(readFileSync(join(__dirname, '..', 'assets', 'js', filename), 'utf8'), context);
  }
  const careers = context.window.CIYA_DATA.carreras;
  const ticket = (number, person, nombre) => ({ number: 'CIYA-' + String(number).padStart(19, '0'), person, nombre });
  const personA = '11111111-1111-4111-8111-111111111111';
  const personB = '22222222-2222-4222-8222-222222222222';
  return {
    draw: context.window.CIYA_DRAW,
    snapshot: {
      version: 2, event: 'ciya-navidad-2026', sealedAt: '2026-12-04T17:45:00-05:00',
      ranking: careers.map(career => ({ id: career.id, puntos: 0, juguetes: 0, caramelos: 0, total: 0, donantes: 0, puesto: 1 })),
      tickets: [ticket(1, personA, 'Ana'), ticket(2, personA, 'Ana'), ticket(3, personB, 'Beto')]
    },
    personA,
    personB
  };
}

test('recupera el resultado y gira de nuevo al vencer los 45 segundos', () => {
  const { draw, snapshot, personA, personB } = fixture();
  const start = 10000;
  draw.start(draw.install(snapshot), start, 'Chocolate');
  let state = draw.load();
  assert.equal(state.current.person, personA);
  assert.equal(state.current.expiresAt, null);
  assert.equal(draw.finish(state, 'entregado', start + 3000), state);
  const revealed = start + 7500;
  state = draw.reveal(state, revealed);
  assert.equal(state.current.expiresAt - revealed, 45000);
  state = draw.finish(state, 'entregado', state.current.expiresAt);
  assert.equal(state.history[0].estado, 'sin comparecencia');
  assert.equal(state.retry, true);
  const next = draw.start(draw.load(), start + 50000);
  assert.equal(next.current.person, personB);
  assert.equal(next.current.premio, 'Chocolate');
});

test('un estudiante premiado queda fuera con todos sus boletos', () => {
  const { draw, snapshot, personB } = fixture();
  const start = 5000;
  const state = draw.start(draw.install(snapshot), start);
  draw.finish(draw.reveal(state, start + 4100), 'entregado', start + 10000);
  assert.equal(draw.eligible(draw.load()).length, 1);
  assert.equal(draw.eligible(draw.load())[0].person, personB);
  assert.equal(draw.install(snapshot, draw.load()).history.length, 1);
});

test('rechaza un respaldo con un boleto duplicado', () => {
  const { draw, snapshot } = fixture();
  snapshot.tickets.push({ ...snapshot.tickets[0] });
  assert.throws(() => draw.install(snapshot), /duplicado/);
});
