(function () {
  const UI = window.CIYA_UI;
  const esc = UI.escapeHtml;

  function template() {
    return `
      <form class="card" id="form-deseo">
        <div class="field"><label for="des-nombre">Nombre del autor</label><input id="des-nombre" required></div>
        <div class="field"><label for="des-rol">Rol</label><select id="des-rol" required><option value="estudiante">Estudiante</option><option value="docente">Docente</option><option value="personal">Personal</option></select></div>
        <div class="field"><label for="des-carrera">Carrera / Área</label><input id="des-carrera" required></div>
        <div class="field"><label for="des-frase">Frase inspiradora o meta para 2027</label><textarea id="des-frase" maxlength="280" required></textarea></div>
        <button class="btn primary wide" type="submit">Enviar al buzón</button>
        <p class="hint">Las frases quedan pendientes de aprobación y podrán proyectarse durante la chocolatada final.</p>
      </form>`;
  }

  function init() {
    if (new URLSearchParams(location.search).get('modo') === 'linterna') return;
    const root = document.getElementById('buzon-root');
    if (!root) return;
    root.innerHTML = template();
    const value = function (id) { return document.getElementById(id).value.trim(); };
    const wish = document.getElementById('form-deseo');
    wish.addEventListener('submit', function (event) {
      return UI.submit(event, 'wish', {
        nombre: value('des-nombre'), rol: value('des-rol'), carrera: value('des-carrera'), frase: value('des-frase')
      }, false, function () {
        wish.reset();
        UI.toast('Frase enviada a curaduría.');
      });
    });
  }

  window.CIYA_BUZON = { init };
  init();
})();
