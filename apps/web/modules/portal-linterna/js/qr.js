(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const Sound = window.CIYA_SOUND;
  const QRCode = window.CIYA_QR_CODE;
  const esc = UI.escapeHtml;
  const id = new URLSearchParams(location.search).get('id');
  let activeGold;

  function link(item) { return 'qr.html?id=' + encodeURIComponent(item.id); }
  function fullLink(item) { return new URL(link(item), location.href).href; }

  function renderQrCard(item, badge, title, qrLabel, hint) {
    const qrMarkup = QRCode
      ? '<div class="qr-code-box">' + QRCode.toSvg(fullLink(item), { label: qrLabel }) +
      '<span class="qr-scan-hint">' + esc(hint) + '</span></div>'
      : '';
    return '<article class="card qr-message-card">' +
      '<div class="qr-card-body"><span class="badge">' + esc(badge) + '</span>' +
      '<h3 style="margin-top:0.7rem">' + esc(title) + '</h3></div>' +
      qrMarkup + '</article>';
  }

  function shell() {
    return `
      <main class="container" id="ruta-index"></main>
      <main class="container narrow" id="ruta-detalle" hidden></main>
      <nav class="container narrow route-shortcuts" aria-label="Actividades del evento">
        <a class="btn primary" href="portal.html?modo=linterna#linterna">Abrir Modo Linterna</a>
        <a class="btn" href="portal.html?modo=buzon" aria-label="Ir al Buzón Compilando Deseos 2027">Ir al Buzón 2027</a>
      </nav>`;
  }

  function renderIndex() {
    const target = document.getElementById('ruta-index');
    const detail = document.getElementById('ruta-detalle');
    target.hidden = false;
    detail.hidden = true;
    document.title = 'CIYA Navidad 2026 | Ruta de Códigos QR';
    target.innerHTML = `
      <nav class="route-back" aria-label="Navegación de actividad">
        <a class="btn ghost" href="portal.html"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg> Volver al portal</a>
      </nav>
      <div class="event-hero route-hero">
        <span class="feature-icon">${UI.icon('qr_code_scanner')}</span>
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
        <p>Escanea uno de los tres QR Dorados impresos en la facultad para ver tu código de canje. El primer estudiante que valide cada hallazgo en Recepción Solidaria gana tres boletos extra.</p>
      </section>
      <section class="section card">
        <h2>Impresión de la ruta</h2>
        <p class="muted">Imprime esta ruta con los códigos QR ya generados y colócalos en los puntos indicados de la facultad.</p>
        <div class="row"><button class="btn" data-print-route>Imprimir listado</button></div>
      </section>`;

    document.getElementById('lista-mensajes').innerHTML = Data.mensajesQR.map(function (m) {
      return renderQrCard(m, m.ubicacion, m.titulo, 'Código QR para ' + m.titulo, 'Escanea con tu teléfono para abrir el mensaje');
    }).join('');
    document.getElementById('lista-trivias').innerHTML = Data.trivias.map(function (t) {
      return renderQrCard(t, t.ubicacion, 'Trivia relámpago', 'Código QR para trivia en ' + t.ubicacion, 'Escanea con tu teléfono para responder la trivia');
    }).join('');
    document.getElementById('lista-memes').innerHTML = Data.memes.map(function (m) {
      return renderQrCard(m, m.ubicacion || 'Meme', m.plantilla, 'Código QR para meme ' + m.plantilla, 'Escanea con tu teléfono para ver el meme');
    }).join('');
    target.querySelector('[data-print-route]').onclick = function () { window.print(); };
  }

  function renderDetail() {
    const mensaje = Data.mensajesQR.find(function (m) { return m.id === id; });
    const trivia = Data.trivias.find(function (t) { return t.id === id; });
    const meme = Data.memes.find(function (m) { return m.id === id; });
    document.getElementById('ruta-index').hidden = true;
    const target = document.getElementById('ruta-detalle');
    target.hidden = false;

    if (/^dorado-[1-3]$/.test(id)) {
      target.innerHTML = '<article class="event-hero qr-story gold-view"><h1>QR Dorados</h1>' +
        '<p>Escanea el QR Dorado impreso en la facultad para obtener el código de canje.</p>' +
        '<a class="btn ghost" href="qr.html#dorados">Ver la Ruta QR</a></article>';
    } else if (mensaje) {
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
      const imageHtml = meme.imagen
        ? '<figure class="qr-meme-media"><img src="' + esc(meme.imagen) + '" alt="' + esc(meme.plantilla) + '"></figure>'
        : '';
      target.innerHTML = '<article class="event-hero qr-story">' +
        imageHtml +
        '<a class="btn ghost" href="qr.html">Ver toda la ruta</a></article>';
    } else {
      target.innerHTML = '<article class="event-hero qr-story"><h1>Código no encontrado</h1><a class="btn primary" href="qr.html">Volver a la ruta</a></article>';
    }
    const heading = target.querySelector('h1');
    document.title = (heading ? heading.textContent : (meme ? meme.plantilla : 'Ruta QR')) + ' | CIYA Navidad 2026';
  }

  function renderGold(secret) {
    document.getElementById('ruta-index').hidden = true;
    const target = document.getElementById('ruta-detalle');
    target.hidden = false;
    target.innerHTML = `
      <article class="event-hero qr-story gold-view">
        <h1 id="gold-title">QR Dorado CIYA 2026</h1>
        <p id="gold-status" role="status"></p>
        <div id="gold-reward" hidden>
          <p class="qr-message">Acabas de desbloquear un premio instantáneo y +3 boletos extra para la Gran Ruleta Digital.</p>
          <div class="gold-credential">
            <span>Código de canje</span>
            <code class="gold-code" id="gold-code"></code>
          </div>
          <p><strong>¿Qué debes hacer?</strong> Toma una captura de pantalla ahora mismo y preséntate en la Mesa de Recepción Solidaria mientras el registro siga abierto. El canje es válido únicamente para el primer estudiante que lo complete.</p>
        </div>
        <button class="btn" id="gold-refresh" type="button" hidden>Reintentar</button>
        <a class="btn ghost" href="qr.html#dorados">Ver la Ruta QR</a>
      </article>`;
    document.title = 'QR Dorado | CIYA Navidad 2026';

    const button = document.getElementById('gold-refresh');
    const status = document.getElementById('gold-status');
    const title = document.getElementById('gold-title');
    const reward = document.getElementById('gold-reward');
    const code = document.getElementById('gold-code');
    if (!Store.configured()) {
      status.textContent = 'La clave de canje no está disponible en este momento.';
      return;
    }
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(secret)) {
      status.textContent = 'Código no válido.';
      return;
    }
    async function loadGold() {
      button.hidden = true;
      status.textContent = 'Consultando disponibilidad…';
      try {
        const result = await Store.gold(secret);
        const labels = {
          invalid: 'Código no válido.', claimed: 'Este QR Dorado ya fue canjeado.',
          scanned: 'Este QR Dorado solo se puede escanear una vez. Ya no está disponible para canje.',
          closed: 'Recepción ya selló los registros de canje.'
        };
        if (labels[result.status]) {
          status.textContent = labels[result.status];
          return;
        }
        if (result.status !== 'available' || !/^CIYA-ORO-0[1-3]$/.test(result.code)) {
          throw new Error('La clave de canje no está disponible en este momento.');
        }
        title.textContent = '¡BINGO! ENCONTRASTE UN QR DORADO CIYA 2026';
        code.textContent = result.code;
        status.hidden = true;
        reward.hidden = false;
      } catch (error) {
        status.textContent = error.message;
        button.hidden = false;
      }
    }
    button.addEventListener('click', loadGold);
    loadGold();
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
