(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const Sound = window.CIYA_SOUND;
  const esc = UI.escapeHtml;
  const id = new URLSearchParams(location.search).get('id');

  function link(item) { return 'qr.html?id=' + encodeURIComponent(item.id); }

  function renderIndex() {
    document.getElementById('lista-mensajes').innerHTML = Data.mensajesQR.map(function (m) {
      return '<a class="card card-link" href="' + link(m) + '"><span class="badge">' + esc(m.ubicacion) + '</span><h3 style="margin-top:0.7rem">' + esc(m.titulo) + '</h3><p class="muted">' + esc(m.texto.slice(0, 120)) + '…</p></a>';
    }).join('');
    document.getElementById('lista-trivias').innerHTML = Data.trivias.map(function (t) {
      return '<a class="card card-link" href="' + link(t) + '"><span class="badge">' + esc(t.ubicacion) + '</span><h3 style="margin-top:0.7rem">Trivia relámpago</h3><p class="muted">' + esc(t.pregunta) + '</p></a>';
    }).join('');
    document.getElementById('lista-memes').innerHTML = Data.memes.map(function (m) {
      return '<a class="card card-link" href="' + link(m) + '"><span class="badge">' + esc(m.plantilla) + '</span><p style="margin-top:0.7rem">' + esc(m.texto.replace('|', ' vs. ')) + '</p></a>';
    }).join('');
    document.getElementById('copiar-base').addEventListener('click', function () { UI.copy(location.href.split('?')[0]); });
  }

  function addActions() {
    const bar = document.createElement('div');
    bar.className = 'bottom-actions';
    bar.innerHTML = '<a class="btn small primary" href="index.html#buzon">Ir al Buzón Compilando Deseos 2027</a>' +
      '<a class="btn small" href="index.html?modo=linterna#linterna">Abrir Modo Linterna</a>';
    document.body.appendChild(bar);
  }

  function renderDetail() {
    const mensaje = Data.mensajesQR.find(function (m) { return m.id === id; });
    const trivia = Data.trivias.find(function (t) { return t.id === id; });
    const meme = Data.memes.find(function (m) { return m.id === id; });
    const target = document.getElementById('ruta-detalle');
    document.getElementById('ruta-index').hidden = true;
    target.hidden = false;
    addActions();

    if (mensaje) {
      target.innerHTML = '<div class="hero"><span class="kicker">' + esc(mensaje.ubicacion) + '</span>' +
        '<h2>' + esc(mensaje.titulo) + '</h2><p style="font-size:1.35rem;color:var(--text)">' + esc(mensaje.texto) + '</p>' +
        '<a class="btn ghost" href="qr.html">Ver toda la ruta</a></div>';
    } else if (trivia) {
      target.innerHTML = '<div class="hero"><span class="kicker">' + esc(trivia.ubicacion) + ' · Trivia relámpago</span><h2>' + esc(trivia.pregunta) + '</h2>' +
        '<div id="opciones"></div><div id="resultado-trivia"></div><a class="btn ghost" href="qr.html">Ver toda la ruta</a></div>';
      document.getElementById('opciones').innerHTML = trivia.opciones.map(function (opcion, index) {
        return '<button class="btn trivia-option" data-index="' + index + '">' + String.fromCharCode(65 + index) + ') ' + esc(opcion) + '</button>';
      }).join('');
      document.querySelectorAll('.trivia-option').forEach(function (button) {
        button.addEventListener('click', function () {
          const index = Number(button.dataset.index);
          document.querySelectorAll('.trivia-option').forEach(function (b) { b.classList.remove('correct', 'wrong'); });
          const correcta = index === trivia.correcta;
          button.classList.add(correcta ? 'correct' : 'wrong');
          document.getElementById('resultado-trivia').innerHTML = '<p><strong>' + (correcta ? 'Respuesta correcta. ' : 'Respuesta incorrecta. ') + '</strong>' + esc(correcta ? trivia.remate : 'La respuesta es ' + trivia.opciones[trivia.correcta] + '. ' + trivia.remate) + '</p>';
          if (correcta) Sound.success(); else Sound.beep();
        });
      });
    } else if (meme) {
      const partes = meme.texto.split('|');
      target.innerHTML = '<div class="hero"><span class="kicker">Meme de la ruta</span><h2>' + esc(meme.plantilla) + '</h2>' +
        '<div class="grid cols-2"><div class="card"><p>' + esc(partes[0].trim()) + '</p></div><div class="card"><p>' + esc((partes[1] || '').trim()) + '</p></div></div>' +
        '<a class="btn ghost" href="qr.html" style="margin-top:1rem">Ver toda la ruta</a></div>';
    } else {
      target.innerHTML = '<div class="hero"><h2>Código no encontrado</h2><a class="btn primary" href="qr.html">Volver a la ruta</a></div>';
    }
  }

  function renderGold(secret) {
    document.getElementById('ruta-index').hidden = true;
    const target = document.getElementById('ruta-detalle');
    target.hidden = false;
    target.innerHTML = '<div class="hero gold-view qr-hero"><h1>QR Dorado CIYA 2026</h1>' +
      '<p>El primer estudiante que lo canjee obtiene 3 boletos extra. Presenta esta pantalla activa y tu credencial en recepción antes de las 17:45.</p>' +
      '<p id="gold-status" role="status"></p><div id="gold-code" class="gold-code"></div>' +
      '<button class="btn" id="gold-refresh">Actualizar clave</button></div>';
    addActions();

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

  function init() {
    UI.initNav('qr');
    const secret = new URLSearchParams(location.hash.slice(1)).get('dorado');
    if (secret) renderGold(secret);
    else if (id) renderDetail();
    else renderIndex();
  }

  init();
})();
