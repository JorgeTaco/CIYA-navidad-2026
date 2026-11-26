(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const esc = UI.escapeHtml;
  const byId = function (id) { return document.getElementById(id); };

  function template() {
    return `
      <section class="hero" style="margin-bottom:1.2rem">
        <span class="kicker">4 de diciembre de 2026 · Facultad CIYA</span>
        <h1>CIYA Navidad 2026</h1>
        <p>Inicia sesión según tu rol. El sistema habilitará únicamente las pestañas y funciones correspondientes a tu cuenta.</p>
      </section>

      <div class="grid cols-2" id="acceso-grid">
        <section class="card" id="acceso-login">
          <h2>Acceso de organización</h2>
          <p class="muted">Para Recepción (Industrial), Producción / Escenario (Sistemas y Software) y Curadores / Administración.</p>
          <form id="form-acceso">
            <div class="field">
              <label for="acceso-email">Correo de organización</label>
              <input id="acceso-email" type="email" autocomplete="username" required placeholder="usuario@ciya.local">
            </div>
            <div class="field">
              <label for="acceso-password">Contraseña</label>
              <input id="acceso-password" type="password" autocomplete="current-password" required>
            </div>
            <p class="pin-error" id="acceso-error" role="alert" hidden></p>
            <button class="btn primary wide" type="submit">Iniciar sesión</button>
          </form>

          <div class="section" id="demo-accounts" style="margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--line)" hidden>
            <p class="label">Modo demo local (Supabase sin configurar)</p>
            <p class="hint" style="margin-bottom:0.6rem">Prueba cada rol visualmente con un clic (clave: <code>ciya2026</code>):</p>
            <div class="row">
              <button class="btn small" type="button" data-demo-email="recepcion@ciya.local">Recepción</button>
              <button class="btn small" type="button" data-demo-email="escenario@ciya.local">Escenario</button>
              <button class="btn small" type="button" data-demo-email="admin@ciya.local">Administración</button>
            </div>
          </div>
        </section>

        <section class="card" id="acceso-asistente">
          <span class="badge ok">Acceso libre</span>
          <h2 style="margin-top:0.65rem">Estudiantes y Docentes</h2>
          <p class="muted">Ingresa como asistente para usar el Mar de Linternas, inscribir grupos de villancicos, enviar mensajes al buzón “Compilando Deseos 2027” y recorrer la Ruta de Códigos QR.</p>
          <button class="btn primary wide" id="btn-asistente" type="button" style="margin-top:0.6rem">Ingresar como Estudiante / Docente</button>
          <p class="hint" style="margin-top:0.8rem">No requiere contraseña. Verás únicamente las pestañas públicas de participantes.</p>
        </section>
      </div>

      <section class="card" id="acceso-panels" hidden>
        <div class="row between" style="margin-bottom:0.8rem">
          <div>
            <h2>Sesión activa</h2>
            <p class="muted" id="acceso-user" style="margin-bottom:0"></p>
          </div>
          <button class="btn ghost small" id="acceso-logout" type="button">Cerrar sesión</button>
        </div>
        <div class="grid" id="acceso-role-cards"></div>
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
    byId('acceso-grid').hidden = true;
    byId('acceso-panels').hidden = false;
    byId('acceso-user').textContent = (info.email ? info.email + ' · ' : '') +
      info.roles.map(function (role) { return UI.panels[role] ? UI.panels[role].label : role; }).join(', ');
    byId('acceso-role-cards').innerHTML = info.roles.map(function (role) {
      const panel = UI.panels[role];
      if (!panel) return '';
      return '<a class="card card-link" href="' + panel.href + '">' +
        '<span class="badge ok">' + esc(panel.actor) + '</span>' +
        '<h3 style="margin-top:0.65rem">' + esc(panel.label) + '</h3>' +
        '<p class="muted">' + esc(panel.description) + '</p></a>';
    }).join('');
  }

  function showLogin() {
    UI.initNav('acceso');
    byId('acceso-panels').hidden = true;
    byId('acceso-grid').hidden = false;
    if (!Store.configured()) byId('demo-accounts').hidden = false;
  }

  async function submitCredentials(email, password) {
    const button = byId('form-acceso').querySelector('[type=submit]');
    const errorBox = byId('acceso-error');
    errorBox.hidden = true;
    button.disabled = true;
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
    }
  }

  async function init() {
    if (new URLSearchParams(location.search).get('modo') === 'linterna') {
      location.replace('portal.html' + location.search + location.hash);
      return;
    }

    mount();
    UI.initNav('acceso');

    byId('acceso-logout').addEventListener('click', UI.logout);
    byId('btn-asistente').addEventListener('click', function () {
      Store.enterAsistente();
      location.replace('portal.html');
    });

    byId('form-acceso').addEventListener('submit', function (event) {
      event.preventDefault();
      submitCredentials(byId('acceso-email').value.trim(), byId('acceso-password').value);
    });

    document.querySelectorAll('[data-demo-email]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (Store.configured()) return;
        byId('acceso-email').value = btn.dataset.demoEmail;
        byId('acceso-password').value = 'ciya2026';
        submitCredentials(btn.dataset.demoEmail, 'ciya2026');
      });
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
    } else if (Store.sessionRoles().includes('asistente')) {
      location.replace('portal.html');
      return;
    }

    showLogin();
  }

  window.CIYA_ACCESO = { mount, init };
  init();
})();
