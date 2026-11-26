(function () {
  const UI = window.CIYA_UI;
  const Store = window.CIYA_STORE;
  const Data = window.CIYA_DATA;
  const esc = UI.escapeHtml;

  function template() {
    const carreras = Data.carreras.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.nombre) + '</option>';
    }).join('');
    const categorias = Data.categoriasVillancicos.map(function (c) {
      return '<option>' + esc(c) + '</option>';
    }).join('');
    return `
      <form class="card" id="form-villancicos">
        <div class="field"><label for="vil-grupo">Nombre artístico del grupo</label><input id="vil-grupo" maxlength="120" required></div>
        <div class="field"><label for="vil-integrantes">Nómina de integrantes (uno por línea)</label><textarea id="vil-integrantes" required placeholder="Nombre 1&#10;Nombre 2"></textarea></div>
        <div class="field"><label for="vil-representante">Representante del grupo</label><input id="vil-representante" maxlength="120" required></div>
        <div class="field"><label for="vil-carrera">Carrera representada</label><select id="vil-carrera" required>${carreras}</select></div>
        <div class="field"><label for="vil-cancion">Obra musical seleccionada</label><input id="vil-cancion" maxlength="160" required></div>
        <div class="field"><label for="vil-categoria">Modalidad</label><select id="vil-categoria" required>${categorias}</select></div>
        <button class="btn primary wide" type="submit"${Store.configured() ? '' : ' disabled'}>Inscribir grupo</button>
        ${Store.configured() ? '' : '<p class="hint">La inscripción estará disponible cuando se configure la conexión.</p>'}
        <p class="hint">Inscripción oficial abierta hasta el jueves 3 de diciembre de 2026, 17:30. Evaluación: 30% creatividad, 30% musicalidad, 20% puesta en escena y 20% aplausómetro.</p>
      </form>`;
  }

  function init() {
    if (new URLSearchParams(location.search).get('modo') === 'linterna') return;
    const root = document.getElementById('inscripciones-root');
    if (!root) return;
    root.innerHTML = template();
    const value = function (id) { return document.getElementById(id).value.trim(); };
    const group = document.getElementById('form-villancicos');
    group.addEventListener('submit', function (event) {
      const integrantes = value('vil-integrantes').split('\n').map(function (name) { return name.trim(); }).filter(Boolean);
      if (!integrantes.length) {
        event.preventDefault();
        return UI.toast('Ingresa al menos un integrante.', 'bad');
      }
      return UI.submit(event, 'group', {
        nombre: value('vil-grupo'), representante: value('vil-representante'),
        integrantes: integrantes,
        carrera: value('vil-carrera'), cancion: value('vil-cancion'), categoria: value('vil-categoria')
      }, false, function () {
        group.reset();
        UI.toast('Grupo inscrito en el orden de presentación.');
      });
    });
  }

  window.CIYA_INSCRIPCIONES = { init };
  init();
})();
