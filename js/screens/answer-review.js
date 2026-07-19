/**
 * answer-review.js
 * Equivalente a la navegación hacia AnswerReviewScreen en main.dart
 * (_viewAnswerDetails). Carga la respuesta local, calcula
 * canShowCorrectAnswers con la misma regla del original
 * (simulacro || >= 15 minutos desde la fecha) y delega el renderizado
 * al módulo de negocio (js/modules/answer-review-logic.js), pendiente
 * de implementar.
 */
(function (global) {
  'use strict';

  const MIN_MINUTES_BEFORE_SHOWING_ANSWERS = 15;

  function init() {
    if (global.AppConfig.enforceExpiration()) return;

    global.GlobalAdTicker.mount();
    document.getElementById('btn-back').addEventListener('click', () => history.back());

    const fileName = global.Utils.getQueryParam('file');
    const containerEl = document.getElementById('review-container');

    if (!fileName) {
      containerEl.innerHTML = `<div class="empty-state"><p>No se especificó ninguna respuesta.</p></div>`;
      return;
    }

    global.UI.showLoading('Cargando respuesta...');
    global.Storage.readAnswer(fileName)
      .then((answerData) => {
        const isSimulacro = answerData.es_simulacro === true;
        const answerDate = new Date(answerData.fecha);
        const canShowCorrectAnswers =
          isSimulacro || global.Utils.minutesSince(answerDate) >= MIN_MINUTES_BEFORE_SHOWING_ANSWERS;

        document.getElementById('review-title').textContent =
          global.Utils.stripJsonExt(fileName);

        global.AnswerReviewLogic.render({
          containerEl,
          answerData,
          canShowCorrectAnswers,
          quizCompletionTime: answerDate
        });
      })
      .catch((err) => {
        containerEl.innerHTML = `<div class="status-box status-box--error">
          Error al cargar la respuesta: ${global.Utils.escapeHtml(err.message || String(err))}
        </div>`;
      })
      .finally(() => global.UI.hideLoading());
  }

  document.addEventListener('deviceready', init, false);
  if (!global.cordova) document.addEventListener('DOMContentLoaded', init);
})(window);
