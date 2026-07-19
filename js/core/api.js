/**
 * api.js
 * Comunicación HTTP con el servidor de cuestionarios.
 * Equivalente a las llamadas http.get/http.post de main.dart.
 *
 * Requiere en config.xml permitir tráfico saliente arbitrario
 * (ver <access origin="*"/> y android:usesCleartextTraffic en el manifest)
 * ya que la URL del servidor la ingresa el usuario en tiempo de ejecución.
 */
(function (global) {
  'use strict';

  const DEFAULT_TIMEOUT_MS = 10000;

  function withTimeout(promise, ms) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new ApiTimeoutError()), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
  }

  class ApiTimeoutError extends Error {
    constructor() {
      super('Tiempo de espera agotado.');
      this.name = 'ApiTimeoutError';
    }
  }

  class ApiHttpError extends Error {
    constructor(status, body) {
      super(`Error del servidor: ${status}`);
      this.name = 'ApiHttpError';
      this.status = status;
      this.body = body;
    }
  }

  /** GET {serverUrl}/cuestionarios -> lista de nombres de archivo .json */
  function listQuestionnaires(serverUrl) {
    const url = `${serverUrl}/cuestionarios`;
    return withTimeout(
      fetch(url, { headers: { Accept: 'application/json' } }),
      DEFAULT_TIMEOUT_MS
    ).then(async (res) => {
      if (!res.ok) throw new ApiHttpError(res.status, await res.text().catch(() => ''));
      const files = await res.json();
      return files
        .map(String)
        .filter((f) => f.toLowerCase().endsWith('.json'));
    });
  }

  /** GET {serverUrl}/cuestionarios/{name} -> contenido JSON del cuestionario */
  function downloadQuestionnaire(serverUrl, name) {
    const cleanName = name.endsWith('.json') ? name : `${name}.json`;
    const url = `${serverUrl}/cuestionarios/${encodeURIComponent(cleanName)}`;
    return withTimeout(
      fetch(url, { headers: { Accept: 'application/json' } }),
      DEFAULT_TIMEOUT_MS
    ).then(async (res) => {
      if (!res.ok) throw new ApiHttpError(res.status, await res.text().catch(() => ''));
      return { name: cleanName, data: await res.json() };
    });
  }

  /** POST {serverUrl}/respuestas con el contenido crudo de la respuesta */
  function uploadAnswer(serverUrl, answerJsonString) {
    const url = `${serverUrl}/respuestas`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: answerJsonString
    }).then(async (res) => {
      if (!res.ok) throw new ApiHttpError(res.status, await res.text().catch(() => ''));
      return res;
    });
  }

  global.Api = {
    listQuestionnaires,
    downloadQuestionnaire,
    uploadAnswer,
    ApiTimeoutError,
    ApiHttpError
  };
})(window);
