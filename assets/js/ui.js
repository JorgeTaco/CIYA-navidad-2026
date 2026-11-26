(function () {
  const CFG = window.CIYA_CONFIG;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  function toast(message, kind) {
    let box = document.getElementById('ciya-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ciya-toast';
      box.className = 'toast-box';
      document.body.appendChild(box);
    }
    const item = document.createElement('div');
    item.className = 'toast-item ' + (kind || 'ok');
    item.textContent = message;
    box.appendChild(item);
    setTimeout(function () { item.classList.add('leaving'); }, 3200);
    setTimeout(function () { item.remove(); }, 3700);
  }

  function isUnlocked(scope) {
    return sessionStorage.getItem('ciya2026:auth:' + scope) === 'ok';
  }

  function pinGate(scope, title) {
    if (isUnlocked(scope)) return Promise.resolve(true);
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'pin-overlay';
      overlay.innerHTML =
        '<div class="pin-card">' +
        '<h2>' + escapeHtml(title || 'Acceso restringido') + '</h2>' +
        '<p>Ingresa el PIN del equipo organizador para continuar.</p>' +
        '<form><label for="pin-input">PIN de acceso</label>' +
        '<input id="pin-input" type="password" inputmode="numeric" autocomplete="off" required>' +
        '<p class="pin-error" hidden>El PIN no es correcto.</p>' +
        '<div class="row"><button class="btn primary" type="submit">Entrar</button>' +
        '<button class="btn ghost" type="button" data-cancel>Cancelar</button></div></form></div>';
      document.body.appendChild(overlay);
      const input = overlay.querySelector('#pin-input');
      const error = overlay.querySelector('.pin-error');
      input.focus();
      overlay.querySelector('form').addEventListener('submit', function (event) {
        event.preventDefault();
        if (input.value === CFG.adminPin) {
          sessionStorage.setItem('ciya2026:auth:' + scope, 'ok');
          overlay.remove();
          resolve(true);
        } else {
          error.hidden = false;
          input.value = '';
          input.focus();
        }
      });
      overlay.querySelector('[data-cancel]').addEventListener('click', function () {
        overlay.remove();
        resolve(false);
      });
    });
  }

  function logout(scope) {
    sessionStorage.removeItem('ciya2026:auth:' + scope);
    location.reload();
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copiado al portapapeles');
    } catch (error) {
      const input = document.createElement('textarea');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      toast('Copiado al portapapeles');
    }
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function dateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
  }

  function initNav(active) {
    const links = document.querySelectorAll('[data-nav]');
    links.forEach(function (link) {
      if (link.dataset.nav === active) link.classList.add('active');
    });
    const status = document.getElementById('sync-status');
    if (status) {
      const paint = function () {
        const remote = window.CIYA_STORE.isRemote();
        status.textContent = remote ? 'Sincronización activa' : 'Modo local';
        status.classList.toggle('online', remote);
      };
      paint();
      setInterval(paint, 2000);
    }
  }

  function table(headers, rows) {
    if (!rows.length) return '<p class="empty">Sin registros todavía.</p>';
    return '<div class="table-wrap"><table><thead><tr>' + headers.map(function (h) {
      return '<th>' + escapeHtml(h) + '</th>';
    }).join('') + '</tr></thead><tbody>' + rows.map(function (row) {
      return '<tr>' + row.map(function (cell) { return '<td>' + cell + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
  }

  window.CIYA_UI = {
    escapeHtml: escapeHtml,
    toast: toast,
    pinGate: pinGate,
    isUnlocked: isUnlocked,
    logout: logout,
    download: download,
    copy: copy,
    uid: uid,
    dateTime: dateTime,
    initNav: initNav,
    table: table
  };
})();
