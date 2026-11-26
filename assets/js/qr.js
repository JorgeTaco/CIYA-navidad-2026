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
    document.getElementById('lista-dorados').innerHTML = Data.dorados.map(function (d) {
      return '<a class="card card-link gold-view" href="' + link(d) + '"><span class="badge warn">Premio instantáneo</span><h3 style="margin-top:0.7rem">' + d.codigo + '</h3><p class="muted">' + esc(d.pista) + '</p></a>';
    }).join('');
    document.getElementById('copiar-base').addEventListener('click', function () { UI.copy(location.href.split('?')[0]); });
  }

  function addActions() {
    const bar = document.createElement('div');
    bar.className = 'bottom-actions';
    bar.innerHTML = '<a class="btn small primary" href="index.html#buzon">Ir al Buzón Compilando Deseos 2027</a>' +
      '<a class="btn small" href="index.html#linterna">Abrir Modo Linterna</a>';
    document.body.appendChild(bar);
  }

  function renderDetail() {
    const mensaje = Data.mensajesQR.find(function (m) { return m.id === id; });
    const trivia = Data.trivias.find(function (t) { return t.id === id; });
    const meme = Data.memes.find(function (m) { return m.id === id; });
    const dorado = Data.dorados.find(function (d) { return d.id === id; });
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
          document.getElementById('resultado-trivia').innerHTML = '<p><strong>' + (correcta ? 'Respuesta correcta. ' : 'Respuesta incorrecta. ') + '</strong>' + esc(trivia.remate) + '</p>';
          if (correcta) Sound.success(); else Sound.beep();
        });
      });
    } else if (meme) {
      const partes = meme.texto.split('|');
      target.innerHTML = '<div class="hero"><span class="kicker">Meme de la ruta</span><h2>' + esc(meme.plantilla) + '</h2>' +
        '<div class="grid cols-2"><div class="card"><p>' + esc(partes[0].trim()) + '</p></div><div class="card"><p>' + esc((partes[1] || '').trim()) + '</p></div></div>' +
        '<a class="btn ghost" href="qr.html" style="margin-top:1rem">Ver toda la ruta</a></div>';
    } else if (dorado) {
      const claim = Store.get().qrClaims.find(function (q) { return q.codigo === dorado.codigo; });
      target.innerHTML = '<div class="hero gold-view qr-hero"><span class="kicker">¡Bingo! Encontraste un QR Dorado CIYA 2026</span>' +
        '<h2>Premio instantáneo</h2><p>Acabas de desbloquear <strong>+3 boletos extra</strong> para la Gran Ruleta Digital de hoy.</p>' +
        '<div class="gold-code">' + dorado.codigo + '</div>' +
        '<p style="margin-top:1rem">Toma una captura de pantalla ahora mismo y preséntate en la Mesa de Recepción Solidaria <strong>antes de las 17:45</strong> para validar tu hallazgo. Válido únicamente para el primer estudiante en canjearlo.</p>' +
        '<span class="badge ' + (claim ? 'bad' : 'ok') + '">' + (claim ? 'Canjeado' : 'Disponible') + '</span>' +
        '<div style="margin-top:1rem"><a class="btn ghost" href="qr.html">Ver toda la ruta</a></div></div>';
    } else {
      target.innerHTML = '<div class="hero"><h2>Código no encontrado</h2><a class="btn primary" href="qr.html">Volver a la ruta</a></div>';
    }
  }

  async function init() {
    await Store.init();
    UI.initNav('qr');
    if (id) renderDetail(); else renderIndex();
  }

  init();
})();
