/**
 * qr-scanner.js
 * Equivalente a QRScannerScreen (mobile_scanner) de main.dart.
 *
 * Usa cordova-plugin-barcodescanner (cordova.plugins.barcodeScanner),
 * el equivalente más común en Cordova a mobile_scanner de Flutter.
 * Instálalo con:
 *   cordova plugin add phonegap-plugin-barcodescanner
 *
 * Si el plugin no está disponible (p. ej. probando en navegador),
 * scan() se resuelve con null y la pantalla debe permitir el ingreso
 * manual de la URL (ya soportado en el menú principal).
 */
(function (global) {
  'use strict';

  function isAvailable() {
    return !!(global.cordova && global.cordova.plugins && global.cordova.plugins.barcodeScanner);
  }

  /**
   * Lanza el escáner nativo.
   * @returns {Promise<string|null>} el texto/URL escaneado, o null si se canceló
   *          o si el plugin no está disponible.
   */
  function scan() {
    if (!isAvailable()) {
      console.warn('[qr-scanner.js] cordova-plugin-barcodescanner no disponible.');
      return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
      global.cordova.plugins.barcodeScanner.scan(
        (result) => resolve(result.cancelled ? null : result.text),
        (error) => reject(new Error(error)),
        {
          preferFrontCamera: false,
          showFlipCameraButton: true,
          showTorchButton: true,
          prompt: 'Escanea el código QR con la URL del servidor',
          formats: 'QR_CODE',
          resultDisplayDuration: 0
        }
      );
    });
  }

  global.QrScanner = { isAvailable, scan };
})(window);
