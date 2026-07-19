/**
 * ad-config.js
 * Equivalente a ad_config.dart.
 *
 * TODO: este módulo aún no se ha migrado desde el original ad_config.dart
 * (no se recibió ese archivo). Aquí solo se define la ESTRUCTURA de datos
 * esperada por el resto de la app (main-menu.js, global-ad-ticker.js) para
 * que puedas completarla sin tocar el resto del código.
 */
(function (global) {
  'use strict';

  /**
   * Ítems del "Directorio" (modal que se abre desde el menú principal).
   * Cada ítem: { name, description, address, phone, website, cardColor }
   * cardColor: color HEX usado para el borde/acento de la tarjeta.
   */
  const directoryItems = [
    // Ejemplo (eliminar / reemplazar con datos reales):
    // {
    //   name: 'Nombre del negocio',
    //   description: 'Descripción breve',
    //   address: 'Dirección completa',
    //   phone: '+57 300 000 0000',
    //   website: 'www.ejemplo.com',
    //   cardColor: '#2AA9A2'
    // },
  ];

  /**
   * Mensajes que rotan en la barra de anuncios inferior (global-ad-ticker.js).
   * Cada ítem: { text, link? }
   */
  const tickerMessages = [
    // { text: 'Mensaje publicitario de ejemplo', link: 'https://ejemplo.com' },
  ];

  /**
   * Configuración general de anuncios (frecuencia, proveedor, etc.)
   * a completar según el mecanismo real usado por global_ad_manager.dart.
   */
  const adSettings = {
    tickerEnabled: true,
    tickerIntervalSeconds: 22,
  };

  global.AdConfig = {
    directoryItems,
    tickerMessages,
    adSettings
  };
})(window);
