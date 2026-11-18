window.PPV = window.PPV || {};
window.PPV.storage = (function () {
  const config = window.PPV.config;
  const FORM_VERSION = 2;

  function safeGet(storage, key) {
    try { return storage.getItem(key); } catch (_) { return null; }
  }

  function safeSet(storage, key, value) {
    try { storage.setItem(key, value); return true; } catch (_) { return false; }
  }

  function safeRemove(storage, key) {
    try { storage.removeItem(key); } catch (_) { /* Storage pode estar bloqueado. */ }
  }

  function asText(value) {
    return typeof value === 'string' ? value : '';
  }

  function splitLegacyList(value) {
    return String(value || '')
      .split(/[\n,;]+/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function emptyExperience(overrides) {
    return Object.assign({
      cargo: '', empresa: '', inicioMes: '', inicioAno: '',
      fimMes: '', fimAno: '', emAndamento: false, atividades: ''
    }, overrides || {});
  }

  function emptyCourse(overrides) {
    return Object.assign({
      nome: '', inicioMes: '', inicioAno: '', fimMes: '', fimAno: '', emAndamento: false
    }, overrides || {});
  }

  function normalizeExperience(item) {
    const raw = item && typeof item === 'object' ? item : {};
    return emptyExperience({
      cargo: asText(raw.cargo),
      empresa: asText(raw.empresa),
      inicioMes: asText(raw.inicioMes),
      inicioAno: asText(raw.inicioAno),
      fimMes: asText(raw.fimMes),
      fimAno: asText(raw.fimAno),
      emAndamento: Boolean(raw.emAndamento),
      atividades: asText(raw.atividades)
    });
  }

  function normalizeCourse(item) {
    const raw = item && typeof item === 'object' ? item : {};
    return emptyCourse({
      nome: asText(raw.nome),
      inicioMes: asText(raw.inicioMes),
      inicioAno: asText(raw.inicioAno),
      fimMes: asText(raw.fimMes),
      fimAno: asText(raw.fimAno),
      emAndamento: Boolean(raw.emAndamento)
    });
  }

  function migrate(raw) {
    const legacyExperiences = asText(raw.experiencias).trim();
    const experiencias = legacyExperiences
      ? [emptyExperience({ atividades: legacyExperiences })]
      : [];
    const cursos = splitLegacyList(raw.cursos).slice(0, 4).map(function (nome) {
      return emptyCourse({ nome: nome });
    });
    return {
      version: FORM_VERSION,
      nome: asText(raw.nome),
      email: asText(raw.email),
      telefone: asText(raw.telefone),
      endereco: asText(raw.endereco),
      objetivo: asText(raw.objetivo),
      habilidades: asText(raw.habilidades),
      formacao: asText(raw.formacao),
      diferenciais: asText(raw.diferenciais),
      experiencias: experiencias,
      cursos: cursos
    };
  }

  function normalizeForm(raw) {
    return {
      version: FORM_VERSION,
      nome: asText(raw.nome),
      email: asText(raw.email),
      telefone: asText(raw.telefone),
      endereco: asText(raw.endereco),
      objetivo: asText(raw.objetivo),
      habilidades: asText(raw.habilidades),
      formacao: asText(raw.formacao),
      diferenciais: asText(raw.diferenciais),
      experiencias: Array.isArray(raw.experiencias) ? raw.experiencias.map(normalizeExperience) : [],
      cursos: Array.isArray(raw.cursos) ? raw.cursos.map(normalizeCourse) : []
    };
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

  function loadForm() {
    const stored = safeGet(localStorage, config.formStorage);
    if (!stored) return null;
    try {
      const raw = JSON.parse(stored);
      if (!raw || typeof raw !== 'object') throw new Error('Formato inválido.');
      return raw.version === FORM_VERSION ? normalizeForm(raw) : migrate(raw);
    } catch (_) {
      safeRemove(localStorage, config.formStorage);
      return null;
    }
  }

  function saveForm(data) {
    const raw = data && typeof data === 'object' ? data : {};
    safeSet(localStorage, config.formStorage, JSON.stringify(normalizeForm(raw)));
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

  return {
    getApiKey, isApiKeyRemembered, saveApiKey, getModel, saveModel,
    loadForm, saveForm, clear, clearForm
  };
})();
