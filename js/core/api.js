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

  /** GET {serverUrl}/cuestionarios -> lista de objetos {id, nombre, descripcion, asignatura, denominacion_id, institucion_id, activo, created_at} */
  function listQuestionnaires(serverUrl) {
    const url = `${serverUrl}/cuestionarios`;
    return withTimeout(
      fetch(url, { headers: { Accept: 'application/json' } }),
      DEFAULT_TIMEOUT_MS
    ).then(async (res) => {
      if (!res.ok) throw new ApiHttpError(res.status, await res.text().catch(() => ''));
      const cuestionarios = await res.json();
      // El servidor devuelve filas de la tabla "cuestionarios" (objetos con id/nombre/...),
      // NO nombres de archivo .json — no filtrar por extensión aquí.
      return Array.isArray(cuestionarios) ? cuestionarios : [];
    });
  }

  /** GET {serverUrl}/cuestionarios/{id} -> cuestionario completo (metadata + preguntas + opciones) */
  function downloadQuestionnaire(serverUrl, id) {
    const url = `${serverUrl}/cuestionarios/${encodeURIComponent(id)}`;
    return withTimeout(
      fetch(url, { headers: { Accept: 'application/json' } }),
      DEFAULT_TIMEOUT_MS
    ).then(async (res) => {
      if (!res.ok) throw new ApiHttpError(res.status, await res.text().catch(() => ''));
      const data = await res.json();
      return { id, name: data.nombre, data };
    });
  }

  /** POST {serverUrl}/cuestionarios/{cuestionarioId}/intentos
   *  Espera: { codigo, es_simulacro, intento_numero, respuestas: [{pregunta_id, respuesta_usuario, tiempo_respuesta}] }
   *  OJO: este endpoint es distinto al que llamaba antes esta función (/respuestas ya no existe
   *  en el worker actual). answerData debe traer al menos cuestionario_id y codigo; revisa dónde
   *  se genera el JSON de respuesta local para asegurarte de que tenga esa forma.
   */
  function uploadAnswer(serverUrl, answerData) {
    const parsed = typeof answerData === 'string' ? JSON.parse(answerData) : answerData;
    if (!parsed.cuestionario_id) {
      return Promise.reject(new Error('La respuesta local no tiene cuestionario_id; no se puede subir con el servidor actual.'));
    }
    const url = `${serverUrl}/cuestionarios/${encodeURIComponent(parsed.cuestionario_id)}/intentos`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    }).then(async (res) => {
      if (!res.ok) throw new ApiHttpError(res.status, await res.text().catch(() => ''));
      return res.json();
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