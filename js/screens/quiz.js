/**
 * quiz.js
 * Pantalla de "Contestar / Simulacro" (equivalente a la navegación hacia
 * QuestionnaireScreen en main.dart). Se encarga de:
 *   1) leer los parámetros de navegación (archivo, usuario, modo, intento)
 *   2) cargar el cuestionario desde almacenamiento local
 *   3) delegar el renderizado/calificación al módulo de negocio
 *      (js/modules/questionnaire-logic.js), que aún está pendiente
 *      de implementar.
 */
(function (global) {
  'use strict';

  function getAttemptNumber(/* fileName */) {
    // TODO: igual que en el original (_getAttemptNumber siempre devuelve 1
    // por ahora); reemplazar cuando exista lógica real de intentos.
    return 1;
  }

  function init() {
    if (global.AppConfig.enforceExpiration()) return;

    global.GlobalAdTicker.mount();
    document.getElementById('btn-back').addEventListener('click', () => history.back());

    const fileName = global.Utils.getQueryParam('file');
    const userName = global.Utils.getQueryParam('user') || 'Usuario';
    const isSimulacro = global.Utils.getQueryParam('simulacro') === '1';
    const containerEl = document.getElementById('quiz-container');

    if (!fileName) {
      containerEl.innerHTML = `<div class="empty-state"><p>No se especificó ningún cuestionario.</p></div>`;
      return;
    }

    document.getElementById('quiz-title').textContent =
      `${global.Utils.stripJsonExt(fileName)}${isSimulacro ? ' — Simulacro' : ''}`;

    global.UI.showLoading('Cargando cuestionario...');
    global.Storage.readQuestionnaire(fileName)
      .then((data) => {
        const questionnaire = Array.isArray(data) ? data : [data];
        global.QuestionnaireLogic.render({
          containerEl,
          questionnaire,
          questionnaireName: global.Utils.stripJsonExt(fileName),
          userName,
          isSimulacro,
          attemptNumber: getAttemptNumber(fileName)
        });
      })
      .catch((err) => {
        containerEl.innerHTML = `<div class="status-box status-box--error">
          Error al cargar el cuestionario: ${global.Utils.escapeHtml(err.message || String(err))}
        </div>`;
      })
      .finally(() => global.UI.hideLoading());
  }

  document.addEventListener('deviceready', init, false);
  if (!global.cordova) document.addEventListener('DOMContentLoaded', init);
})(window);