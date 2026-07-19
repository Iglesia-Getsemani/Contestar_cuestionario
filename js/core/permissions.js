/**
 * permissions.js
 * Equivalente a permission_handler (Permission.storage, Permission.camera).
 * Usa cordova-plugin-android-permissions si está disponible; en caso
 * contrario no hace nada (por ejemplo, al probar en navegador).
 *
 * Requiere en config.xml:
 *   <plugin name="cordova-plugin-android-permissions" spec="^1.1.5" />
 */
(function (global) {
  'use strict';

  function requestAll() {
    return new Promise((resolve) => {
      const permissions = global.cordova &&
        global.cordova.plugins &&
        global.cordova.plugins.permissions;

      if (!permissions) {
        // No estamos en un dispositivo Cordova con el plugin instalado.
        resolve({ granted: false, reason: 'plugin-not-available' });
        return;
      }

      const wanted = [
        permissions.CAMERA,
        permissions.WRITE_EXTERNAL_STORAGE,
        permissions.READ_EXTERNAL_STORAGE
      ];

      permissions.requestPermissions(
        wanted,
        (status) => resolve({ granted: !!status.hasPermission, reason: 'requested' }),
        () => resolve({ granted: false, reason: 'error' })
      );
    });
  }

  global.Permissions = { requestAll };
})(window);
