(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const esc = UI.escapeHtml;

  function template() {
    const areas = Data.carreras.map(function (c) {
      return '<option value="' + esc(c.nombre) + '">' + esc(c.nombre) + '</option>';
    }).join('') +
      '<option value="Decanato / Administración">Decanato / Administración</option>' +
      '<option value="Laboratorios CIYA">Laboratorios CIYA</option>' +
      '<option value="Otra área">Otra área</option>';
    return `
      <form class="card" id="form-deseo">
        <div class="field"><label for="des-nombre">Nombre del autor</label><input id="des-nombre" maxlength="120" required></div>
        <div class="field"><label for="des-rol">Rol</label><select id="des-rol" required><option value="estudiante">Estudiante</option><option value="docente">Docente</option><option value="personal">Personal</option></select></div>
        <div class="field"><label for="des-carrera">Carrera / Área</label><select id="des-carrera" required>${areas}</select></div>
        <div class="field" id="des-carrera-otra-wrap" hidden><label for="des-carrera-otra">Especifica el área</label><input id="des-carrera-otra" maxlength="120"></div>
        <div class="field"><label for="des-frase">Frase inspiradora o meta para 2027</label><textarea id="des-frase" maxlength="280" required></textarea></div>
        <button class="btn primary wide" type="submit"${Store.configured() ? '' : ' disabled'}>Enviar al buzón</button>
        ${Store.configured() ? '' : '<p class="hint">El envío de deseos estará disponible cuando se configure la conexión.</p>'}
        <p class="hint">Las frases quedan pendientes de aprobación y podrán proyectarse durante la chocolatada final.</p>
      </form>`;
  }

  function init() {
    if (new URLSearchParams(location.search).get('modo') === 'linterna') return;
    const root = document.getElementById('buzon-root');
    if (!root) return;
    root.innerHTML = template();
    const value = function (id) { return document.getElementById(id).value.trim(); };
    const areaSelect = document.getElementById('des-carrera');
    const otherWrap = document.getElementById('des-carrera-otra-wrap');
    const otherInput = document.getElementById('des-carrera-otra');
    areaSelect.addEventListener('change', function () {
      const isOther = areaSelect.value === 'Otra área';
      otherWrap.hidden = !isOther;
      otherInput.required = isOther;
      if (!isOther) otherInput.value = '';
    });
    const wish = document.getElementById('form-deseo');
    wish.addEventListener('submit', function (event) {
      const carrera = areaSelect.value === 'Otra área' ? (value('des-carrera-otra') || 'Otra área') : value('des-carrera');
      return UI.submit(event, 'wish', {
        nombre: value('des-nombre'), rol: value('des-rol'), carrera: carrera, frase: value('des-frase')
      }, false, function () {
        wish.reset();
        otherWrap.hidden = true;
        otherInput.required = false;
        UI.toast('Frase enviada a curaduría.');
      });
    });
  }

  window.CIYA_BUZON = { init };
  init();
})();
