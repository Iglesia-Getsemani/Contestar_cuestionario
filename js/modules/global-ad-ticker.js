/**
 * global-ad-ticker.js
 * Equivalente a global_ad_ticker.dart (GlobalAdTicker), que en la app
 * original envolvía cada pantalla para mostrar una barra de anuncios
 * persistente.
 *
 * TODO: contenido real / lógica de rotación avanzada pendiente de migrar
 * (no se recibió global_ad_ticker.dart). Por ahora se implementa una
 * barra inferior simple que rota los mensajes definidos en
 * js/config/ad-config.js (AdConfig.tickerMessages), lista para
 * enchufar la lógica definitiva.
 */
(function (global) {
  'use strict';

  function mount() {
    const settings = (global.AdConfig && global.AdConfig.adSettings) || {};
    if (settings.tickerEnabled === false) return;

    const messages = (global.AdConfig && global.AdConfig.tickerMessages) || [];
    if (!messages.length) return; // nada que mostrar todavía

    let el = document.getElementById('global-ad-ticker');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-ad-ticker';
      el.className = 'ad-ticker';
      document.body.appendChild(el);
    }

    const durationSec = settings.tickerIntervalSeconds || 22;
    const trackHtml = messages.map((m) => {
      const text = global.Utils.escapeHtml(m.text || '');
      return m.link
        ? `<a href="${global.Utils.escapeHtml(m.link)}" style="color:inherit; text-decoration:none;" target="_system">${text}</a>`
        : `<span>${text}</span>`;
    }).join('&nbsp;&nbsp;&bull;&nbsp;&nbsp;');

    el.innerHTML = `<div class="ad-ticker__track" style="animation-duration:${durationSec}s;">${trackHtml}</div>`;
  }

  function unmount() {
    const el = document.getElementById('global-ad-ticker');
    if (el) el.remove();
  }

  global.GlobalAdTicker = { mount, unmount };
})(window);
