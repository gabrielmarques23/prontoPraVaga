window.PPV = window.PPV || {};
window.PPV.main = (function () {
  let activeController = null;
  let saveTimer = null;

  function notify(message) {
    const notice = document.getElementById('notificacao');
    notice.textContent = message;
    notice.classList.add('visivel');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(function () { notice.classList.remove('visivel'); }, 4500);
  }

  function getFormData() {
    return {
      nome: document.getElementById('nome').value.trim(),
      telefone: document.getElementById('telefone').value.trim(),
      cidade: document.getElementById('endereco').value.trim(),
      objetivo: document.getElementById('objetivo').value.trim(),
      habilidades: document.getElementById('habilidades').value.trim(),
      experiencias: document.getElementById('experiencias').value.trim(),
      formacao: document.getElementById('formacao').value.trim(),
      diferenciais: document.getElementById('diferenciais').value.trim()
    };
  }

  function setLoading(isLoading) {
    const button = document.getElementById('btnGerar');
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Gerando currículo...' : 'Gerar Currículo Perfeito';
    document.getElementById('btnCancelar').classList.toggle('hidden', !isLoading);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const apiKeyInput = document.getElementById('apiKey');
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      apiKeyInput.setAttribute('aria-invalid', 'true');
      apiKeyInput.focus();
      notify('Informe a chave da API do Gemini.');
      return;
    }
    apiKeyInput.removeAttribute('aria-invalid');
    window.PPV.storage.saveApiKey(apiKey, document.getElementById('lembrarChave').checked);
    activeController = new AbortController();
    setLoading(true);
    try {
      const result = await window.PPV.gemini.generate(apiKey, getFormData(), activeController.signal);
      window.PPV.renderer.render(result);
      document.getElementById('acoesArea').classList.remove('hidden');
      document.getElementById('curriculoOutput').scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('curriculoOutput').focus({ preventScroll: true });
    } catch (error) {
      if (error.name === 'AbortError') notify('Geração cancelada.');
      else notify(error.message || 'Não foi possível gerar o currículo.');
    } finally {
      activeController = null;
      setLoading(false);
    }
  }

  function bind() {
    window.PPV.storage.restoreForm();
    const remember = document.getElementById('lembrarChave');
    const apiKey = document.getElementById('apiKey');
    const savedKey = window.PPV.storage.getApiKey();
    if (savedKey) apiKey.value = savedKey;
    remember.checked = window.PPV.storage.isApiKeyRemembered();

    document.getElementById('formCurriculo').addEventListener('submit', handleSubmit);
    document.getElementById('btnImprimir').addEventListener('click', function () { window.print(); });
    document.getElementById('btnCopiar').addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(window.PPV.renderer.asPlainText());
        notify('Currículo copiado.');
      } catch (_) { notify('Não foi possível copiar. Selecione o texto do currículo manualmente.'); }
    });
    document.getElementById('btnCancelar').addEventListener('click', function () {
      if (activeController) activeController.abort();
    });
    document.getElementById('btnLimpar').addEventListener('click', function () {
      window.PPV.storage.clear();
      window.PPV.storage.clearForm();
      document.getElementById('formCurriculo').reset();
      remember.checked = false;
      notify('Dados salvos e chave removidos deste navegador.');
    });
    document.getElementById('btnMostrarChave').addEventListener('click', function (event) {
      const isPassword = apiKey.type === 'password';
      apiKey.type = isPassword ? 'text' : 'password';
      event.currentTarget.textContent = isPassword ? 'Ocultar chave' : 'Mostrar chave';
    });
    apiKey.addEventListener('change', function () {
      window.PPV.storage.saveApiKey(apiKey.value.trim(), remember.checked);
    });
    remember.addEventListener('change', function () {
      window.PPV.storage.saveApiKey(apiKey.value.trim(), remember.checked);
      notify(remember.checked ? 'A chave será lembrada neste dispositivo.' : 'A chave ficará salva apenas nesta sessão.');
    });
    document.getElementById('formCurriculo').addEventListener('input', function (event) {
      if (event.target.id === 'apiKey') return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(window.PPV.storage.saveForm, 500);
    });
  }

  return { bind };
})();
