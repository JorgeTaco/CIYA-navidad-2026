(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const Sound = window.CIYA_SOUND;
  const esc = UI.escapeHtml;
  const id = new URLSearchParams(location.search).get('id');
  let activeGold;

  function link(item) { return 'qr.html?id=' + encodeURIComponent(item.id); }

  function renderIndex() {
    document.getElementById('ruta-index').hidden = false;
    document.getElementById('ruta-detalle').hidden = true;
    document.title = 'CIYA Navidad 2026 | Ruta de Códigos QR';
    document.getElementById('lista-mensajes').innerHTML = Data.mensajesQR.map(function (m) {
      return '<a class="card card-link" href="' + link(m) + '"><span class="badge">' + esc(m.ubicacion) + '</span><h3 style="margin-top:0.7rem">' + esc(m.titulo) + '</h3><p class="muted">' + esc(m.texto.slice(0, 120)) + '…</p></a>';
    }).join('');
    document.getElementById('lista-trivias').innerHTML = Data.trivias.map(function (t) {
      return '<a class="card card-link" href="' + link(t) + '"><span class="badge">' + esc(t.ubicacion) + '</span><h3 style="margin-top:0.7rem">Trivia relámpago</h3><p class="muted">' + esc(t.pregunta) + '</p></a>';
    }).join('');
    document.getElementById('lista-memes').innerHTML = Data.memes.map(function (m) {
      return '<a class="card card-link" href="' + link(m) + '"><span class="badge">' + esc(m.plantilla) + '</span><p style="margin-top:0.7rem">' + esc(m.texto.replace('|', ' vs. ')) + '</p></a>';
    }).join('');
    document.getElementById('copiar-base').onclick = function () { UI.copy(new URL('qr.html', location.href).href); };
  }

  function renderDetail() {
    const mensaje = Data.mensajesQR.find(function (m) { return m.id === id; });
    const trivia = Data.trivias.find(function (t) { return t.id === id; });
    const meme = Data.memes.find(function (m) { return m.id === id; });
    const target = document.getElementById('ruta-detalle');
    document.getElementById('ruta-index').hidden = true;
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
      target.innerHTML = '<article class="event-hero qr-story"><span class="kicker">Meme de la ruta</span><h1>' + esc(meme.plantilla) + '</h1>' +
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

  UI.initNav('qr');
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
