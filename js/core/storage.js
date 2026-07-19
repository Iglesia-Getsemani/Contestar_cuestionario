/**
 * storage.js
 * Abstracción de almacenamiento local, equivalente al uso de
 * path_provider + dart:io en main.dart (getApplicationDocumentsDirectory,
 * Directory, File).
 *
 * - En dispositivo (Cordova/Android): usa cordova-plugin-file sobre
 *   cordova.file.dataDirectory (equivalente a ApplicationDocumentsDirectory).
 * - En navegador (sin Cordova, para desarrollo/pruebas): usa localStorage
 *   como respaldo, exponiendo exactamente la misma API async.
 *
 * Carpetas usadas (igual que en la app Flutter original):
 *   - "cuestionarios" -> cuestionarios descargados del servidor
 *   - "respuestas"     -> respuestas completadas localmente
 */
(function (global) {
  'use strict';

  const QUESTIONNAIRES_FOLDER = 'cuestionarios';
  const ANSWERS_FOLDER = 'respuestas';

  const hasCordovaFile = () =>
    !!(global.cordova && global.resolveLocalFileSystemURL && global.cordova.file);

  let _rootEntryPromise = null;

  function getRootEntry() {
    if (_rootEntryPromise) return _rootEntryPromise;
    _rootEntryPromise = new Promise((resolve, reject) => {
      global.resolveLocalFileSystemURL(global.cordova.file.dataDirectory, resolve, reject);
    });
    return _rootEntryPromise;
  }

  function getDirectory(folder, { create = true } = {}) {
    return getRootEntry().then(root => new Promise((resolve, reject) => {
      root.getDirectory(folder, { create }, resolve, reject);
    }));
  }

  function fileEntryToJson(entry) {
    return new Promise((resolve, reject) => {
      entry.file(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          try { resolve(JSON.parse(reader.result)); }
          catch (e) { reject(e); }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      }, reject);
    });
  }

  function fileEntryMeta(entry) {
    return new Promise((resolve, reject) => {
      entry.file(file => resolve({
        name: entry.name,
        path: entry.toURL(),
        modified: new Date(file.lastModifiedDate || file.lastModified),
        entry
      }), reject);
    });
  }

  // ── Implementación Cordova (dispositivo real) ─────────────────────────
  const cordovaImpl = {
    writeFile(folder, filename, dataObj) {
      return getDirectory(folder).then(dir => new Promise((resolve, reject) => {
        dir.getFile(filename, { create: true, exclusive: false }, fileEntry => {
          fileEntry.createWriter(writer => {
            writer.onwriteend = () => resolve(fileEntry);
            writer.onerror = reject;
            const blob = new Blob([JSON.stringify(dataObj)], { type: 'application/json' });
            writer.write(blob);
          }, reject);
        }, reject);
      }));
    },

    readFile(folder, filename) {
      return getDirectory(folder).then(dir => new Promise((resolve, reject) => {
        dir.getFile(filename, { create: false }, resolve, reject);
      })).then(fileEntryToJson);
    },

    deleteFile(folder, filename) {
      return getDirectory(folder).then(dir => new Promise((resolve, reject) => {
        dir.getFile(filename, { create: false }, fileEntry => {
          fileEntry.remove(resolve, reject);
        }, reject);
      }));
    },

    listFiles(folder) {
      return getDirectory(folder).then(dir => new Promise((resolve, reject) => {
        const reader = dir.createReader();
        reader.readEntries(entries => {
          const files = entries.filter(e => e.isFile && e.name.endsWith('.json'));
          Promise.all(files.map(fileEntryMeta)).then(resolve).catch(reject);
        }, reject);
      }));
    }
  };

  // ── Implementación de respaldo (navegador / localStorage) ─────────────
  const LS_PREFIX = 'cuestionarios_app::';
  const lsKey = (folder, filename) => `${LS_PREFIX}${folder}/${filename}`;
  const lsMetaKey = (folder, filename) => `${lsKey(folder, filename)}::meta`;

  const browserImpl = {
    writeFile(folder, filename, dataObj) {
      return Promise.resolve().then(() => {
        localStorage.setItem(lsKey(folder, filename), JSON.stringify(dataObj));
        localStorage.setItem(lsMetaKey(folder, filename), JSON.stringify({ modified: Date.now() }));
      });
    },

    readFile(folder, filename) {
      return Promise.resolve().then(() => {
        const raw = localStorage.getItem(lsKey(folder, filename));
        if (raw === null) throw new Error('Archivo no encontrado: ' + filename);
        return JSON.parse(raw);
      });
    },

    deleteFile(folder, filename) {
      return Promise.resolve().then(() => {
        localStorage.removeItem(lsKey(folder, filename));
        localStorage.removeItem(lsMetaKey(folder, filename));
      });
    },

    listFiles(folder) {
      return Promise.resolve().then(() => {
        const prefix = `${LS_PREFIX}${folder}/`;
        const files = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix) && !key.endsWith('::meta')) {
            const name = key.slice(prefix.length);
            const metaRaw = localStorage.getItem(`${key}::meta`);
            const meta = metaRaw ? JSON.parse(metaRaw) : { modified: Date.now() };
            files.push({ name, path: key, modified: new Date(meta.modified), entry: null });
          }
        }
        return files;
      });
    }
  };

  const impl = hasCordovaFile() ? cordovaImpl : browserImpl;

  if (!hasCordovaFile()) {
    console.warn('[storage.js] cordova-plugin-file no disponible: usando localStorage como respaldo (modo navegador/desarrollo).');
  }

  const Storage = {
    QUESTIONNAIRES_FOLDER,
    ANSWERS_FOLDER,
    isDeviceStorage: hasCordovaFile(),

    saveQuestionnaire: (filename, data) => impl.writeFile(QUESTIONNAIRES_FOLDER, filename, data),
    readQuestionnaire: (filename) => impl.readFile(QUESTIONNAIRES_FOLDER, filename),
    deleteQuestionnaire: (filename) => impl.deleteFile(QUESTIONNAIRES_FOLDER, filename),
    listQuestionnaires: () => impl.listFiles(QUESTIONNAIRES_FOLDER)
      .then(files => files.sort((a, b) => b.modified - a.modified)),

    saveAnswer: (filename, data) => impl.writeFile(ANSWERS_FOLDER, filename, data),
    readAnswer: (filename) => impl.readFile(ANSWERS_FOLDER, filename),
    deleteAnswer: (filename) => impl.deleteFile(ANSWERS_FOLDER, filename),
    listAnswers: () => impl.listFiles(ANSWERS_FOLDER)
      .then(files => files.sort((a, b) => b.modified - a.modified)),

    // Acceso genérico, por si módulos futuros (questionnaire-logic,
    // answer-review-logic) necesitan otra carpeta.
    writeFile: (folder, filename, data) => impl.writeFile(folder, filename, data),
    readFile: (folder, filename) => impl.readFile(folder, filename),
    deleteFile: (folder, filename) => impl.deleteFile(folder, filename),
    listFiles: (folder) => impl.listFiles(folder)
  };

  global.Storage = Storage;
})(window);
