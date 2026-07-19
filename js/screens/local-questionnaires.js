/**
 * local-questionnaires.js
 * Equivalente a LocalQuestionnairesScreen de main.dart.
 * Lista los cuestionarios descargados y permite "Contestar",
 * "Simulacro" (con bloqueo de 30 min, igual que el original) o eliminar.
 */
(function (global) {
  'use strict';

  const SIMULACRO_COOLDOWN_MINUTES = 30;

  const els = {};
  let files = [];

  function init() {
    if (global.AppConfig.enforceExpiration()) return;

    els.list = document.getElementById('local-questionnaires-list');
    els.empty = document.getElementById('empty-state');
    els.userName = global.Utils.getQueryParam('user') || 'Usuario';

    global.GlobalAdTicker.mount();

    document.getElementById('btn-back').addEventListener('click', () => history.back());

    load();
  }

  function load() {
    global.UI.showLoading('Cargando cuestionarios...');
    global.Storage.listQuestionnaires()
      .then((list) => { files = list; render(); })
      .catch((err) => global.UI.toast(`Error al listar cuestionarios: ${err.message || err}`))
      .finally(() => global.UI.hideLoading());
  }

  function canTakeSimulacro(fileMeta) {
    return global.Utils.minutesSince(fileMeta.modified) >= SIMULACRO_COOLDOWN_MINUTES;
  }

  function render() {
    els.empty.classList.toggle('hidden', files.length > 0);
    els.list.innerHTML = files.map((f, idx) => {
      const name = global.Utils.stripJsonExt(f.name);
      const allowSimulacro = canTakeSimulacro(f);
      return `
        <div class="card">
          <div class="card__title">${global.Utils.escapeHtml(name)}</div>
          <div class="card__meta">Descargado: ${global.Utils.escapeHtml(global.Utils.formatDate(f.modified))}</div>
          <div class="btn-row">
            <button class="btn btn--accent btn--sm" style="flex:1;" data-answer="${idx}">Contestar</button>
            <button class="btn ${allowSimulacro ? 'btn--warning' : 'btn--neutral'} btn--sm" style="flex:1;"
                    data-simulacro="${idx}" ${allowSimulacro ? '' : 'disabled'}>Simulacro</button>
            <button class="btn btn--danger btn--icon-only" data-delete="${idx}">&#128465;</button>
          </div>
        </div>`;
    }).join('');

    els.list.querySelectorAll('[data-answer]').forEach((btn) =>
      btn.addEventListener('click', () => openQuiz(files[+btn.getAttribute('data-answer')], false)));
    els.list.querySelectorAll('[data-simulacro]').forEach((btn) =>
      btn.addEventListener('click', () => openQuiz(files[+btn.getAttribute('data-simulacro')], true)));
    els.list.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => deleteFile(files[+btn.getAttribute('data-delete')])));
  }

  function openQuiz(fileMeta, isSimulacro) {
    const params = new URLSearchParams({
      file: fileMeta.name,
      user: els.userName,
      simulacro: isSimulacro ? '1' : '0'
    });
    global.location.href = `quiz.html?${params.toString()}`;
  }

  function deleteFile(fileMeta) {
    global.UI.confirmDialog({
      title: 'Eliminar cuestionario',
      message: '¿Estás seguro de eliminar este cuestionario?',
      confirmLabel: 'Eliminar'
    }).then((confirmed) => {
      if (!confirmed) return;
      return global.Storage.deleteQuestionnaire(fileMeta.name).then(load);
    });
  }

  document.addEventListener('deviceready', init, false);
  if (!global.cordova) document.addEventListener('DOMContentLoaded', init);
})(window);
