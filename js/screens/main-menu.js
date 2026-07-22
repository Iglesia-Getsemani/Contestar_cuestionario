/**
 * main-menu.js
 * Equivalente a MainMenuScreen (_MainMenuScreenState) de main.dart.
 * Controla la pantalla principal: conectar con el servidor, listar y
 * descargar cuestionarios, listar/subir/eliminar respuestas locales,
 * y abrir el directorio.
 */
(function (global) {
  'use strict';

  const els = {}; // referencias DOM, resueltas en init()

  let availableQuestionnaires = []; // nombres .json en el servidor
  let localAnswerFiles = [];        // [{name, path, modified}]

  // ── Ciclo de vida ──────────────────────────────────────────────────────
  function init() {
    if (global.AppConfig.enforceExpiration()) return;

    cacheDom();
    bindEvents();
    global.GlobalAdTicker.mount();
    global.GlobalAdManager.initialize();

    global.Permissions.requestAll();
    refreshLocalQuestionnairesCount();
    listLocalAnswers();

    global.AppConfig.maybeShowExpirationWarning();
  }

  function cacheDom() {
    els.serverUrl = document.getElementById('server-url');
    els.userName = document.getElementById('user-name');
    els.status = document.getElementById('status-container');
    els.serverList = document.getElementById('server-questionnaires-list');
    els.answersList = document.getElementById('local-answers-list');
    els.btnScanQr = document.getElementById('btn-scan-qr');
    els.btnConnect = document.getElementById('btn-connect');
    els.btnLocal = document.getElementById('btn-local-questionnaires');
    els.btnAnswers = document.getElementById('btn-manage-answers');
    els.btnDirectory = document.getElementById('btn-directory');
  }

  function bindEvents() {
    els.btnScanQr.addEventListener('click', scanQr);
    els.serverUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') conectarYListar(els.serverUrl.value);
    });
    els.btnConnect.addEventListener('click', () => conectarYListar(els.serverUrl.value));
    els.btnLocal.addEventListener('click', goToLocalQuestionnaires);
    els.btnAnswers.addEventListener('click', listLocalAnswers);
    els.btnDirectory.addEventListener('click', showDirectory);
  }

  // ── Conectar + listar (flujo unificado, igual que en main.dart) ───────
  function conectarYListar(rawUrl) {
    if (!rawUrl || !rawUrl.trim()) {
      renderStatus('Por favor ingresa la URL del servidor.', true);
      return;
    }

    const serverUrl = global.Utils.normalizeUrl(rawUrl);
    els.serverUrl.value = serverUrl;

    availableQuestionnaires = [];
    renderServerList();
    global.UI.showLoading(`Conectando con ${serverUrl}...`);
    renderStatus(`Conectando con ${serverUrl}...`, false);

    global.Api.listQuestionnaires(serverUrl)
      .then((questionnaires) => {
        availableQuestionnaires = questionnaires;
        renderServerList();
        renderStatus(
          questionnaires.length === 0
            ? 'El servidor no tiene cuestionarios disponibles.'
            : `Cuestionarios disponibles: ${questionnaires.length}`,
          false
        );
      })
      .catch((err) => handleApiError(err, 'al conectar'))
      .finally(() => global.UI.hideLoading());
  }

  function handleApiError(err, contextLabel) {
    if (err instanceof global.Api.ApiTimeoutError) {
      renderStatus('Tiempo de espera agotado. Verifica la URL y la red.', true);
    } else if (err instanceof global.Api.ApiHttpError) {
      renderStatus(`Error del servidor: ${err.status}`, true);
    } else {
      renderStatus(`Error de conexión ${contextLabel}: ${err.message || err}`, true);
    }
  }

  // ── Escanear QR ─────────────────────────────────────────────────────
  function scanQr() {
    global.QrScanner.scan()
      .then((result) => {
        if (result) conectarYListar(result);
        else if (!global.QrScanner.isAvailable()) {
          global.UI.toast('Escáner no disponible en este entorno. Ingresa la URL manualmente.');
        }
      })
      .catch((err) => renderStatus(`Error al escanear QR: ${err.message || err}`, true));
  }

  // ── Descargar cuestionario ──────────────────────────────────────────
  function downloadQuestionnaire(id) {
    const serverUrl = global.Utils.normalizeUrl(els.serverUrl.value);
    global.UI.showLoading('Descargando cuestionario...');

    global.Api.downloadQuestionnaire(serverUrl, id)
      .then(({ id: cuestionarioId, data }) => {
        // Se guarda con el id como nombre de archivo local (único y seguro),
        // y se incrusta cuestionario_id en los datos para poder subir la
        // respuesta más adelante contra /cuestionarios/{id}/intentos.
        const localData = { ...data, cuestionario_id: cuestionarioId };
        return global.Storage.saveQuestionnaire(`${cuestionarioId}.json`, localData);
      })
      .then(() => {
        renderStatus('Cuestionario descargado exitosamente', false);
        return refreshLocalQuestionnairesCount();
      })
      .catch((err) => handleApiError(err, 'al descargar'))
      .finally(() => global.UI.hideLoading());
  }

  // ── Cuestionarios locales ────────────────────────────────────────────
  function refreshLocalQuestionnairesCount() {
    return global.Storage.listQuestionnaires().catch(() => []);
  }

  function goToLocalQuestionnaires() {
    global.location.href = 'screens/local-questionnaires.html';
  }

  // ── Respuestas locales ────────────────────────────────────────────────
  function listLocalAnswers() {
    global.Storage.listAnswers()
      .then((files) => {
        localAnswerFiles = files;
        renderAnswersList();
        renderStatus(`Respuestas locales encontradas: ${files.length}`, false);
      })
      .catch((err) => renderStatus(`Error al listar respuestas: ${err.message || err}`, true));
  }

  function uploadLocalAnswer(fileMeta) {
    global.Storage.readAnswer(fileMeta.name)
      .then((answerData) => {
        if (answerData.es_simulacro === true) {
          renderStatus('Esta respuesta es de un simulacro y no se puede subir', true);
          return Promise.reject({ silent: true });
        }
        global.UI.showLoading('Subiendo respuesta al servidor...');
        const serverUrl = global.Utils.normalizeUrl(els.serverUrl.value);
        return global.Api.uploadAnswer(serverUrl, JSON.stringify(answerData));
      })
      .then(() => {
        global.UI.hideLoading();
        renderStatus('Respuesta subida exitosamente al servidor', false);
        return global.UI.confirmDialog({
          title: 'Subida exitosa',
          message: '¿Deseas eliminar la respuesta local ya que fue subida al servidor?',
          cancelLabel: 'No',
          confirmLabel: 'Sí, eliminar'
        });
      })
      .then((shouldDelete) => {
        if (shouldDelete) {
          return global.Storage.deleteAnswer(fileMeta.name).then(listLocalAnswers);
        }
      })
      .catch((err) => {
        if (err && err.silent) return;
        handleApiError(err, 'al subir respuesta');
      })
      .finally(() => global.UI.hideLoading());
  }

  function deleteLocalAnswer(fileMeta) {
    global.UI.confirmDialog({
      title: 'Confirmar eliminación',
      message: '¿Estás seguro de que quieres eliminar esta respuesta?',
      confirmLabel: 'Eliminar'
    }).then((confirmed) => {
      if (!confirmed) return;
      return global.Storage.deleteAnswer(fileMeta.name).then(listLocalAnswers);
    });
  }

  function viewAnswerDetails(fileMeta) {
    global.location.href = `screens/answer-review.html?file=${encodeURIComponent(fileMeta.name)}`;
  }

  // ── Directorio ────────────────────────────────────────────────────────
  function showDirectory() {
    const items = global.AdConfig.directoryItems || [];
    const bodyHtml = items.length
      ? items.map(itemCardHtml).join('')
      : `<p class="text-muted">Aún no hay elementos configurados en el directorio.</p>`;

    global.UI.customModal({ title: 'Directorio', bodyHtml });
  }

  function itemCardHtml(item) {
    const color = item.cardColor || 'var(--color-primary)';
    const website = (item.website || '').replace(/^https?:\/\//, '');
    const href = item.website
      ? (item.website.startsWith('http') ? item.website : `https://${item.website}`)
      : '#';
    return `
      <div class="card" style="border:1.5px solid ${color}; box-shadow:none;">
        <div class="card__title" style="color:${color};">${global.Utils.escapeHtml(item.name || '')}</div>
        <p>${global.Utils.escapeHtml(item.description || '')}</p>
        <p class="text-muted mb-0">Dirección: ${global.Utils.escapeHtml(item.address || '')}</p>
        <p class="text-muted">Teléfono: ${global.Utils.escapeHtml(item.phone || '')}</p>
        ${item.website ? `<a href="${global.Utils.escapeHtml(href)}" target="_system" style="color:${color}; text-decoration:underline; font-weight:600;">Web: ${global.Utils.escapeHtml(website)}</a>` : ''}
      </div>`;
  }

  // ── Render ───────────────────────────────────────────────────────────
  function renderStatus(message, isError) {
    global.UI.setStatus(els.status, message, isError);
  }

  function renderServerList() {
    if (!availableQuestionnaires.length) {
      els.serverList.innerHTML = '';
      return;
    }
    els.serverList.innerHTML = `
      <div class="section-title">Cuestionarios disponibles en el servidor</div>
      ${availableQuestionnaires.map((q) => `
        <div class="list-item">
          <span class="list-item__title">${global.Utils.escapeHtml(q.nombre || '(sin nombre)')}</span>
          <button class="btn btn--accent btn--sm" data-download="${global.Utils.escapeHtml(q.id)}">Descargar</button>
        </div>
      `).join('')}`;

    els.serverList.querySelectorAll('[data-download]').forEach((btn) => {
      btn.addEventListener('click', () => downloadQuestionnaire(btn.getAttribute('data-download')));
    });
  }

  function renderAnswersList() {
    if (!localAnswerFiles.length) {
      els.answersList.innerHTML = '';
      return;
    }
    els.answersList.innerHTML = `
      <div class="section-title">Respuestas locales</div>
      ${localAnswerFiles.map((f, idx) => `
        <div class="card">
          <div class="card__title">${global.Utils.escapeHtml(global.Utils.stripJsonExt(f.name))}</div>
          <div class="card__meta">Modificado: ${global.Utils.escapeHtml(global.Utils.formatDate(f.modified))}</div>
          <div class="btn-row">
            <button class="btn btn--outline btn--sm" style="flex:1;" data-view="${idx}">Ver</button>
            <button class="btn btn--accent btn--sm" style="flex:1;" data-upload="${idx}">Subir</button>
            <button class="btn btn--danger btn--icon-only" data-delete="${idx}">&#128465;</button>
          </div>
        </div>
      `).join('')}`;

    els.answersList.querySelectorAll('[data-view]').forEach((btn) =>
      btn.addEventListener('click', () => viewAnswerDetails(localAnswerFiles[+btn.getAttribute('data-view')])));
    els.answersList.querySelectorAll('[data-upload]').forEach((btn) =>
      btn.addEventListener('click', () => uploadLocalAnswer(localAnswerFiles[+btn.getAttribute('data-upload')])));
    els.answersList.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => deleteLocalAnswer(localAnswerFiles[+btn.getAttribute('data-delete')])));
  }

  document.addEventListener('deviceready', init, false);
  // Permite pruebas en navegador (sin Cordova) donde 'deviceready' no dispara.
  if (!global.cordova) {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window);