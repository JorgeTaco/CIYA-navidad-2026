(function () {
  'use strict';

  function init() {
    const UI = window.CIYA_UI;
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

  window.CIYA_BUZON = { init: init };
})();
