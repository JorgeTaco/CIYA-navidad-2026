(function () {
  'use strict';
  const key = 'ciya2026:draw:v2';
  const event = 'ciya-navidad-2026';

  function validate(snapshot) {
    const careerIds = window.CIYA_DATA.carreras.map(function (career) { return career.id; });
    if (!snapshot || snapshot.version !== 2 || snapshot.event !== event ||
        (snapshot.wishes !== undefined && (!Array.isArray(snapshot.wishes) || !snapshot.wishes.every(function (wish) {
          return wish && ['nombre', 'rol', 'carrera', 'frase'].every(function (key) { return typeof wish[key] === 'string'; });
        }))) || !Number.isFinite(Date.parse(snapshot.sealedAt)) || !Array.isArray(snapshot.ranking) ||
        snapshot.ranking.length !== careerIds.length || !Array.isArray(snapshot.tickets)) {
      throw new Error('Selecciona un respaldo de escenario CIYA versión 2.');
    }
    const ids = new Set();
    snapshot.ranking.forEach(function (row) {
      if (!row || !careerIds.includes(row.id) || ids.has(row.id) ||
          !['puntos', 'juguetes', 'caramelos', 'total', 'donantes', 'puesto'].every(function (field) {
            return Number.isSafeInteger(row[field]) && row[field] >= 0;
          }) || row.total !== row.juguetes + row.caramelos || row.puntos !== row.juguetes * 5 + row.caramelos * 2) {
        throw new Error('El marcador del respaldo no es válido.');
      }
      ids.add(row.id);
    });
    const numbers = new Set();
    snapshot.tickets.forEach(function (ticket) {
      if (!ticket || !/^CIYA-\d{19}$/.test(ticket.number) || numbers.has(ticket.number) ||
          typeof ticket.person !== 'string' || !/^[0-9a-f-]{36}$/i.test(ticket.person) ||
          typeof ticket.nombre !== 'string' || !ticket.nombre.trim() || ticket.nombre.length > 120) {
        throw new Error('El respaldo contiene un boleto inválido o duplicado.');
      }
      numbers.add(ticket.number);
    });
    return snapshot;
  }

  function sameSnapshot(left, right) {
    return left.sealedAt === right.sealedAt && JSON.stringify(left.tickets) === JSON.stringify(right.tickets) &&
      JSON.stringify(left.ranking) === JSON.stringify(right.ranking);
  }

  function load() {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const draw = JSON.parse(saved);
    validate(draw.snapshot);
    if (!Array.isArray(draw.history) || !Array.isArray(draw.excluded) || typeof draw.retry !== 'boolean' ||
      (draw.current && !draw.snapshot.tickets.some(function (ticket) { return ticket.number === draw.current.number; }))) {
      throw new Error('El avance guardado del sorteo no es válido.');
    }
    return draw;
  }

  function save(draw) {
    localStorage.setItem(key, JSON.stringify(draw));
    return draw;
  }

  function install(snapshot, current) {
    validate(snapshot);
    if (current && sameSnapshot(current.snapshot, snapshot)) return current;
    if (current && (current.history.length || current.current)) throw new Error('Hay un sorteo iniciado con otro respaldo.');
    return save({ snapshot, current: null, excluded: [], history: [], retry: false, lastWinner: null });
  }

  function eligible(draw) {
    if (!draw) return [];
    const excluded = new Set(draw.excluded);
    draw.history.forEach(function (result) { if (result.estado === 'entregado') excluded.add(result.person); });
    return draw.snapshot.tickets.filter(function (ticket) { return !excluded.has(ticket.person); });
  }

  function randomIndex(size) {
    const limit = 2 ** 32 - (2 ** 32 % size);
    const buffer = new Uint32Array(1);
    do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
    return buffer[0] % size;
  }

  function start(draw, now, prize) {
    if (!draw || draw.current) return draw;
    const pool = eligible(draw);
    if (!pool.length) return draw.retry ? save({ ...draw, retry: false, excluded: [] }) : draw;
    const chosen = pool[randomIndex(pool.length)];
    const reward = draw.retry ? draw.history.at(-1).premio : prize;
    return save({ ...draw, current: { ...chosen, premio: reward || 'Premio Sorpresa CIYA 2026',
      revealAt: now + 4100, expiresAt: null },
      retry: false, lastWinner: null });
  }

  function reveal(draw, now) {
    const pending = draw.current;
    if (!pending || pending.expiresAt !== null || now < pending.revealAt) return draw;
    return save({ ...draw, current: { ...pending, expiresAt: now + 45000 } });
  }

  function finish(draw, status, now) {
    if (!draw.current || draw.current.expiresAt === null) return draw;
    if (now >= draw.current.expiresAt) status = 'sin comparecencia';
    const record = { ...draw.current, estado: status, creado: now };
    const delivered = status === 'entregado';
    return save({ ...draw, current: null, lastWinner: delivered ? record : null,
      history: [...draw.history, record], excluded: delivered ? [] : [...draw.excluded, record.person], retry: !delivered });
  }

  window.CIYA_DRAW = { validate, load, install, eligible, start, reveal, finish };
})();
