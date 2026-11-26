(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const Sound = window.CIYA_SOUND;
  const esc = UI.escapeHtml;
  const id = new URLSearchParams(location.search).get('id');
  let activeGold;

  function link(item) { return 'qr.html?id=' + encodeURIComponent(item.id); }

  function shell() {
    return `
      <main class="container" id="ruta-index"></main>
      <main class="container narrow" id="ruta-detalle" hidden></main>
      <nav class="bottom-actions" aria-label="Actividades del evento">
        <a class="btn primary" href="index.html?modo=linterna#linterna">Abrir Modo Linterna</a>
        <a class="btn" href="index.html#buzon" aria-label="Ir al Buzón Compilando Deseos 2027">Ir al Buzón 2027</a>
      </nav>`;
  }

  function renderIndex() {
    const target = document.getElementById('ruta-index');
    const detail = document.getElementById('ruta-detalle');
    target.hidden = false;
    detail.hidden = true;
    document.title = 'CIYA Navidad 2026 | Ruta de Códigos QR';
    target.innerHTML = `
      <div class="event-hero route-hero">
        <h1>Ruta de Códigos QR</h1>
        <p>Explora los pasillos, las gradas y los laboratorios de CIYA. Hay tres QR Dorados ocultos en la facultad.</p>
        <nav class="section-links" aria-label="Contenido de la ruta">
          <a href="#mensajes">Mensajes</a>
          <a href="#trivias">Trivias</a>
          <a href="#memes">Memes</a>
          <a href="#dorados">QR Dorados</a>
        </nav>
      </div>
      <section class="section" id="mensajes">
        <h2>Mensajes navideños</h2>
        <div class="grid auto" id="lista-mensajes"></div>
      </section>
      <section class="section" id="trivias">
        <h2>Trivias relámpago</h2>
        <div class="grid auto" id="lista-trivias"></div>
      </section>
      <section class="section" id="memes">
        <h2>Memes de la Ruta QR</h2>
        <div class="grid auto" id="lista-memes"></div>
      </section>
      <section class="section card" id="dorados">
        <h2>QR Dorados</h2>
        <p>El primer estudiante que canjee cada QR Dorado gana tres boletos extra. Muestra la pantalla activa y tu credencial estudiantil en recepción antes de las 17:45.</p>
      </section>
      <section class="section card">
        <h2>Impresión de la ruta</h2>
        <p class="muted">Genera los impresos públicos con el enlace de cada tarjeta (<code>qr.html?id=…</code>) y colócalos en los puntos sugeridos.</p>
        <div class="row"><button class="btn" data-print-route>Imprimir listado</button><button class="btn ghost" id="copiar-base">Copiar URL base de la ruta</button></div>
      </section>`;

    document.getElementById('lista-mensajes').innerHTML = Data.mensajesQR.map(function (m) {
      return '<a class="card card-link" href="' + link(m) + '"><span class="badge">' + esc(m.ubicacion) + '</span><h3 style="margin-top:0.7rem">' + esc(m.titulo) + '</h3><p class="muted">' + esc(m.texto.slice(0, 120)) + '…</p></a>';
    }).join('');
    document.getElementById('lista-trivias').innerHTML = Data.trivias.map(function (t) {
      return '<a class="card card-link" href="' + link(t) + '"><span class="badge">' + esc(t.ubicacion) + '</span><h3 style="margin-top:0.7rem">Trivia relámpago</h3><p class="muted">' + esc(t.pregunta) + '</p></a>';
    }).join('');
    document.getElementById('lista-memes').innerHTML = Data.memes.map(function (m) {
      return '<a class="card card-link" href="' + link(m) + '"><span class="badge">' + esc(m.ubicacion) + '</span><p style="margin-top:0.7rem">' + esc(m.texto.replace('|', ' vs. ')) + '</p></a>';
    }).join('');
    target.querySelector('[data-print-route]').onclick = function () { window.print(); };
    document.getElementById('copiar-base').onclick = function () { UI.copy(new URL('qr.html', location.href).href); };
  }

  function renderDetail() {
    const mensaje = Data.mensajesQR.find(function (m) { return m.id === id; });
    const trivia = Data.trivias.find(function (t) { return t.id === id; });
    const meme = Data.memes.find(function (m) { return m.id === id; });
    document.getElementById('ruta-index').hidden = true;
    const target = document.getElementById('ruta-detalle');
    target.hidden = false;

    if (mensaje) {
      target.innerHTML = '<article class="event-hero qr-story"><span class="kicker">' + esc(mensaje.ubicacion) + '</span>' +
        '<h1>' + esc(mensaje.titulo) + '</h1><p class="qr-message">' + esc(mensaje.texto) + '</p>' +
        '<a class="btn ghost" href="qr.html">Ver toda la ruta</a></article>';
    } else if (trivia) {
      target.innerHTML = '<article class="event-hero qr-story"><span class="kicker">' + esc(trivia.ubicacion) + ' · Trivia relámpago</span><h1>' + esc(trivia.pregunta) + '</h1>' +
        '<div id="opciones"></div><div id="resultado-trivia" role="status"></div><a class="btn ghost" href="qr.html">Ver toda la ruta</a></article>';
      document.getElementById('opciones').innerHTML = trivia.opciones.map(function (opcion, index) {
        return '<button class="btn trivia-option" aria-pressed="false" data-index="' + index + '"><span>' + String.fromCharCode(65 + index) + '</span>' + esc(opcion) + '</button>';
      }).join('');
      document.querySelectorAll('.trivia-option').forEach(function (button) {
        button.addEventListener('click', function () {
          const index = Number(button.dataset.index);
          document.querySelectorAll('.trivia-option').forEach(function (option) {
            option.classList.remove('correct', 'wrong');
            option.setAttribute('aria-pressed', option === button);
          });
          const correcta = index === trivia.correcta;
          button.classList.add(correcta ? 'correct' : 'wrong');
          document.getElementById('resultado-trivia').innerHTML = '<p><strong>' + (correcta ? 'Respuesta correcta. ' : 'Respuesta incorrecta. ') + '</strong>' + esc(correcta ? trivia.remate : 'La respuesta es ' + trivia.opciones[trivia.correcta] + '. ' + trivia.remate) + '</p>';
          Sound.enable();
          if (correcta) Sound.success(); else Sound.beep();
        });
      });
    } else if (meme) {
      const panels = meme.texto.split('|').map(function (part) {
        return '<div class="card"><p>' + esc(part.trim()) + '</p></div>';
      });
      target.innerHTML = '<article class="event-hero qr-story"><h1>' + esc(meme.plantilla) + '</h1>' +
        '<div class="grid' + (panels.length > 1 ? ' cols-2' : '') + '">' + panels.join('') + '</div>' +
        '<a class="btn ghost" href="qr.html">Ver toda la ruta</a></article>';
    } else {
      target.innerHTML = '<article class="event-hero qr-story"><h1>Código no encontrado</h1><a class="btn primary" href="qr.html">Volver a la ruta</a></article>';
    }
    document.title = target.querySelector('h1').textContent + ' | CIYA Navidad 2026';
  }

  function renderGold(secret) {
    document.getElementById('ruta-index').hidden = true;
    const target = document.getElementById('ruta-detalle');
    target.hidden = false;
    target.innerHTML = '<article class="event-hero qr-story gold-view"><h1>QR Dorado CIYA 2026</h1>' +
      '<p>El primer estudiante que lo canjee obtiene 3 boletos extra. Presenta esta pantalla activa y tu credencial en recepción antes de las 17:45.</p>' +
      '<p id="gold-status" role="status"></p><div id="gold-code" class="gold-code"></div>' +
      '<button class="btn" id="gold-refresh">Actualizar clave</button></article>';
    document.title = 'QR Dorado | CIYA Navidad 2026';

    const button = document.getElementById('gold-refresh');
    const status = document.getElementById('gold-status');
    const code = document.getElementById('gold-code');
    let expiryTimer;
    async function refresh() {
      clearTimeout(expiryTimer);
      code.textContent = '';
      status.textContent = 'Consultando disponibilidad…';
      button.disabled = true;
      try {
        if (!/^[a-f0-9-]{36}$/i.test(secret)) throw new Error('Código no válido.');
        const result = await Store.gold(secret);
        const labels = { invalid: 'Código no válido.', claimed: 'Este QR Dorado ya fue canjeado.',
          closed: 'Canjes disponibles el 4 de diciembre de 08:00 a 17:45.' };
        status.textContent = labels[result.status] || 'Clave válida durante dos minutos.';
        if (result.status === 'available') {
          code.textContent = result.code;
          expiryTimer = setTimeout(function () {
            code.textContent = '';
            status.textContent = 'Clave vencida. Actualízala al llegar a recepción.';
          }, result.seconds * 1000);
        }
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    }
    button.addEventListener('click', refresh);
    refresh();
  }

  function renderRoute() {
    const secret = new URLSearchParams(location.hash.slice(1)).get('dorado');
    if (secret === activeGold) return;
    activeGold = secret;
    if (secret) renderGold(secret);
    else if (id) renderDetail();
    else renderIndex();
  }

  function mount() {
    document.getElementById('qr-root').innerHTML = shell();
  }

  mount();
  UI.initNav('qr');
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
