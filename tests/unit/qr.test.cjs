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

  ['qr-root', 'ruta-index', 'ruta-detalle', 'lista-mensajes', 'lista-trivias', 'lista-memes']
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

  const index = elements.get('ruta-index').innerHTML;
  assert.match(index, /QR Dorados impresos en la facultad/);
  assert.doesNotMatch(index, /CIYA-ORO-0[1-3]|lista-dorados|reset-dorados/);
  assert.doesNotMatch(index.match(/<section[^>]+id="dorados">[\s\S]*?<\/section>/)[0], /<svg|de prueba/i);

  const mensajesHtml = elements.get('lista-mensajes').innerHTML;
  for (const item of context.CIYA_DATA.mensajesQR) {
    assert.ok(!mensajesHtml.includes(`href="qr.html?id=${item.id}"`), `No debe ser clickable ${item.id}`);
    assert.ok(mensajesHtml.includes(`Código QR para ${item.titulo}`), `Falta QR de ${item.id}`);
    assert.ok(!mensajesHtml.includes(item.texto.slice(0, 40)), `No debe mostrar el texto previo de ${item.id}`);
  }
  assert.match(mensajesHtml, /<svg class="qr-svg"/);

  const triviasHtml = elements.get('lista-trivias').innerHTML;
  for (const trivia of context.CIYA_DATA.trivias) {
    assert.ok(!triviasHtml.includes(`href="qr.html?id=${trivia.id}"`), `No debe ser clickable ${trivia.id}`);
    assert.ok(triviasHtml.includes(`Código QR para trivia en ${trivia.ubicacion}`), `Falta QR de ${trivia.id}`);
    assert.ok(!triviasHtml.includes(trivia.pregunta.slice(0, 30)), `No debe mostrar la pregunta previa de ${trivia.id}`);
  }
  assert.match(triviasHtml, /<svg class="qr-svg"/);

  const memesHtml = elements.get('lista-memes').innerHTML;
  for (const meme of context.CIYA_DATA.memes) {
    assert.ok(!memesHtml.includes(`href="qr.html?id=${meme.id}"`), `No debe ser clickable ${meme.id}`);
    assert.ok(memesHtml.includes(`Código QR para meme ${meme.plantilla}`), `Falta QR de ${meme.id}`);
    assert.ok(!memesHtml.includes(meme.texto.slice(0, 30)), `No debe mostrar el texto previo de ${meme.id}`);
  }
  assert.match(memesHtml, /<svg class="qr-svg"/);

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

  // Simulamos abrir un meme (?id=meme-cheems)
  const memeElements = new Map();
  ['qr-root', 'ruta-index', 'ruta-detalle'].forEach(id => {
    memeElements.set(id, {
      id,
      innerHTML: '',
      hidden: false,
      querySelector() { return null; }
    });
  });
  const memeCtx = createContext({
    window: {},
    location: { href: 'https://jorgetaco.github.io/CIYA-navidad-2026/qr.html?id=meme-cheems', search: '?id=meme-cheems', hash: '' },
    URL: URL,
    URLSearchParams: URLSearchParams,
    document: {
      title: '',
      getElementById: id => memeElements.get(id) || null,
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
  memeCtx.window = memeCtx;
  runInContext(readFileSync(join(__dirname, '..', '..', 'apps', 'web', 'shared', 'js', 'data.js'), 'utf8'), memeCtx);
  runInContext(readFileSync(join(__dirname, '..', '..', 'apps', 'web', 'modules', 'portal-linterna', 'js', 'qr.js'), 'utf8'), memeCtx);

  const memeDetailHtml = memeElements.get('ruta-detalle').innerHTML;
  assert.match(memeDetailHtml, /modules\/portal-linterna\/media\/memes\/perro_cheems\.png/);
  assert.doesNotMatch(memeDetailHtml, /<h1>/);
  assert.doesNotMatch(memeDetailHtml, /Ingeniero diseñando el mecanismo/);
});

test('QR Dorados: muestran el mensaje y el código oficial por separado mientras están disponibles', async () => {
  const secret = '12345678-1234-4234-8234-1234567890ab';
  const hash = '#dorado=' + secret;
  const dataFile = join(__dirname, '../../apps/web/shared/js/data.js');
  const qrFile = join(__dirname, '../../apps/web/modules/portal-linterna/js/qr.js');

  async function runQr(result, search = '', fragment = hash) {
    const ids = ['qr-root', 'ruta-index', 'ruta-detalle', 'gold-title', 'gold-status',
      'gold-reward', 'gold-code', 'gold-refresh'];
    const elements = new Map(ids.map(id => [id, {
      innerHTML: '',
      textContent: '',
      hidden: id === 'gold-reward',
      querySelector() { return null; },
      addEventListener() {}
    }]));
    const requests = [];
    const context = createContext({
      location: {
        href: 'https://example.test/qr.html' + search + fragment,
        search,
        hash: fragment
      },
      URL, URLSearchParams,
      document: { getElementById: id => elements.get(id) },
      addEventListener() {},
      CIYA_UI: { escapeHtml: String, initNav() {} },
      CIYA_STORE: {
        configured: () => true,
        async gold(value) {
          requests.push(value);
          return result;
        }
      }
    });
    context.window = context;
    runInContext(readFileSync(dataFile, 'utf8'), context);
    runInContext(readFileSync(qrFile, 'utf8'), context);
    await new Promise(resolve => setImmediate(resolve));
    return { elements, requests };
  }

  for (const slot of [1, 2, 3]) {
    const code = 'CIYA-ORO-0' + slot;
    const { elements, requests } = await runQr({ status: 'available', code });
    assert.deepEqual(requests, [secret]);
    assert.equal(elements.get('gold-title').textContent, '¡BINGO! ENCONTRASTE UN QR DORADO CIYA 2026');
    assert.equal(elements.get('gold-code').textContent, code);
    assert.equal(elements.get('gold-status').hidden, true);
    assert.equal(elements.get('gold-reward').hidden, false);
    const html = elements.get('ruta-detalle').innerHTML;
    assert.match(html, /<code class="gold-code" id="gold-code"><\/code>/);
    assert.match(html, /premio instantáneo y \+3 boletos extra/);
    assert.match(html, /Toma una captura de pantalla ahora mismo y preséntate en la Mesa de Recepción Solidaria mientras el registro siga abierto/);
    assert.match(html, /válido únicamente para el primer estudiante que lo complete/);
    assert.doesNotMatch(html, /17:45|de hoy/);
  }

  for (const [status, message] of [
    ['invalid', 'Código no válido.'],
    ['claimed', 'Este QR Dorado ya fue canjeado.'],
    ['scanned', 'Este QR Dorado solo se puede escanear una vez. Ya no está disponible para canje.'],
    ['closed', 'Recepción ya selló los registros de canje.']
  ]) {
    const { elements } = await runQr({ status });
    assert.equal(elements.get('gold-code').textContent, '');
    assert.equal(elements.get('gold-reward').hidden, true);
    assert.equal(elements.get('gold-status').textContent, message);
  }

  const legacy = await runQr(null, '?id=dorado-1', '');
  assert.deepEqual(legacy.requests, []);
  assert.match(legacy.elements.get('ruta-detalle').innerHTML, /Escanea el QR Dorado impreso/);
  assert.doesNotMatch(legacy.elements.get('ruta-detalle').innerHTML, /CIYA-ORO-01|gold-code|de prueba/i);
});
