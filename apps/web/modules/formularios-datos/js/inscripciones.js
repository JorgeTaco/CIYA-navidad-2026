(function () {
  'use strict';

  function init() {
    const UI = window.CIYA_UI;
    const value = function (id) { return document.getElementById(id).value.trim(); };
    const group = document.getElementById('form-villancicos');
    group.addEventListener('submit', function (event) {
      return UI.submit(event, 'group', {
        nombre: value('vil-grupo'), representante: value('vil-representante'),
        integrantes: value('vil-integrantes').split('\n').map(function (name) { return name.trim(); }).filter(Boolean),
        carrera: value('vil-carrera'), cancion: value('vil-cancion'), categoria: value('vil-categoria')
      }, false, function () {
        group.reset();
        UI.toast('Grupo inscrito en el orden de presentación.');
      });
    });
  }

  window.CIYA_INSCRIPCIONES = { init: init };
})();
