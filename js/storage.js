window.PPV = window.PPV || {};
window.PPV.storage = (function () {
  const config = window.PPV.config;
  const formIds = ['nome', 'email', 'telefone', 'endereco', 'objetivo', 'habilidades', 'experiencias', 'formacao', 'cursos', 'diferenciais'];

  function safeGet(storage, key) {
    try { return storage.getItem(key); } catch (_) { return null; }
  }

  function safeSet(storage, key, value) {
    try { storage.setItem(key, value); return true; } catch (_) { return false; }
  }

  function safeRemove(storage, key) {
    try { storage.removeItem(key); } catch (_) { /* Storage pode estar bloqueado. */ }
  }

  function getApiKey() {
    return safeGet(localStorage, config.apiKeyLocalStorage) || safeGet(sessionStorage, config.apiKeySessionStorage) || '';
  }

  function isApiKeyRemembered() {
    return Boolean(safeGet(localStorage, config.apiKeyLocalStorage));
  }

  function saveApiKey(value, remember) {
    safeRemove(sessionStorage, config.apiKeySessionStorage);
    safeRemove(localStorage, config.apiKeyLocalStorage);
    if (!value) return;
    safeSet(remember ? localStorage : sessionStorage, remember ? config.apiKeyLocalStorage : config.apiKeySessionStorage, value);
  }

  function getModel() {
    return safeGet(localStorage, config.modelStorage) || '';
  }

  function saveModel(value) {
    if (!value) return;
    safeSet(localStorage, config.modelStorage, value);
  }

  function restoreForm() {
    const stored = safeGet(localStorage, config.formStorage);
    if (!stored) return;
    try {
      const values = JSON.parse(stored);
      formIds.forEach(function (id) {
        const input = document.getElementById(id);
        if (input && typeof values[id] === 'string') input.value = values[id];
      });
    } catch (_) { safeRemove(localStorage, config.formStorage); }
  }

  function saveForm() {
    const values = {};
    formIds.forEach(function (id) {
      const input = document.getElementById(id);
      values[id] = input ? input.value : '';
    });
    safeSet(localStorage, config.formStorage, JSON.stringify(values));
  }

  function clear() {
    safeRemove(localStorage, config.formStorage);
    safeRemove(localStorage, config.apiKeyLocalStorage);
    safeRemove(localStorage, config.modelStorage);
    safeRemove(sessionStorage, config.apiKeySessionStorage);
  }

  function clearForm() {
    safeRemove(localStorage, config.formStorage);
  }

  return { getApiKey, isApiKeyRemembered, saveApiKey, getModel, saveModel, restoreForm, saveForm, clear, clearForm };
})();
