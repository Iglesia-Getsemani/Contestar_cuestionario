/**
 * questionnaire-logic.js
 * Equivalente a QuestionnaireScreen / _QuestionnaireScreenState de
 * questionnaire_logic.dart. Renderiza la pantalla de "Contestar /
 * Simulacro" completa dentro de un contenedor: navegación entre
 * preguntas (texto, selección única, selección múltiple), botón
 * "Responder" que revela las opciones (y arranca el timer) para
 * selección/múltiple, texto-a-voz para leer pregunta/opciones,
 * cálculo de puntaje, guardado local de la respuesta
 * (Storage.saveAnswer) y las 3 vistas finales: resumen de puntaje,
 * detalle de respuestas y navegación de regreso.
 *
 * API pública:
 *   global.QuestionnaireLogic.render({
 *     containerEl, questionnaire, questionnaireName,
 *     userName, isSimulacro, attemptNumber
 *   })
 */
(function (global) {
  'use strict';

  // Igual que _canShowResults() en el original: al terminar el
  // cuestionario solo se muestran las respuestas correctas de
  // inmediato si es simulacro; en un cuestionario real hay que
  // esperar 15 minutos desde que se empezó a resolver.
  const RESULTS_WAIT_MINUTES = 15;

  const STYLE_ID = 'questionnaire-logic-styles';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .quiz-scoreboard {
        display: inline-flex; align-items: center; gap: var(--sp-1);
        background: var(--color-bg); border: 1px solid var(--color-border);
        border-radius: 999px; padding: var(--sp-1) var(--sp-3);
        font-weight: 700; font-size: var(--fs-md); margin-bottom: var(--sp-3);
      }
      .quiz-scoreboard__correct { color: var(--color-accent); }
      .quiz-scoreboard__wrong { color: var(--color-danger); }

      .progress-bar {
        width: 100%; height: 8px; border-radius: 999px;
        background: var(--color-border); overflow: hidden;
        margin-bottom: var(--sp-3);
      }
      .progress-bar__fill {
        height: 100%; background: var(--color-primary);
        border-radius: 999px; transition: width .2s ease;
      }

      .question-row { display: flex; align-items: flex-start; gap: var(--sp-2); }
      .question-row__text { flex: 1; font-size: var(--fs-lg); font-weight: 700; }

      .icon-btn-speak {
        flex: 0 0 auto; border: none; background: transparent;
        color: var(--color-primary); font-size: 18px; line-height: 1;
        cursor: pointer; padding: var(--sp-1); border-radius: var(--radius-sm);
      }
      .icon-btn-speak:active { background: var(--color-bg); }

      .answer-area { margin-bottom: var(--sp-4); }

      .option-card {
        display: block; cursor: pointer; padding: var(--sp-3) var(--sp-4);
      }
      .option-card--selected { border: 1.5px solid var(--color-primary); }
      .option-row {
        display: flex; align-items: center; gap: var(--sp-3); cursor: pointer;
      }
      .option-row input[type="radio"],
      .option-row input[type="checkbox"] {
        width: 20px; height: 20px; flex: 0 0 auto; accent-color: var(--color-primary);
      }
      .option-row__text { flex: 1; }

      .quiz-summary-icon { font-size: 48px; margin-bottom: var(--sp-2); }
      .quiz-score { font-size: 36px; font-weight: 700; margin: var(--sp-2) 0; }
      .quiz-score-pct { font-size: var(--fs-xl); font-weight: 600; margin-bottom: var(--sp-3); }
    `;
    document.head.appendChild(style);
  }

  function render(opts) {
    const {
      containerEl,
      questionnaire,
      questionnaireName,
      userName,
      isSimulacro,
      attemptNumber
    } = opts;

    ensureStyles();

    if (!questionnaire || !questionnaire.length) {
      containerEl.innerHTML = `<div class="empty-state"><p>No hay cuestionario cargado</p></div>`;
      return;
    }

    const btnBack = document.getElementById('btn-back');

    // ── Estado (equivalente a los campos de _QuestionnaireScreenState) ──
    let currentIndex = 0;
    const userAnswers = {};       // borrador de la respuesta actual (por índice)
    const committedAnswers = {};  // respuesta confirmada al avanzar de pregunta
    const questionTimers = {};    // segundos usados por pregunta
    let questionStartTime = null;
    let showOptions = false;
    let view = 'question';        // 'question' | 'scoreSummary' | 'results'
    const sessionStartTime = new Date();

    initializeQuestion();
    renderView();

    // ── Texto a voz (equivalente a FlutterTts) ──────────────────────────
    function speak(text) {
      if (!text || !('speechSynthesis' in global)) return;
      try {
        global.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'es-ES';
        utter.rate = 0.85;   // equivalente aproximado a setSpeechRate(0.4)
        utter.volume = 0.8;
        utter.pitch = 1.0;
        global.speechSynthesis.speak(utter);
      } catch (e) {
        // Síntesis de voz no disponible en este entorno; se ignora.
      }
    }

    // ── Timers por pregunta ──────────────────────────────────────────────
    function initializeQuestion() {
      const q = questionnaire[currentIndex];
      if (q.tipo === 'texto') {
        startQuestionTimer();
        showOptions = true; // en preguntas de texto se muestra de inmediato
      } else {
        showOptions = false; // selección/múltiple esperan al botón "Responder"
      }
    }

    function startQuestionTimer() {
      questionStartTime = Date.now();
    }

    function stopQuestionTimer() {
      if (questionStartTime != null) {
        questionTimers[currentIndex] = (Date.now() - questionStartTime) / 1000;
        questionStartTime = null;
      }
    }

    // ── Captura de respuestas ────────────────────────────────────────────
    function answerText(value) {
      userAnswers[currentIndex] = value;
    }

    function answerSingleChoice(value) {
      userAnswers[currentIndex] = value;
      renderView();
    }

    function answerMultipleChoice(option, selected) {
      const current = Array.isArray(userAnswers[currentIndex]) ? userAnswers[currentIndex].slice() : [];
      if (selected) {
        if (!current.includes(option)) current.push(option);
      } else {
        const idx = current.indexOf(option);
        if (idx >= 0) current.splice(idx, 1);
      }
      userAnswers[currentIndex] = current;
      renderView();
    }

    // ── Calificación ─────────────────────────────────────────────────────
    function isAnswerCorrect(index) {
      const q = questionnaire[index];
      const userAnswer = committedAnswers[index];
      if (userAnswer === undefined || userAnswer === null) return false;

      switch (q.tipo) {
        case 'texto':
          return String(userAnswer).toLowerCase().trim() ===
            String(q.respuesta_correcta).toLowerCase().trim();
        case 'seleccion':
          return userAnswer === q.respuesta_correcta;
        case 'multiple': {
          const correct = Array.isArray(q.respuestas_correctas) ? q.respuestas_correctas : [];
          const given = Array.isArray(userAnswer) ? userAnswer : [];
          return correct.length === given.length && correct.every((a) => given.includes(a));
        }
        default:
          return false;
      }
    }

    function calculateScore() {
      let correct = 0;
      for (let i = 0; i < questionnaire.length; i++) {
        if (isAnswerCorrect(i)) correct++;
      }
      return correct;
    }

    function calculateCurrentCorrectAnswers() {
      let correct = 0;
      for (let i = 0; i <= currentIndex; i++) {
        if (Object.prototype.hasOwnProperty.call(committedAnswers, i) && isAnswerCorrect(i)) correct++;
      }
      return correct;
    }

    function calculateCurrentWrongAnswers() {
      let wrong = 0;
      for (let i = 0; i <= currentIndex; i++) {
        if (Object.prototype.hasOwnProperty.call(committedAnswers, i) && !isAnswerCorrect(i)) wrong++;
      }
      return wrong;
    }

    function getCorrectAnswerText(q) {
      switch (q.tipo) {
        case 'texto':
        case 'seleccion':
          return String(q.respuesta_correcta);
        case 'multiple':
          return (q.respuestas_correctas || []).join(', ');
        default:
          return 'N/A';
      }
    }

    function canShowResultsNow() {
      return isSimulacro || global.Utils.minutesSince(sessionStartTime) >= RESULTS_WAIT_MINUTES;
    }

    function prepareAnswersForSubmission() {
      return questionnaire.map((q, i) => ({
        pregunta: q.pregunta,
        tipo: q.tipo,
        tiempo_respuesta: questionTimers[i] || 0,
        respuesta_usuario: committedAnswers[i] !== undefined ? String(committedAnswers[i]) : 'Sin responder',
        respuesta_correcta: getCorrectAnswerText(q),
        es_correcta: isAnswerCorrect(i)
      }));
    }

    function timestampSlug() {
      const now = new Date();
      const pad = (n, len) => String(n).padStart(len || 2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_` +
        `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
    }

    function saveAnswerLocally() {
      const fileName = `${userName}_${questionnaireName}_${timestampSlug()}${isSimulacro ? '_SIMULACRO' : ''}.json`;
      const answerData = {
        nombre_usuario: userName,
        nombre_cuestionario: questionnaireName,
        fecha: new Date().toString(),
        puntaje_total: calculateScore(),
        puntaje_maximo: questionnaire.length,
        respuestas: prepareAnswersForSubmission(),
        es_simulacro: isSimulacro,
        intento_numero: attemptNumber
      };
      return global.Storage.saveAnswer(fileName, answerData).catch((err) => {
        console.error('Error al guardar respuesta:', err);
        global.UI.toast(`Error al guardar respuesta: ${err.message || err}`);
      });
    }

    // ── Navegación entre preguntas ───────────────────────────────────────
    function showAnswerOptions() {
      showOptions = true;
      startQuestionTimer();
      renderView();
    }

    function nextQuestion() {
      committedAnswers[currentIndex] = userAnswers[currentIndex];
      stopQuestionTimer();

      if (currentIndex < questionnaire.length - 1) {
        currentIndex++;
        initializeQuestion();
        renderView();
      } else {
        global.UI.showLoading('Guardando respuesta...');
        saveAnswerLocally().finally(() => {
          global.UI.hideLoading();
          view = 'scoreSummary';
          renderView();
        });
      }
    }

    function showDetailedResults() {
      view = 'results';
      renderView();
    }

    // ── Control del botón "atrás" del app-bar ────────────────────────────
    // Igual que WillPopScope(onWillPop: () async => false) del original:
    // durante la pregunta y el detalle de resultados se bloquea el back;
    // en el resumen de puntaje sí está disponible (como en el Scaffold
    // original, que no envuelve esa vista en WillPopScope).
    function updateBackButton() {
      if (!btnBack) return;
      const allowBack = view === 'scoreSummary';
      btnBack.classList.toggle('hidden', !allowBack);
    }

    // ── Vistas ────────────────────────────────────────────────────────────
    function renderView() {
      updateBackButton();
      if (view === 'scoreSummary') return renderScoreSummaryView();
      if (view === 'results') return renderResultsView();
      return renderQuestionView();
    }

    function scoreColor(pct) {
      if (pct >= 80) return 'var(--color-accent)';
      if (pct >= 50) return 'var(--color-warning)';
      return 'var(--color-danger)';
    }

    function actionButtonLabel(q) {
      const isLast = currentIndex >= questionnaire.length - 1;
      if (q.tipo === 'texto') return isLast ? 'Finalizar' : 'Siguiente';
      if (!showOptions) return 'Responder';
      return isLast ? 'Finalizar' : 'Siguiente';
    }

    function actionButtonClass(q) {
      if (q.tipo !== 'texto' && !showOptions) return 'btn--accent';
      return 'btn--primary';
    }

    function renderQuestionView() {
      const q = questionnaire[currentIndex];
      const correct = calculateCurrentCorrectAnswers();
      const wrong = calculateCurrentWrongAnswers();
      const progressPct = Math.round(((currentIndex + 1) / questionnaire.length) * 100);

      containerEl.innerHTML = `
        <div class="quiz-scoreboard">
          <span class="quiz-scoreboard__correct">${correct}</span>
          <span> / </span>
          <span class="quiz-scoreboard__wrong">${wrong}</span>
        </div>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${progressPct}%;"></div></div>
        <p class="text-muted">Pregunta ${currentIndex + 1} de ${questionnaire.length}</p>

        <div class="card">
          <div class="question-row">
            <div class="question-row__text">${global.Utils.escapeHtml(q.pregunta)}</div>
            <button type="button" class="icon-btn-speak" data-speak-question aria-label="Escuchar pregunta">&#128266;</button>
          </div>
        </div>

        <div id="answer-area" class="answer-area"></div>

        <button id="btn-action" class="btn ${actionButtonClass(q)}">${actionButtonLabel(q)}</button>
      `;

      containerEl.querySelector('[data-speak-question]').addEventListener('click', () => speak(q.pregunta));
      renderAnswerArea(q);

      document.getElementById('btn-action').addEventListener('click', () => {
        if (q.tipo !== 'texto' && !showOptions) {
          showAnswerOptions();
        } else {
          nextQuestion();
        }
      });
    }

    function renderAnswerArea(q) {
      const area = document.getElementById('answer-area');

      if (q.tipo === 'texto') {
        area.innerHTML = `
          <div class="field">
            <label for="text-answer">Tu respuesta</label>
            <input class="input" id="text-answer" type="text" autocomplete="off"
                   value="${global.Utils.escapeHtml(userAnswers[currentIndex] != null ? String(userAnswers[currentIndex]) : '')}">
          </div>`;
        const input = document.getElementById('text-answer');
        input.addEventListener('input', (e) => answerText(e.target.value));
        return;
      }

      if (!showOptions) {
        area.innerHTML = `
          <div class="empty-state">
            <p>Presiona "Responder" para ver las opciones</p>
          </div>`;
        return;
      }

      const options = q.opciones || [];

      if (q.tipo === 'seleccion') {
        const selected = userAnswers[currentIndex];
        area.innerHTML = options.map((opt, i) => `
          <div class="card option-card ${selected === opt ? 'option-card--selected' : ''}" data-option-idx="${i}">
            <div class="option-row">
              <input type="radio" name="single-choice" ${selected === opt ? 'checked' : ''} readonly>
              <span class="option-row__text">${global.Utils.escapeHtml(opt)}</span>
              <button type="button" class="icon-btn-speak" data-speak-option="${i}" aria-label="Escuchar opción">&#128266;</button>
            </div>
          </div>`).join('');

        options.forEach((opt, i) => {
          const card = area.querySelector(`[data-option-idx="${i}"]`);
          card.addEventListener('click', (e) => {
            if (e.target.closest('[data-speak-option]')) return;
            answerSingleChoice(opt);
          });
          card.querySelector('[data-speak-option]').addEventListener('click', (e) => {
            e.stopPropagation();
            speak(opt);
          });
        });
        return;
      }

      if (q.tipo === 'multiple') {
        const selected = Array.isArray(userAnswers[currentIndex]) ? userAnswers[currentIndex] : [];
        area.innerHTML = `
          <p class="text-muted">Selecciona todas las correctas:</p>
          ${options.map((opt, i) => `
            <div class="card option-card ${selected.includes(opt) ? 'option-card--selected' : ''}" data-option-idx="${i}">
              <div class="option-row">
                <input type="checkbox" ${selected.includes(opt) ? 'checked' : ''} readonly>
                <span class="option-row__text">${global.Utils.escapeHtml(opt)}</span>
                <button type="button" class="icon-btn-speak" data-speak-option="${i}" aria-label="Escuchar opción">&#128266;</button>
              </div>
            </div>`).join('')}`;

        options.forEach((opt, i) => {
          const card = area.querySelector(`[data-option-idx="${i}"]`);
          card.addEventListener('click', (e) => {
            if (e.target.closest('[data-speak-option]')) return;
            const isSelected = Array.isArray(userAnswers[currentIndex]) && userAnswers[currentIndex].includes(opt);
            answerMultipleChoice(opt, !isSelected);
          });
          card.querySelector('[data-speak-option]').addEventListener('click', (e) => {
            e.stopPropagation();
            speak(opt);
          });
        });
        return;
      }

      area.innerHTML = `<div class="empty-state"><p>Tipo de pregunta no soportado</p></div>`;
    }

    function renderScoreSummaryView() {
      const score = calculateScore();
      const total = questionnaire.length;
      const pct = total ? Math.round((score / total) * 100) : 0;

      containerEl.innerHTML = `
        <div class="card text-center">
          <div class="quiz-summary-icon">${isSimulacro ? '📝' : '✅'}</div>
          <h2>${isSimulacro ? 'Simulacro completado' : 'Cuestionario completado'}</h2>
          <p class="text-muted mb-0">${global.Utils.escapeHtml(questionnaireName)}</p>
        </div>

        <div class="card text-center">
          <p class="text-muted" style="font-weight:700;">Tu puntuación</p>
          <div class="quiz-score" style="color:${scoreColor(pct)};">${score} / ${total}</div>
          <div class="quiz-score-pct" style="color:${scoreColor(pct)};">${pct}%</div>
          <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%; background:${scoreColor(pct)};"></div></div>
        </div>

        <button id="btn-view-details" class="btn btn--primary">Ver respuestas detalladas</button>
        <button id="btn-exit-summary" class="btn btn--neutral">Salir</button>
      `;

      document.getElementById('btn-view-details').addEventListener('click', showDetailedResults);
      document.getElementById('btn-exit-summary').addEventListener('click', () => history.back());
    }

    function renderResultsView() {
      const score = calculateScore();
      const total = questionnaire.length;
      const allowAnswers = canShowResultsNow();

      containerEl.innerHTML = `
        <div class="card text-center">
          <div class="quiz-summary-icon">${isSimulacro ? '📝' : '✅'}</div>
          <h2>${isSimulacro ? 'Detalle del Simulacro' : 'Detalle de respuestas'}</h2>
          <p class="text-muted mb-0">Puntuación: ${score}/${total}</p>
        </div>

        ${questionnaire.map((q, i) => {
          const userAnswer = committedAnswers[i];
          const correct = isAnswerCorrect(i);
          const time = (questionTimers[i] || 0).toFixed(1);
          return `
            <div class="card">
              <div class="card__title">Pregunta ${i + 1}</div>
              <p>${global.Utils.escapeHtml(q.pregunta)}</p>
              <p style="color:var(--color-primary);">Tu respuesta: ${global.Utils.escapeHtml(userAnswer !== undefined ? String(userAnswer) : 'Sin responder')}</p>
              ${allowAnswers ? `
                <p style="color:var(--color-accent);">Respuesta correcta: ${global.Utils.escapeHtml(getCorrectAnswerText(q))}</p>
                <p style="color:${correct ? 'var(--color-accent)' : 'var(--color-danger)'}; font-weight:700;">
                  Resultado: ${correct ? 'Correcto' : 'Incorrecto'}
                </p>` : `
                <p class="text-muted">Podrás ver la respuesta correcta después de ${RESULTS_WAIT_MINUTES} minutos de haber completado el cuestionario.</p>`}
              <div class="card__meta mb-0">Tiempo: ${time} segundos</div>
            </div>`;
        }).join('')}

        <button id="btn-exit-results" class="btn btn--neutral">Salir</button>
      `;

      document.getElementById('btn-exit-results').addEventListener('click', () => history.back());
    }
  }

  global.QuestionnaireLogic = { render };
})(window);