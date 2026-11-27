(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const esc = UI.escapeHtml;
  const byId = function (id) { return document.getElementById(id); };

  function template() {
    return `
      <section class="access-banner" aria-labelledby="access-title">
        <div class="access-lights" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="access-banner-copy">
          <div class="access-event-date">${UI.icon('calendar_month')} 4 de diciembre · Hall principal CIYA</div>
          <h1 id="access-title">Ingenio que ilumina <em>la Navidad</em></h1>
          <p>CIYA Navidad 2026</p>
        </div>
        <div class="tree-art access-art">
          <div class="tree-art-content">
            <img src="modules/portal-linterna/media/arbol-navidad.webp" width="1024" height="1024" alt="Árbol de Navidad verde con luces y una estrella doradas">
          </div>
          <div class="tree-sparkles" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
        <p class="access-motto">5 carreras, 1 energía solidaria</p>
      </section>

      <div class="access-choices" id="acceso-grid">
        <section class="card access-signin" id="acceso-login" aria-labelledby="access-staff">
          <div class="access-card-heading">
            <span class="feature-icon">${UI.icon('admin_panel_settings')}</span>
            <div>
              <h2 id="access-staff">Acceso de organización</h2>
              <p>Recepción, Escenario y Administración</p>
            </div>
          </div>
          <form id="form-acceso">
            <div class="field">
              <label for="acceso-email">Correo de organización</label>
              <input id="acceso-email" type="email" autocomplete="username" required placeholder="usuario@organizacion.ec">
            </div>
            <div class="field">
              <label for="acceso-password">Contraseña</label>
              <input id="acceso-password" type="password" autocomplete="current-password" required>
            </div>
            <p class="pin-error" id="acceso-error" role="alert" hidden></p>
            <button class="btn primary wide access-submit" type="submit"><span id="acceso-submit-label">Iniciar sesión</span>${UI.icon('arrow_forward_ios')}</button>
          </form>
        </section>

        <section class="card access-signin" id="acceso-config" hidden>
          <div class="access-card-heading">
            <span class="feature-icon">${UI.icon('admin_panel_settings')}</span>
            <div>
              <h2>Acceso de organización</h2>
              <p>Configuración pendiente de Supabase</p>
            </div>
          </div>
        </section>

        <section class="card access-guest" id="acceso-asistente" aria-labelledby="access-guest">
          <div class="access-card-heading">
            <span class="feature-icon">${UI.icon('groups')}</span>
            <div>
              <h2 id="access-guest">Estudiantes y docentes</h2>
              <p>Acceso libre al portal del evento</p>
            </div>
          </div>
          <ul class="access-activities" aria-label="Actividades del portal">
            <li>${UI.icon('lightbulb')} Mar de Linternas</li>
            <li>${UI.icon('qr_code_scanner')} Ruta QR</li>
            <li>${UI.icon('mark_email_unread')} Buzón 2027</li>
          </ul>
          <button class="btn wide access-submit" id="btn-asistente" type="button"><span>Entrar al portal</span>${UI.icon('arrow_forward_ios')}</button>
        </section>
      </div>

      <section class="card access-signin access-signed-in" id="acceso-panels" aria-labelledby="access-session" hidden>
        <div class="access-card-heading">
          <span class="feature-icon">${UI.icon('admin_panel_settings')}</span>
          <div>
            <h2 id="access-session" tabindex="-1">Sesión activa</h2>
            <p id="acceso-user"></p>
          </div>
        </div>
        <h3 id="access-modules-title">Elige un módulo</h3>
        <nav class="grid access-module-menu" id="acceso-role-cards" aria-labelledby="access-modules-title"></nav>
        <button class="btn ghost small" id="acceso-logout" type="button">Cerrar sesión</button>
      </section>`;
  }

  function mount() {
    byId('acceso-root').innerHTML = template();
  }

  function destinationFor(roles) {
    const requested = new URLSearchParams(location.search).get('next');
    if (requested && roles.includes(requested) && UI.panels[requested]) {
      return UI.panels[requested].href;
    }
    if (roles.length === 1 && UI.panels[roles[0]]) {
      return UI.panels[roles[0]].href;
    }
    return null;
  }

  function showAuthorized(info) {
    UI.initNav('acceso');
    byId('acceso-config').hidden = true;
    byId('acceso-grid').hidden = true;
    byId('acceso-panels').hidden = false;
    byId('acceso-user').textContent = info.email;
    byId('acceso-user').hidden = !info.email;
    byId('acceso-role-cards').innerHTML = info.roles.map(function (role) {
      const panel = UI.panels[role];
      if (!panel) return '';
      return '<a class="card-link access-panel-link" href="' + panel.href + '">' +
        '<span class="feature-icon">' + UI.icon(panel.symbol) + '</span>' +
        '<div><h3>' + esc(panel.label) + '</h3><p>' + esc(panel.description) + '</p></div>' +
        UI.icon('arrow_forward_ios') + '</a>';
    }).join('');
    byId('access-session').focus({ preventScroll: location.hash !== '#acceso-panels' });
  }

  function showLogin() {
    UI.initNav('acceso');
    byId('acceso-config').hidden = true;
    byId('acceso-panels').hidden = true;
    byId('acceso-grid').hidden = false;
  }

  async function submitCredentials(email, password) {
    const button = byId('form-acceso').querySelector('[type=submit]');
    const errorBox = byId('acceso-error');
    const label = byId('acceso-submit-label');
    errorBox.hidden = true;
    button.disabled = true;
    label.textContent = 'Iniciando sesión…';
    try {
      const info = await Store.loginAccount(email, password);
      const target = destinationFor(info.roles);
      if (target) {
        location.replace(target);
        return;
      }
      showAuthorized(info);
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      button.disabled = false;
      label.textContent = 'Iniciar sesión';
    }
  }

  async function init() {
    const mode = new URLSearchParams(location.search).get('modo');
    if (mode === 'linterna') {
      location.replace('portal.html' + location.search + location.hash);
      return;
    }

    mount();
    UI.initNav('acceso');

    byId('acceso-logout').addEventListener('click', UI.logout);
    byId('btn-asistente').addEventListener('click', function () {
      if (Store.configured()) Store.enterAsistente();
      location.replace('portal.html');
    });

    if (!Store.configured()) {
      byId('acceso-login').hidden = true;
      byId('acceso-config').hidden = false;
      return;
    }

    byId('form-acceso').addEventListener('submit', function (event) {
      event.preventDefault();
      submitCredentials(byId('acceso-email').value.trim(), byId('acceso-password').value);
    });

    if (Store.hasSession()) {
      try {
        const info = await Store.myRoles();
        if (info.roles.length) {
          const target = destinationFor(info.roles);
          if (target) {
            location.replace(target);
            return;
          }
          showAuthorized(info);
          return;
        }
        await Store.logout();
      } catch {
        await Store.logout();
      }
    } else if (mode !== 'acceso' && Store.sessionRoles().includes('asistente')) {
      location.replace('portal.html');
      return;
    }

    showLogin();
  }

  window.CIYA_ACCESO = { mount, init };
  init();
})();
