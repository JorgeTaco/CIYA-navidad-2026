(function () {
  const Store = window.CIYA_STORE;

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
    item.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
    item.textContent = message;
    box.appendChild(item);
    setTimeout(function () { item.classList.add('leaving'); }, 3200);
    setTimeout(function () { item.remove(); }, 3700);
  }

  async function requireAccount(scope, title) {
    if (Store.hasSession()) {
      try { await Store.authorize(scope); return true; } catch {}
    }
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'pin-overlay';
      overlay.innerHTML =
        '<div class="pin-card"><h2>' + escapeHtml(title) + '</h2>' +
        '<form><label for="auth-email">Correo de organización</label>' +
        '<input id="auth-email" type="email" autocomplete="username" required>' +
        '<label for="auth-password">Contraseña</label>' +
        '<input id="auth-password" type="password" autocomplete="current-password" required>' +
        '<p class="pin-error" role="alert" hidden></p>' +
        '<div class="row"><button class="btn primary" type="submit">Entrar</button>' +
        '<button class="btn ghost" type="button" data-cancel>Cancelar</button></div></form></div>';
      document.body.appendChild(overlay);
      const form = overlay.querySelector('form');
      const button = form.querySelector('[type=submit]');
      form.querySelector('#auth-email').focus();
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        button.disabled = true;
        try {
          await Store.login(form.querySelector('#auth-email').value, form.querySelector('#auth-password').value, scope);
          overlay.remove();
          resolve(true);
        } catch (failure) {
          const error = form.querySelector('.pin-error');
          error.textContent = failure.message;
          error.hidden = false;
          button.disabled = false;
        }
      });
      overlay.querySelector('[data-cancel]').addEventListener('click', function () {
        overlay.remove();
        resolve(false);
      });
    });
  }

  async function logout() {
    await Store.logout();
    location.reload();
  }

  async function submit(event, action, payload, privateCall, onSuccess) {
    event.preventDefault();
    const button = event.submitter || event.currentTarget.querySelector('[type=submit]');
    if (button) button.disabled = true;
    try {
      const result = await Store.action(action, payload, privateCall);
      if (onSuccess) onSuccess(result);
    } catch (error) {
      toast(error.message, 'bad');
    } finally {
      if (button) button.disabled = false;
    }
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

  function dateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Guayaquil' });
  }

  function initNav(active) {
    const links = document.querySelectorAll('[data-nav]');
    links.forEach(function (link) {
      if (link.dataset.nav === active) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
    const menu = document.querySelector('.site-menu');
    if (menu) {
      menu.addEventListener('click', function (event) {
        if (event.target.closest('a')) menu.open = false;
      });
      document.addEventListener('click', function (event) {
        if (menu.open && !menu.contains(event.target)) menu.open = false;
      });
      document.addEventListener('keydown', function (event) {
        if (menu.open && event.key === 'Escape') {
          menu.open = false;
          menu.querySelector('summary').focus();
        }
      });
    }
    const status = document.getElementById('sync-status');
    if (status) {
      const paint = function () {
        const remote = window.CIYA_STORE.isRemote();
        status.textContent = remote ? 'Sincronización activa' : Store.configured() ? 'Sin sincronización' : 'Sin configurar';
        status.classList.toggle('online', remote);
      };
      paint();
      setInterval(paint, 2000);
    }
  }

  function table(headers, rows, stacked = false) {
    if (!rows.length) return '<p class="empty">Sin registros todavía.</p>';
    const layout = stacked ? ' table-stack' : '';
    return '<div class="table-wrap' + layout + '"><table role="table"><thead role="rowgroup"><tr role="row">' + headers.map(function (h) {
      return '<th scope="col">' + escapeHtml(h) + '</th>';
    }).join('') + '</tr></thead><tbody role="rowgroup">' + rows.map(function (row) {
      return '<tr role="row">' + row.map(function (cell, index) {
        const label = stacked ? '<span class="table-label" aria-hidden="true">' + escapeHtml(headers[index]) + '</span>' : '';
        return '<td role="cell">' + label + '<span>' + cell + '</span></td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
  }

  function csv(rows) {
    return '\ufeff' + rows.map(function (row) {
      return row.map(function (value) {
        let cell = String(value ?? '');
        if (/^\s*[=+@-]/.test(cell) || /^[\r\n\t]/.test(cell)) cell = "'" + cell;
        return '"' + cell.replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
  }

  function renderRanking(id, rows) {
    const best = Math.max(1, ...rows.map(function (row) { return row.puntos; }));
    document.getElementById(id).innerHTML = rows.map(function (row) {
      return '<div class="ranking-row"><div class="ranking-head"><strong>' + row.puesto + '. ' +
        escapeHtml(row.nombre) + '</strong><span>' + row.puntos + ' pts</span></div>' +
        '<div class="bar"><span style="width:' + Math.round(row.puntos / best * 100) + '%;--bar-color:' +
        window.CIYA_STORE.carrera(row.id).color + '"></span></div><small>' + row.juguetes + ' juguetes · ' +
        row.caramelos + ' fundas · ' + row.total + ' artículos · ' + row.donantes + ' donantes únicos</small></div>';
    }).join('');
  }

  window.CIYA_UI = {
    escapeHtml: escapeHtml,
    toast: toast,
    requireAccount: requireAccount,
    submit: submit,
    logout: logout,
    download: download,
    copy: copy,
    dateTime: dateTime,
    initNav: initNav,
    csv: csv,
    renderRanking: renderRanking,
    table: table
  };
})();
