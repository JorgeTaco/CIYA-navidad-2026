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
      symbol: 'groups',
      actor: 'Equipo de Recepción (Industrial)',
      description: 'Acreditación presencial, donaciones por carrera, canje de QR Dorados y cierre de recepción.'
    },
    escenario: {
      id: 'escenario',
      label: 'Escenario',
      shortLabel: 'Escenario',
      href: 'escenario.html',
      symbol: 'dashboard',
      actor: 'Producción / Escenario (Sistemas y Software)',
      description: 'Ranking en vivo, concurso de villancicos, Encendido 5 en 1 (local/offline) y Gran Ruleta Digital.'
    },
    admin: {
      id: 'admin',
      label: 'Administración',
      shortLabel: 'Administración',
      href: 'admin.html',
      symbol: 'admin_panel_settings',
      actor: 'Docentes Organizadores y Asociación (Curadores)',
      description: 'Moderación y exportación de Deseos 2027, puertas decoradas, puntajes y QR Dorados.'
    }
  };
  const staffPanels = ['recepcion', 'escenario', 'admin'];
  const sessionMenuHref = 'index.html#acceso-panels';
  const sessionReturnLabel = 'Volver a Sesión activa';
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

  function redirectToLogin(scope) {
    const params = new URLSearchParams({ modo: 'acceso', next: scope });
    if (location.search) params.set('panelQuery', location.search);
    location.replace('index.html?' + params.toString());
    return false;
  }

  async function requireAccount(scope, title) {
    if (!Store.configured()) return showConfigRequired(title);
    if (Store.hasSession()) {
      try {
        await Store.authorize(scope);
        await Store.myRoles().catch(function () {});
        initNav(lastNavActive || scope, lastNavOptions);
        return true;
      } catch {
        const info = await Store.myRoles().catch(function () { return null; });
        if (info && info.roles.length) {
          return showRoleRestricted(scope, title, info);
        }
        await Store.logout();
      }
    }
    return redirectToLogin(scope);
  }

  function showConfigRequired(title) {
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'pin-overlay';
      overlay.innerHTML =
        '<div class="pin-card"><h2>Configuración requerida</h2>' +
        '<p class="muted">No se puede abrir <strong>' + escapeHtml(title) + '</strong> hasta completar la configuración de Supabase en <code>apps/web/shared/js/config.js</code>.</p>' +
        '<div class="row"><a class="btn primary" href="index.html">Ir al inicio</a>' +
        '<button class="btn ghost" type="button" data-cancel>Cerrar</button></div></div>';
      document.body.appendChild(overlay);
      overlay.querySelector('[data-cancel]').addEventListener('click', function () {
        overlay.remove();
        resolve(false);
      });
    });
  }

  function showRoleRestricted(scope, title, info) {
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'pin-overlay';
      const allowedLinks = staffPanelsFor(info.roles).length > 1
        ? '<a class="btn primary" href="' + sessionMenuHref + '">' + sessionReturnLabel + '</a>'
        : info.roles.map(function (role) {
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
        resolve(redirectToLogin(scope));
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

  const navItems = {
    portal: ['portal.html', 'Portal', 'holiday_village'],
    qr: ['qr.html', 'Ruta QR', 'qr_code_scanner'],
    cronograma: ['cronograma.html', 'Cronograma', 'schedule'],
    sesion: [sessionMenuHref, 'Sesión activa', 'dashboard']
  };
  staffPanels.forEach(function (role) {
    const panel = PANELS[role];
    navItems[role] = [panel.href, panel.label, panel.symbol];
  });

  function icon(name) {
    return '<span class="material-symbols-outlined" aria-hidden="true">' + escapeHtml(name) + '</span>';
  }

  function villancicoDetails(group) {
    const { fecha, fechaISO } = window.CIYA_DATA.evento;
    const ciclo = Store.cicloNombre(group.ciclo);
    return `
      <dl class="villancico-details">
        <div><dt>Fecha</dt><dd><time datetime="${escapeHtml(fechaISO)}">${escapeHtml(fecha)}</time></dd></div>
        <div><dt>Modalidad</dt><dd>${escapeHtml(group.categoria || 'Sin registrar')}</dd></div>
        <div><dt>Carrera</dt><dd>${escapeHtml(Store.carrera(group.carrera).nombre || 'Sin registrar')}</dd></div>
        <div><dt>Ciclo</dt><dd>${escapeHtml(ciclo || 'Sin registrar')}</dd></div>
      </dl>`;
  }

  function staffPanelsFor(roles) {
    return staffPanels.filter(function (role) { return roles.includes(role); });
  }

  function buildNavLinks(roles, active, isLocal) {
    const staff = staffPanelsFor(roles);
    const publicLinks = ['portal', 'qr', 'cronograma'];
    const isPublic = active === 'acceso' || publicLinks.includes(active);
    let items;
    if (isLocal) items = ['escenario'];
    else if (staff.length > 1 && staffPanels.includes(active)) {
      return '<a class="session-return" href="' + sessionMenuHref + '" data-nav="sesion">' +
        icon('arrow_forward_ios') + '<span>' + sessionReturnLabel + '</span></a>';
    } else if (staff.length > 1) items = [...publicLinks, 'sesion'];
    else if (staff.length) items = [...staff, 'cronograma'];
    else if (isPublic || roles.includes('asistente')) items = publicLinks;
    else items = ['cronograma'];

    return items.map(function (id) {
      const [href, label, symbol] = navItems[id];
      return '<a href="' + href + '" data-nav="' + id + '">' + icon(symbol) + '<span>' + label + '</span></a>';
    }).join('');
  }

  function renderRoleNav(active, options) {
    const isLocal = Boolean(options && options.local);
    const roles = isLocal ? ['escenario'] : (typeof Store.sessionRoles === 'function' ? Store.sessionRoles() : []);
    const html = buildNavLinks(roles, active, isLocal);

    document.querySelectorAll('[data-role-links]').forEach(function (container) {
      container.innerHTML = html;
      container.hidden = isLocal;
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
    const status = document.getElementById('sync-status');
    if (status && !status.hidden) {
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
        status.textContent = remote
          ? 'Sincronización activa'
          : Store.configured()
            ? 'Sin sincronización'
            : 'Configuración requerida';
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
    icon: icon,
    escapeHtml: escapeHtml,
    toast: toast,
    requireAccount: requireAccount,
    submit: submit,
    logout: logout,
    download: download,
    copy: copy,
    dateTime: dateTime,
    villancicoDetails: villancicoDetails,
    initNav: initNav,
    csv: csv,
    renderRanking: renderRanking,
    table: table
  };
})();
