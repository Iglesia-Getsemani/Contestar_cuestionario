/**
 * answer-review-logic.js
 * Equivalente a answer_review_screen.dart (AnswerReviewScreen).
 *
 * ⚠️ MÓDULO VACÍO A PROPÓSITO — no se recibió answer_review_screen.dart,
 * por lo que aquí solo se deja definido el CONTRATO (API) que
 * js/screens/answer-review.js espera encontrar, para implementar la
 * lógica real de revisión (mostrar cada pregunta con la respuesta dada,
 * marcar correcto/incorrecto, mostrar puntaje total, respetar la regla
 * de "mostrar respuestas correctas" según canShowCorrectAnswers, etc.)
 * sin tocar el resto de la app.
 *
 * Contexto que answer-review.js pasa a este módulo:
 *   - containerEl: HTMLElement donde debe renderizarse la revisión
 *   - answerData: objeto guardado localmente (ver questionnaire-logic.js
 *       para el formato esperado: usuario, cuestionario, fecha,
 *       es_simulacro, intento, respuestas, puntaje, total)
 *   - canShowCorrectAnswers: boolean — replica la regla original:
 *       isSimulacro || minutos desde 'fecha' >= 15
 *   - quizCompletionTime: Date
 */
(function (global) {
  'use strict';

  /**
   * Punto de entrada: renderiza la revisión de una respuesta dentro de containerEl.
   * TODO: implementar.
   */
  function render({ containerEl, answerData, canShowCorrectAnswers, quizCompletionTime }) {
    containerEl.innerHTML = `
      <div class="empty-state">
        <h3>Lógica de revisión pendiente</h3>
        <p>
          Este módulo (answer-review-logic.js) aún no está implementado.
          Aquí se debe mostrar el detalle de la respuesta
          <strong>${global.Utils.escapeHtml(answerData?.cuestionario || '')}</strong>
          completada el ${global.Utils.escapeHtml(global.Utils.formatDate(quizCompletionTime))}.
        </p>
        <p class="text-muted">
          Mostrar respuestas correctas: <strong>${canShowCorrectAnswers ? 'sí' : 'no todavía'}</strong>
        </p>
      </div>`;
  }

  global.AnswerReviewLogic = { render };
})(window);
