/**
 * ui.js
 * Utilidades de interfaz reutilizables en todas las pantallas:
 * overlay de carga, diálogos modales (alert/confirm) y snackbar.
 * No depende de ningún framework; usa el DOM directamente.
 */
(function (global) {
  'use strict';

  function ensureLoadingOverlay() {
    let el = document.getElementById('loading-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading-overlay';
      el.className = 'loading-overlay';
      el.innerHTML = `
        <div class="spinner"></div>
        <div id="loading-overlay-text" class="text-muted"></div>`;
      document.body.appendChild(el);
    }
    return el;
  }

  function showLoading(message) {
    const el = ensureLoadingOverlay();
    document.getElementById('loading-overlay-text').textContent = message || 'Cargando...';
    el.classList.add('is-visible');
  }

  function hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.remove('is-visible');
  }

  /** Pinta (o actualiza) una caja de estado dentro de un contenedor dado. */
  function setStatus(containerEl, message, isError) {
    if (!containerEl) return;
    if (!message) {
      containerEl.innerHTML = '';
      return;
    }
    containerEl.innerHTML = `
      <div class="status-box ${isError ? 'status-box--error' : ''}">
        ${global.Utils.escapeHtml(message)}
      </div>`;
  }

  function ensureModalRoot() {
    let backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'modal-backdrop';
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = '<div class="modal" id="modal-content"></div>';
      document.body.appendChild(backdrop);
    }
    return backdrop;
  }

  function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.classList.remove('is-visible');
  }

  function alertDialog({ title, message, okLabel = 'Aceptar' } = {}) {
    return new Promise((resolve) => {
      const backdrop = ensureModalRoot();
      const content = document.getElementById('modal-content');
      content.innerHTML = `
        <div class="modal__header"><h3>${global.Utils.escapeHtml(title || '')}</h3></div>
        <div class="modal__body"><p>${global.Utils.escapeHtml(message || '')}</p></div>
        <button class="btn btn--primary" id="modal-ok-btn">${global.Utils.escapeHtml(okLabel)}</button>`;
      backdrop.classList.add('is-visible');
      document.getElementById('modal-ok-btn').onclick = () => {
        closeModal();
        resolve(true);
      };
    });
  }

  function confirmDialog({ title, message, cancelLabel = 'Cancelar', confirmLabel = 'Aceptar' } = {}) {
    return new Promise((resolve) => {
      const backdrop = ensureModalRoot();
      const content = document.getElementById('modal-content');
      content.innerHTML = `
        <div class="modal__header"><h3>${global.Utils.escapeHtml(title || '')}</h3></div>
        <div class="modal__body"><p>${global.Utils.escapeHtml(message || '')}</p></div>
        <div class="btn-row">
          <button class="btn btn--outline" id="modal-cancel-btn">${global.Utils.escapeHtml(cancelLabel)}</button>
          <button class="btn btn--danger" id="modal-confirm-btn">${global.Utils.escapeHtml(confirmLabel)}</button>
        </div>`;
      backdrop.classList.add('is-visible');
      document.getElementById('modal-cancel-btn').onclick = () => { closeModal(); resolve(false); };
      document.getElementById('modal-confirm-btn').onclick = () => { closeModal(); resolve(true); };
    });
  }

  /** Modal genérico de contenido libre (usado por el Directorio, por ejemplo). */
  function customModal({ title, bodyHtml, closeLabel = 'Cerrar' } = {}) {
    const backdrop = ensureModalRoot();
    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <div class="modal__header">
        <h3>${global.Utils.escapeHtml(title || '')}</h3>
      </div>
      <div class="modal__body">${bodyHtml || ''}</div>
      <button class="btn btn--outline mt-4" id="modal-close-btn">${global.Utils.escapeHtml(closeLabel)}</button>`;
    backdrop.classList.add('is-visible');
    document.getElementById('modal-close-btn').onclick = closeModal;
  }

  function toast(message, ms = 2500) {
    let el = document.getElementById('app-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-toast';
      el.style.cssText = `
        position:fixed; left:50%; bottom:calc(var(--ad-ticker-height) + 16px);
        transform:translateX(-50%); background:#1F2430; color:#fff;
        padding:10px 18px; border-radius:20px; font-size:14px;
        z-index:60; opacity:0; transition:opacity .2s ease; max-width:85vw; text-align:center;`;
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => { el.style.opacity = '0'; }, ms);
  }

  global.UI = {
    showLoading,
    hideLoading,
    setStatus,
    alertDialog,
    confirmDialog,
    customModal,
    closeModal,
    toast
  };
})(window);
