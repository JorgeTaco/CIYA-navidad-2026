(function () {
  const Store = window.CIYA_STORE;
  const PANELS = {
    asistente: {
      id: 'portal',
      label: 'Portal',
      shortLabel: 'Portal',
      href: 'portal.html',
      actor: 'Estudiantes y Docentes (Asistentes)',
      description: 'Mar de Linternas, inscripción de villancicos, Buzón 2027 y Ruta QR.'
    },
    recepcion: {
      id: 'recepcion',
      label: 'Recepción',
      shortLabel: 'Recepción',
      href: 'recepcion.html',
      actor: 'Equipo de Recepción (Industrial)',
      description: 'Acreditación presencial, donaciones por carrera, canje de QR Dorados y cierre de recepción.'
    },
    escenario: {
      id: 'escenario',
      label: 'Escenario',
      shortLabel: 'Escenario',
      href: 'escenario.html',
      actor: 'Producción / Escenario (Sistemas y Software)',
      description: 'Ranking en vivo, concurso de villancicos, Encendido 5 en 1 (local/offline) y Gran Ruleta Digital.'
    },
    admin: {
      id: 'admin',
      label: 'Administración',
      shortLabel: 'Administración',
      href: 'admin.html',
      actor: 'Docentes Organizadores y Asociación (Curadores)',
      description: 'Moderación y exportación de Deseos 2027, puertas decoradas, puntajes y QR Dorados.'
    }
  };
  let lastNavActive = '';
  let lastNavOptions = null;

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
      try {
        await Store.authorize(scope);
        await Store.myRoles().catch(function () {});
        initNav(lastNavActive || scope, lastNavOptions);
        return true;
      } catch {
        const info = await Store.myRoles().catch(function () { return null; });
        if (info && info.roles.length) {
          return showRoleRestricted(title, info);
        }
        await Store.logout();
      }
    } else if (typeof Store.sessionRoles === 'function' && Store.sessionRoles().includes('asistente')) {
      return showRoleRestricted(title, { email: 'Estudiante / Docente', roles: ['asistente'] });
    }
    return promptLogin(scope, title);
  }

  function showRoleRestricted(title, info) {
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'pin-overlay';
      const allowedLinks = info.roles.map(function (role) {
        const panel = PANELS[role];
        return panel ? '<a class="btn primary" href="' + panel.href + '">Ir a ' + escapeHtml(panel.label) + '</a>' : '';
      }).join('');
      overlay.innerHTML =
        '<div class="pin-card"><h2>Acceso restringido por rol</h2>' +
        '<p class="muted">La sesión actual (<strong>' + escapeHtml(info.email || 'usuario') + '</strong>) no tiene permiso para <strong>' + escapeHtml(title) + '</strong>.</p>' +
        '<div class="row">' + allowedLinks + '</div>' +
        '<div class="row" style="margin-top:0.8rem"><button class="btn ghost" type="button" data-switch>Cambiar de cuenta</button>' +
        '<button class="btn ghost" type="button" data-cancel>Cerrar</button></div></div>';
      document.body.appendChild(overlay);
      overlay.querySelector('[data-switch]').addEventListener('click', async function () {
        overlay.remove();
        await Store.logout();
        initNav(lastNavActive, lastNavOptions);
        resolve(await promptLogin(lastNavActive, title));
      });
      overlay.querySelector('[data-cancel]').addEventListener('click', function () {
        overlay.remove();
        resolve(false);
      });
    });
  }

  function promptLogin(scope, title) {
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'pin-overlay';
      const demoHint = !Store.configured()
        ? '<p class="hint">Modo demo local: usa <code>' + escapeHtml(scope) + '@ciya.local</code> (clave <code>ciya2026</code>).</p>'
        : '';
      overlay.innerHTML =
        '<div class="pin-card"><h2>' + escapeHtml(title) + '</h2>' +
        '<form><label for="auth-email">Correo de organización</label>' +
        '<input id="auth-email" type="email" autocomplete="username" required>' +
        '<label for="auth-password">Contraseña</label>' +
        '<input id="auth-password" type="password" autocomplete="current-password" required>' +
        demoHint +
        '<p class="pin-error" role="alert" hidden></p>' +
        '<div class="row"><button class="btn primary" type="submit">Entrar</button>' +
        '<button class="btn ghost" type="button" data-cancel>Cancelar</button></div>' +
        '<p class="hint" style="margin-top:0.8rem"><a href="index.html">Volver al inicio de sesión principal</a></p></form></div>';
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
          initNav(lastNavActive || scope, lastNavOptions);
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
    location.replace('index.html');
  }

  let navListenersBound = false;
  let syncPaintTimer = null;

  async function submit(event, action, payload, privateCall, onSuccess) {
    event.preventDefault();
    const target = event.currentTarget;
    const button = event.submitter || (target && target.tagName === 'BUTTON'
      ? target
      : target && target.querySelector && target.querySelector('[type=submit]'));
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

  function buildNavLinks(roles, active, isLocal) {
    if (isLocal) {
      return '<a href="escenario.html" data-nav="escenario">Escenario</a>';
    }
    if (!roles.length) {
      if (active === 'acceso') return '<a href="bases.html" data-nav="bases">Bases oficiales</a>';
      return '<a href="index.html" data-nav="acceso">Iniciar sesión</a><a href="bases.html" data-nav="bases">Bases oficiales</a>';
    }
    const items = [];
    if (roles.includes('asistente')) {
      items.push('<a href="portal.html" data-nav="portal">Portal</a>');
      items.push('<a href="qr.html" data-nav="qr">Ruta QR</a>');
    }
    ['recepcion', 'escenario', 'admin'].forEach(function (role) {
      if (roles.includes(role)) {
        const panel = PANELS[role];
        items.push('<a href="' + panel.href + '" data-nav="' + panel.id + '">' + escapeHtml(panel.shortLabel) + '</a>');
      }
    });
    items.push('<a href="bases.html" data-nav="bases">Bases oficiales</a>');
    return items.join('');
  }

  function renderRoleNav(active, options) {
    const isLocal = Boolean(options && options.local);
    const roles = isLocal ? ['escenario'] : (typeof Store.sessionRoles === 'function' ? Store.sessionRoles() : []);
    const html = buildNavLinks(roles, active, isLocal);

    document.querySelectorAll('[data-role-links]').forEach(function (container) {
      container.innerHTML = html;
    });
    document.querySelectorAll('[data-role-menu]').forEach(function (container) {
      container.innerHTML = html;
    });
    document.querySelectorAll('[data-logout-btn]').forEach(function (btn) {
      btn.hidden = isLocal || !roles.length;
      if (!btn.dataset.logoutBound) {
        btn.dataset.logoutBound = '1';
        btn.addEventListener('click', logout);
      }
    });
  }

  function initNav(active, options) {
    lastNavActive = active || '';
    lastNavOptions = options || null;
    renderRoleNav(lastNavActive, options);
    const links = document.querySelectorAll('[data-nav]');
    links.forEach(function (link) {
      const isActive = link.dataset.nav === active;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const menu = document.querySelector('.site-menu');
    if (menu && !menu.dataset.ciyaBound) {
      menu.dataset.ciyaBound = '1';
      menu.addEventListener('click', function (event) {
        if (event.target.closest('a')) menu.open = false;
      });
    }
    if (!navListenersBound) {
      navListenersBound = true;
      document.addEventListener('click', function (event) {
        const activeMenu = document.querySelector('.site-menu');
        if (activeMenu && activeMenu.open && !activeMenu.contains(event.target)) activeMenu.open = false;
      });
      document.addEventListener('keydown', function (event) {
        const activeMenu = document.querySelector('.site-menu');
        if (activeMenu && activeMenu.open && event.key === 'Escape') {
          activeMenu.open = false;
          activeMenu.querySelector('summary').focus();
        }
      });
    }
    const status = document.getElementById('sync-status');
    if (status) {
      if (syncPaintTimer) {
        clearInterval(syncPaintTimer);
        syncPaintTimer = null;
      }
      if (options && options.local) {
        status.textContent = 'Escenario local';
        status.classList.remove('online');
        return;
      }
      const paint = function () {
        const remote = window.CIYA_STORE.isRemote();
        const hasDemo = typeof Store.sessionRoles === 'function' && Store.sessionRoles().length > 0 && !Store.configured();
        status.textContent = remote
          ? 'Sincronización activa'
          : Store.configured()
            ? 'Sin sincronización'
            : hasDemo
              ? 'Modo demo local'
              : 'Sin configurar';
        status.classList.toggle('online', remote);
      };
      paint();
      syncPaintTimer = setInterval(paint, 2000);
    }
  }

  function table(headers, rows, stacked = false) {
    if (!rows.length) return '<p class="empty">Sin registros todavía.</p>';
    const layout = stacked ? ' table-stack' : '';
    return '<div class="table-wrap' + layout + '"><table role="table"><thead role="rowgroup"><tr role="row">' + headers.map(function (h) {
      return '<th scope="col" role="columnheader">' + escapeHtml(h) + '</th>';
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
        let cell = String(value == null ? '' : value);
        if (/^\s*[=+@-]/.test(cell) || /^[\r\n\t]/.test(cell)) cell = "'" + cell;
        return '"' + cell.replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
  }

  function renderRanking(id, rows) {
    const target = document.getElementById(id);
    if (!target) return;
    const best = Math.max(1, ...rows.map(function (row) { return Number(row.puntos) || 0; }));
    target.innerHTML = rows.map(function (row) {
      const puntos = Number(row.puntos) || 0;
      const puesto = Number(row.puesto) || 0;
      const juguetes = Number(row.juguetes) || 0;
      const caramelos = Number(row.caramelos) || 0;
      const total = Number(row.total) || 0;
      const donantes = Number(row.donantes) || 0;
      return '<div class="ranking-row"><div class="ranking-head"><strong>' + puesto + '. ' +
        escapeHtml(row.nombre) + '</strong><span>' + puntos + ' pts</span></div>' +
        '<div class="bar"><span style="width:' + Math.round(puntos / best * 100) + '%;--bar-color:' +
        window.CIYA_STORE.carrera(row.id).color + '"></span></div><small>' + juguetes + ' juguetes · ' +
        caramelos + ' fundas · ' + total + ' artículos · ' + donantes + ' donantes únicos</small></div>';
    }).join('');
  }

  window.CIYA_UI = {
    panels: PANELS,
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
