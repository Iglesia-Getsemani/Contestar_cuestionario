/**
 * utils.js
 * Funciones auxiliares compartidas por toda la app.
 */
(function (global) {
  'use strict';

  /** Normaliza la URL del servidor: agrega http:// si falta y quita barra/sufijo extra. */
  function normalizeUrl(raw) {
    let url = (raw || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
    }
    if (url.endsWith('/')) url = url.slice(0, -1);
    url = url.replace(/\/cuestionarios$/, '');
    return url;
  }

  /** Quita la extensión .json de un nombre de archivo. */
  function stripJsonExt(name) {
    return (name || '').replace(/\.json$/i, '');
  }

  /** Asegura que el nombre termine en .json */
  function ensureJsonExt(name) {
    return name.endsWith('.json') ? name : name + '.json';
  }

  /** Devuelve el último segmento de una ruta tipo /a/b/c.json -> c.json */
  function baseName(path) {
    return (path || '').split('/').pop();
  }

  /** Formatea una fecha ISO/Date de forma legible en español. */
  function formatDate(dateLike) {
    const d = (dateLike instanceof Date) ? dateLike : new Date(dateLike);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  /** Diferencia en minutos entre ahora y una fecha dada. */
  function minutesSince(dateLike) {
    const d = (dateLike instanceof Date) ? dateLike : new Date(dateLike);
    if (isNaN(d.getTime())) return Infinity;
    return (Date.now() - d.getTime()) / 60000;
  }

  /** Escapa texto para inserción segura en HTML. */
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /** Lee un parámetro de la query string de la página actual. */
  function getQueryParam(name) {
    return new URLSearchParams(global.location.search).get(name);
  }

  global.Utils = {
    normalizeUrl,
    stripJsonExt,
    ensureJsonExt,
    baseName,
    formatDate,
    minutesSince,
    escapeHtml,
    getQueryParam
  };
})(window);
