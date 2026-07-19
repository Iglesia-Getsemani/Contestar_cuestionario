/**
 * global-ad-manager.js
 * Equivalente a global_ad_manager.dart (GlobalAdManager().initialize(),
 * llamado una única vez en main() antes de arrancar la app).
 *
 * TODO: lógica real de inicialización del proveedor de anuncios pendiente
 * de migrar (no se recibió global_ad_manager.dart: por ejemplo, SDK de
 * anuncios, precarga, frecuencia, analítica, etc.). Este stub deja el
 * punto de enganche listo y documentado.
 */
(function (global) {
  'use strict';

  let _initialized = false;

  function initialize() {
    if (_initialized) return;
    _initialized = true;

    // TODO: inicializar aquí el proveedor de anuncios real
    // (SDK nativo vía plugin Cordova, precarga de creatividades, etc.)
    console.info('[global-ad-manager.js] initialize() — stub, pendiente de implementación.');
  }

  global.GlobalAdManager = { initialize };
})(window);
