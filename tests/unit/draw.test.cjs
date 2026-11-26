const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { createContext, runInContext } = require('node:vm');

function fixture({ storage = new Map(), random = [] } = {}) {
  let randomCalls = 0;
  const context = createContext({
    window: {},
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    crypto: { getRandomValues: values => { values[0] = random[randomCalls++] ?? 0; return values; } }
  });
  const files = [
    join(__dirname, '..', '..', 'apps', 'web', 'shared', 'js', 'data.js'),
    join(__dirname, '..', '..', 'apps', 'web', 'modules', 'pantalla-gigante', 'js', 'draw.js')
  ];
  for (const filename of files) {
    runInContext(readFileSync(filename, 'utf8'), context);
  }
  const careers = context.window.CIYA_DATA.carreras;
  const ticket = (number, person, nombre) => ({ number: 'CIYA-' + String(number).padStart(19, '0'), person, nombre });
  const personA = '11111111-1111-4111-8111-111111111111';
  const personB = '22222222-2222-4222-8222-222222222222';
  return {
    draw: context.window.CIYA_DRAW,
    storage,
    randomCalls: () => randomCalls,
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

test('el ranking, los deseos y todos los boletos se recuperan desde otro contexto sin red', () => {
  const { draw, snapshot, storage } = fixture();
  Object.assign(snapshot.ranking[0], { juguetes: 2, caramelos: 1, total: 3, puntos: 12, donantes: 2 });
  snapshot.wishes = [{ nombre: 'Participante', rol: 'estudiante', carrera: 'Sistemas', frase: 'Deseo de ensayo' }];
  draw.install(snapshot);
  const recovered = fixture({ storage }).draw.load();
  assert.deepEqual(JSON.parse(JSON.stringify(recovered.snapshot)), JSON.parse(JSON.stringify(snapshot)));
});

test('la recarga conserva el plazo iniciado y un intento de revelación no lo renueva', () => {
  const { draw, snapshot, storage } = fixture();
  const pending = draw.start(draw.install(snapshot), 10000);
  assert.equal(draw.reveal(pending, 14099), pending);
  const shown = draw.reveal(pending, 14100);
  const fresh = fixture({ storage }).draw;
  const restored = fresh.load();
  assert.equal(restored.current.expiresAt, shown.current.expiresAt);
  assert.equal(fresh.reveal(restored, 30000), restored);
  assert.equal(fresh.finish(restored, 'entregado', restored.current.expiresAt - 1).history[0].estado, 'entregado');
});

test('cada boleto adicional ocupa una posición independiente en el sorteo', () => {
  for (const position of [0, 1, 2]) {
    const { draw, snapshot } = fixture({ random: [position] });
    const winner = draw.start(draw.install(snapshot), 0).current;
    assert.equal(winner.number, snapshot.tickets[position].number);
  }
});

test('descarta una muestra aleatoria fuera del rango para evitar sesgo', () => {
  const { draw, snapshot, randomCalls, personB } = fixture({ random: [0xffffffff, 2] });
  assert.equal(draw.start(draw.install(snapshot), 0).current.person, personB);
  assert.equal(randomCalls(), 2);
});

test('un giro pendiente no se reemplaza con un segundo clic', () => {
  const { draw, snapshot, randomCalls } = fixture();
  const pending = draw.start(draw.install(snapshot), 0, 'Chocolate');
  assert.equal(draw.start(pending, 1000, 'Otro premio'), pending);
  assert.equal(randomCalls(), 1);
});

test('la ausencia excluye todos los boletos del mismo estudiante para ese premio', () => {
  const { draw, snapshot, personA, personB } = fixture();
  const pending = draw.reveal(draw.start(draw.install(snapshot), 0, 'Chocolate'), 4100);
  const absent = draw.finish(pending, 'ausente', 5000);
  assert.equal(draw.eligible(absent).length, 1);
  const retry = draw.start(absent, 5000);
  assert.equal(retry.current.person, personB);
  assert.equal(retry.current.premio, 'Chocolate');
  const paid = draw.finish(draw.reveal(retry, 9100), 'entregado', 10000);
  assert.equal(draw.eligible(paid).length, 2);
  assert.ok(draw.eligible(paid).every(ticket => ticket.person === personA));
});

test('detiene el reintento cuando todos los candidatos están ausentes', () => {
  const { draw, snapshot } = fixture();
  snapshot.tickets.pop();
  const pending = draw.reveal(draw.start(draw.install(snapshot), 0), 4100);
  const absent = draw.finish(pending, 'ausente', 5000);
  const exhausted = draw.start(absent, 5100);
  assert.equal(exhausted.current, null);
  assert.equal(exhausted.retry, false);
  assert.equal(exhausted.history.length, 1);
});

test('un respaldo vacío permite ver el marcador y no inicia un giro', () => {
  const { draw, snapshot, randomCalls } = fixture();
  snapshot.tickets = [];
  const installed = draw.install(snapshot);
  assert.equal(draw.start(installed, 0), installed);
  assert.equal(randomCalls(), 0);
});

test('reimportar el mismo respaldo conserva el giro y otro respaldo no lo sobrescribe', () => {
  const { draw, snapshot } = fixture();
  const pending = draw.start(draw.install(snapshot), 0);
  assert.equal(draw.install(snapshot, pending), pending);
  assert.throws(() => draw.install({ ...snapshot, sealedAt: '2026-12-04T17:46:00-05:00' }, pending), /otro respaldo/);
  assert.equal(draw.load().current.number, pending.current.number);
});

for (const [label, mutate, message] of [
  ['versión antigua', snapshot => { snapshot.version = 1; }, /versión 2/],
  ['otro evento', snapshot => { snapshot.event = 'otro-evento'; }, /versión 2/],
  ['fecha de sellado inválida', snapshot => { snapshot.sealedAt = 'fecha'; }, /versión 2/],
  ['carrera faltante', snapshot => { snapshot.ranking.pop(); }, /versión 2/],
  ['carrera duplicada', snapshot => { snapshot.ranking[1].id = snapshot.ranking[0].id; }, /marcador/],
  ['puntaje que no coincide con las donaciones', snapshot => { snapshot.ranking[0].puntos = 3; }, /marcador/],
  ['total de aportes incorrecto', snapshot => { snapshot.ranking[0].total = 2; }, /marcador/],
  ['cantidad negativa', snapshot => { snapshot.ranking[0].donantes = -1; }, /marcador/],
  ['deseo aprobado incompleto', snapshot => { snapshot.wishes = [{ frase: 'Ensayo' }]; }, /versión 2/],
  ['número de boleto incorrecto', snapshot => { snapshot.tickets[0].number = 'CIYA-1'; }, /boleto inválido/],
  ['identificador de participante inválido', snapshot => { snapshot.tickets[0].person = '-'.repeat(36); }, /boleto inválido/],
  ['nombre de participante vacío', snapshot => { snapshot.tickets[0].nombre = ' '; }, /boleto inválido/]
]) {
  test('rechaza un respaldo offline con ' + label, () => {
    const { draw, snapshot } = fixture();
    mutate(snapshot);
    assert.throws(() => draw.install(snapshot), message);
    assert.equal(draw.load(), null);
  });
}

test('rechaza un estado guardado que apunta a un boleto ausente', () => {
  const { draw, snapshot, storage } = fixture();
  const pending = draw.start(draw.install(snapshot), 0);
  pending.current.number = 'CIYA-9999999999999999999';
  storage.set('ciya2026:draw:v2', JSON.stringify(pending));
  assert.throws(() => fixture({ storage }).draw.load(), /avance guardado/);
});

test('una escritura local fallida no deja un giro a medio guardar', () => {
  const storage = new Map();
  const { draw, snapshot } = fixture({ storage });
  const installed = draw.install(snapshot);
  storage.set = () => { throw new Error('Almacenamiento lleno'); };
  assert.throws(() => draw.start(installed, 0), /Almacenamiento lleno/);
  assert.equal(draw.load().current, null);
});
