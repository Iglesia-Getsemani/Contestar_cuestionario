/**
 * user-selector.js
 * ------------------------------------------------------------------
 * Reemplaza la escritura libre del "Nombre de Usuario" en la pantalla
 * principal por una selección entre los usuarios creados en
 * usuarios.html (guardados en localStorage bajo la clave
 * "app_usuarios", el mismo formato { id, nombre, codigo }).
 *
 * El input#user-name se deja como <input readonly>, así que
 * cualquier código existente (por ejemplo main-menu.js) que lea
 * document.getElementById('user-name').value sigue funcionando sin
 * cambios: solo cambia CÓMO se llena ese valor.
 *
 * El usuario seleccionado se guarda en localStorage bajo
 * "app_usuario_seleccionado_id" y se restaura automáticamente al
 * abrir la app. Solo cambia cuando el usuario elige explícitamente
 * a otra persona en el modal.
 * ------------------------------------------------------------------
 */
(function () {
  var USERS_KEY = 'app_usuarios';
  var SELECTED_KEY = 'app_usuario_seleccionado_id';

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function getSelectedId() {
    return localStorage.getItem(SELECTED_KEY) || null;
  }

  function setSelectedId(id) {
    if (id) {
      localStorage.setItem(SELECTED_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_KEY);
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function applySelection(user) {
    var input = document.getElementById('user-name');
    if (!input) return;
    if (user) {
      input.value = user.codigo || '';
      input.dataset.userId = user.id;
      input.dataset.userName = user.nombre || '';
    } else {
      input.value = '';
      delete input.dataset.userId;
      delete input.dataset.userName;
    }
  }

  // Al cargar: intenta restaurar el último usuario seleccionado.
  // Si ese usuario ya no existe (fue borrado en usuarios.html),
  // limpia la selección en vez de dejar un id "fantasma".
  function restoreSelection() {
    var users = getUsers();
    var selId = getSelectedId();
    var found = selId ? users.filter(function (u) { return u.id === selId; })[0] : null;
    if (found) {
      applySelection(found);
    } else {
      setSelectedId(null);
      applySelection(null);
    }
  }

  function renderList(filterText) {
    var users = getUsers();
    var q = (filterText || '').trim().toLowerCase();
    if (q) {
      users = users.filter(function (u) {
        return u.nombre.toLowerCase().indexOf(q) !== -1 ||
               (u.codigo || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    var listEl = document.getElementById('usersel-list');
    var emptyEl = document.getElementById('usersel-empty');
    var searchEl = document.getElementById('usersel-search');
    listEl.innerHTML = '';

    if (!getUsers().length) {
      // No hay ningún usuario creado todavía.
      searchEl.style.display = 'none';
      emptyEl.style.display = 'block';
      emptyEl.querySelector('p').textContent = 'Todavía no hay usuarios creados.';
      return;
    }
    searchEl.style.display = '';

    if (!users.length) {
      emptyEl.style.display = 'block';
      emptyEl.querySelector('p').textContent = 'No se encontraron usuarios.';
      return;
    }
    emptyEl.style.display = 'none';

    var selId = getSelectedId();
    users.forEach(function (u) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'usersel-item' + (u.id === selId ? ' usersel-item--active' : '');
      item.innerHTML =
        '<span class="usersel-item-name">' + escapeHtml(u.nombre) + '</span>' +
        '<span class="usersel-item-code">' + escapeHtml(u.codigo || '') + '</span>';
      item.addEventListener('click', function () {
        setSelectedId(u.id);
        applySelection(u);
        closeModal();
      });
      listEl.appendChild(item);
    });
  }

  function openModal() {
    var searchEl = document.getElementById('usersel-search');
    searchEl.value = '';
    renderList('');
    document.getElementById('usersel-modal').classList.add('open');
    searchEl.focus();
  }

  function closeModal() {
    document.getElementById('usersel-modal').classList.remove('open');
  }

  document.addEventListener('DOMContentLoaded', function () {
    restoreSelection();

    var btn = document.getElementById('btn-select-user');
    if (btn) btn.addEventListener('click', openModal);

    var closeBtn = document.getElementById('usersel-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    var overlay = document.getElementById('usersel-modal');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
      });
    }

    var searchEl = document.getElementById('usersel-search');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        renderList(searchEl.value);
      });
    }

    var gotoBtn = document.getElementById('usersel-goto-users');
    if (gotoBtn) {
      gotoBtn.addEventListener('click', function () {
        window.location.href = 'usuarios.html';
      });
    }
  });

  // Si en otra pestaña/ventana se crean, editan o borran usuarios,
  // refresca la selección para no quedarse con un usuario obsoleto.
  window.addEventListener('storage', function (e) {
    if (e.key === USERS_KEY) {
      restoreSelection();
    }
  });
})();