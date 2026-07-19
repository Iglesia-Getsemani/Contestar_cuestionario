/**
 * app-config.js
 * Equivalente a app_config.dart (MyApp).
 * Controla la fecha de expiración de la aplicación y muestra
 * el aviso / pantalla de "aplicación obsoleta" cuando corresponde.
 */
(function (global) {
  'use strict';

  // Fecha de expiración de esta build (año, mes[1-12], día)
  const EXPIRATION_DATE = new Date(2026, 9, 5); // 5 de octubre de 2026
  const WARNING_DAYS_BEFORE = 2;

  function isExpired() {
    const now = new Date();
    return now >= EXPIRATION_DATE;
  }

  function isInWarningWindow() {
    const now = new Date();
    const warningDate = new Date(EXPIRATION_DATE);
    warningDate.setDate(warningDate.getDate() - WARNING_DAYS_BEFORE);
    return now >= warningDate && now < EXPIRATION_DATE;
  }

  function formattedExpirationDate() {
    return EXPIRATION_DATE.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  /**
   * Debe llamarse al inicio de cada pantalla (antes de pintar nada).
   * Si la app expiró, reemplaza todo el <body> por la pantalla de bloqueo
   * y detiene la ejecución del resto de la app (devuelve true).
   */
  function enforceExpiration() {
    if (!isExpired()) return false;

    document.body.innerHTML = `
      <div class="screen">
        <div class="content text-center" style="justify-content:center; display:flex; flex-direction:column; margin:auto;">
          <div style="font-size:56px; color:var(--color-danger); margin-bottom:16px;">&#9888;</div>
          <h1>Aplicación obsoleta</h1>
          <p class="text-muted">
            Esta versión ha caducado. Contacte al proveedor para una actualización.
          </p>
        </div>
      </div>`;
    return true;
  }

  /**
   * Muestra el diálogo de advertencia de próxima expiración
   * (equivalente al AlertDialog mostrado en initState de MainMenuScreen).
   */
  function maybeShowExpirationWarning() {
    if (!isInWarningWindow()) return;
    if (!global.UI || !global.UI.confirmDialog) return;

    global.UI.alertDialog({
      title: 'Advertencia',
      message: `Esta aplicación caducará el ${formattedExpirationDate()}. ` +
               `Por favor, actualice a la versión más reciente antes de esa fecha.`,
      okLabel: 'Aceptar'
    });
  }

  global.AppConfig = {
    EXPIRATION_DATE,
    isExpired,
    isInWarningWindow,
    formattedExpirationDate,
    enforceExpiration,
    maybeShowExpirationWarning
  };
})(window);
