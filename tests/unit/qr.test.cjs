const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { createContext, runInContext } = require('node:vm');

const QRCode = require('../../apps/web/modules/portal-linterna/js/qr-code.js');

function checkFinder(matrix, row, col) {
  for (let dr = 0; dr < 7; dr++) {
    for (let dc = 0; dc < 7; dc++) {
      const expected = dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
        (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) ? 1 : 0;
      assert.equal(matrix[row + dr][col + dc], expected, `Finder en (${row + dr}, ${col + dc})`);
    }
  }
}

test('CIYA_QR_CODE genera matriz válida con patrones buscadores para URLs de mensajes', () => {
  const url = 'https://jorgetaco.github.io/CIYA-navidad-2026/qr.html?id=mensaje-solidario';
  const matrix = QRCode.encode(url);
  const size = matrix.length;
  assert.ok(size >= 29 && (size - 21) % 4 === 0);
  checkFinder(matrix, 0, 0);
  checkFinder(matrix, 0, size - 7);
  checkFinder(matrix, size - 7, 0);

  const svg = QRCode.toSvg(url, { label: 'Código QR para Mensaje solidario' });
  assert.match(svg, /^<svg class="qr-svg"/);
  assert.match(svg, /aria-label="Código QR para Mensaje solidario"/);
  assert.match(svg, /fill="#ffffff"/);
  assert.match(svg, /<path d="M/);
});

test('qr.js renderiza código QR en cada tarjeta de mensajes navideños y muestra el mensaje en detalle', () => {
  const elements = new Map();
  function makeEl(id) {
    const el = {
      id,
      innerHTML: '',
      hidden: false,
      textContent: '',
      onclick: null,
      querySelector(sel) {
        if (sel === '[data-print-route]') return { onclick: null };
        if (sel === 'h1') return { textContent: 'Mensaje solidario' };
        return null;
      },
      querySelectorAll() { return []; },
      addEventListener() {}
    };
    elements.set(id, el);
    return el;
  }

  ['qr-root', 'ruta-index', 'ruta-detalle', 'lista-mensajes', 'lista-trivias', 'lista-memes', 'copiar-base']
    .forEach(makeEl);

  const context = createContext({
    window: {},
    location: { href: 'https://jorgetaco.github.io/CIYA-navidad-2026/qr.html', search: '', hash: '' },
    URL: URL,
    URLSearchParams: URLSearchParams,
    document: {
      title: '',
      getElementById: id => elements.get(id) || null,
      querySelectorAll: () => []
    },
    addEventListener() {},
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    CIYA_UI: {
      escapeHtml: v => String(v == null ? '' : v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])),
      icon: name => `<span>${name}</span>`,
      initNav() {},
      copy() {}
    },
    CIYA_STORE: { configured: () => false },
    CIYA_SOUND: { enable() {}, success() {}, beep() {} },
    CIYA_QR_CODE: QRCode
  });
  context.window = context;

  runInContext(readFileSync(join(__dirname, '..', '..', 'apps', 'web', 'shared', 'js', 'data.js'), 'utf8'), context);
  runInContext(readFileSync(join(__dirname, '..', '..', 'apps', 'web', 'modules', 'portal-linterna', 'js', 'qr.js'), 'utf8'), context);

  const mensajesHtml = elements.get('lista-mensajes').innerHTML;
  for (const item of context.CIYA_DATA.mensajesQR) {
    assert.ok(mensajesHtml.includes(`qr.html?id=${item.id}`), `Falta enlace de ${item.id}`);
    assert.ok(mensajesHtml.includes(`Código QR para ${item.titulo}`), `Falta QR de ${item.id}`);
    assert.ok(!mensajesHtml.includes(item.texto.slice(0, 40)), `No debe mostrar el texto previo de ${item.id}`);
  }
  assert.match(mensajesHtml, /<svg class="qr-svg"/);

  const triviasHtml = elements.get('lista-trivias').innerHTML;
  for (const trivia of context.CIYA_DATA.trivias) {
    assert.ok(triviasHtml.includes(`qr.html?id=${trivia.id}`), `Falta enlace de ${trivia.id}`);
    assert.ok(triviasHtml.includes(`Código QR para trivia en ${trivia.ubicacion}`), `Falta QR de ${trivia.id}`);
    assert.ok(!triviasHtml.includes(trivia.pregunta.slice(0, 30)), `No debe mostrar la pregunta previa de ${trivia.id}`);
  }
  assert.match(triviasHtml, /<svg class="qr-svg"/);

  // Ahora simulamos escanear un QR (?id=mensaje-solidario)
  const detailElements = new Map();
  ['qr-root', 'ruta-index', 'ruta-detalle'].forEach(id => {
    detailElements.set(id, {
      id,
      innerHTML: '',
      hidden: false,
      querySelector() { return { textContent: 'Mensaje solidario' }; }
    });
  });
  const detailCtx = createContext({
    window: {},
    location: { href: 'https://jorgetaco.github.io/CIYA-navidad-2026/qr.html?id=mensaje-solidario', search: '?id=mensaje-solidario', hash: '' },
    URL: URL,
    URLSearchParams: URLSearchParams,
    document: {
      title: '',
      getElementById: id => detailElements.get(id) || null,
      querySelectorAll: () => []
    },
    addEventListener() {},
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    CIYA_UI: context.CIYA_UI,
    CIYA_STORE: context.CIYA_STORE,
    CIYA_SOUND: context.CIYA_SOUND,
    CIYA_QR_CODE: QRCode
  });
  detailCtx.window = detailCtx;
  runInContext(readFileSync(join(__dirname, '..', '..', 'apps', 'web', 'shared', 'js', 'data.js'), 'utf8'), detailCtx);
  runInContext(readFileSync(join(__dirname, '..', '..', 'apps', 'web', 'modules', 'portal-linterna', 'js', 'qr.js'), 'utf8'), detailCtx);

  const detailHtml = detailElements.get('ruta-detalle').innerHTML;
  assert.match(detailHtml, /Mensaje solidario/);
  assert.match(detailHtml, /diseñando una sonrisa real/);
});
