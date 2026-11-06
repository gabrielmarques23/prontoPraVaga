window.PPV = window.PPV || {};
window.PPV.main = (function () {
  let activeController = null;
  let saveTimer = null;
  let elapsedTimer = null;
  let fitTimer = null;
  let startedAt = 0;
  let progressLabel = '';

  function el(id) {
    return document.getElementById(id);
  }

  function notify(message, durationMs) {
    const notice = el('notificacao');
    notice.textContent = message;
    notice.classList.add('visivel');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(function () { notice.classList.remove('visivel'); }, durationMs || 4500);
  }

  function getFormData() {
    return {
      nome: el('nome').value.trim(),
      email: el('email').value.trim(),
      telefone: el('telefone').value.trim(),
      cidade: el('endereco').value.trim(),
      objetivo: el('objetivo').value.trim(),
      habilidades: el('habilidades').value.trim(),
      experiencias: el('experiencias').value.trim(),
      formacao: el('formacao').value.trim(),
      cursos: el('cursos').value.trim(),
      diferenciais: el('diferenciais').value.trim()
    };
  }

  function selectedModel() {
    const select = el('modelo');
    return select ? select.value : '';
  }

  function setLoading(isLoading) {
    const button = el('btnGerar');
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Gerando currículo...' : 'Gerar Currículo Perfeito';
    el('btnCancelar').classList.toggle('hidden', !isLoading);
  }

  function startProgress() {
    startedAt = Date.now();
    progressLabel = '';
    el('progressoArea').classList.remove('hidden');
    el('progressoTexto').textContent = 'Gerando currículo…';
    el('progressoDetalhe').textContent = 'Preparando a solicitação…';
    clearInterval(elapsedTimer);
    elapsedTimer = setInterval(function () {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      const detail = progressLabel ? progressLabel + ' • ' : '';
      el('progressoDetalhe').textContent = detail + seconds + 's';
    }, 1000);
  }

  function updateProgress(info) {
    progressLabel = info.label + ' • tentativa ' + info.attempt + ' de ' + info.total;
    el('progressoTexto').textContent = 'Gerando com ' + info.label + '…';
    el('progressoDetalhe').textContent = progressLabel + ' • ' + Math.round(info.elapsedMs / 1000) + 's';
  }

  function stopProgress() {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
    el('progressoArea').classList.add('hidden');
  }

  function showError(title, message, canRetry) {
    el('erroTitulo').textContent = title;
    el('erroMensagem').textContent = message;
    el('btnTentarNovamente').classList.toggle('hidden', canRetry === false);
    el('erroArea').classList.remove('hidden');
    el('erroArea').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    el('erroArea').classList.add('hidden');
    el('erroMensagem').textContent = '';
  }

  function clearOutput() {
    window.PPV.renderer.clear();
    el('acoesArea').classList.add('hidden');
    el('infoGeracao').textContent = '';
  }

  function errorDetail(error) {
    return error.apiMessage && error.apiMessage !== error.message
      ? ' Detalhe da API: ' + error.apiMessage
      : '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const apiKeyInput = el('apiKey');
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      apiKeyInput.setAttribute('aria-invalid', 'true');
      apiKeyInput.focus();
      notify('Informe a chave da API do Gemini.');
      return;
    }
    apiKeyInput.removeAttribute('aria-invalid');
    window.PPV.storage.saveApiKey(apiKey, el('lembrarChave').checked);
    window.PPV.storage.saveModel(selectedModel());

    clearOutput();
    hideError();
    activeController = new AbortController();
    setLoading(true);
    startProgress();
    try {
      const result = await window.PPV.gemini.generate(apiKey, getFormData(), activeController.signal, {
        model: selectedModel(),
        onProgress: updateProgress
      });
      window.PPV.renderer.render(result);
      el('acoesArea').classList.remove('hidden');
      const meta = result.__meta;
      if (meta) {
        const via = meta.fallback ? ' (modelo reserva)' : '';
        el('infoGeracao').textContent = 'Gerado com ' + meta.label + via + ' em ' + (meta.elapsedMs / 1000).toFixed(1) + 's.';
      }
      el('curriculoOutput').scrollIntoView({ behavior: 'smooth', block: 'start' });
      el('curriculoOutput').focus({ preventScroll: true });
    } catch (error) {
      if (error.name === 'AbortError') {
        notify('Geração cancelada.');
      } else {
        console.error('Falha ao gerar o currículo:', error);
        const message = (error.message || 'Não foi possível gerar o currículo.') + errorDetail(error);
        showError('Não foi possível gerar o currículo', message);
        notify(error.message || 'Não foi possível gerar o currículo.', 9000);
      }
    } finally {
      activeController = null;
      setLoading(false);
      stopProgress();
    }
  }

  async function copyResume() {
    const content = window.PPV.renderer.asPlainText().trim();
    if (!content) {
      notify('Gere um currículo antes de copiar.');
      return;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const helper = document.createElement('textarea');
        helper.value = content;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(helper);
        if (!copied) throw new Error('copy failed');
      }
      notify('Currículo copiado.');
    } catch (_) {
      notify('Não foi possível copiar. Selecione o texto do currículo manualmente.');
    }
  }

  async function testKey() {
    const button = el('btnTestarChave');
    const apiKeyInput = el('apiKey');
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      apiKeyInput.setAttribute('aria-invalid', 'true');
      apiKeyInput.focus();
      notify('Cole a chave da API antes de testar.');
      return;
    }
    apiKeyInput.removeAttribute('aria-invalid');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Testando…';
    hideError();
    try {
      const info = await window.PPV.gemini.testConnection(apiKey);
      if (info.missing.length) {
        showError(
          'Chave válida, mas com acesso limitado',
          'A chave não tem acesso a: ' + info.missing.join(', ') + '. O app vai tentar automaticamente os modelos disponíveis.',
          false
        );
      } else {
        notify('Chave válida! ' + info.total + ' modelos disponíveis. Você já pode gerar o currículo.', 6000);
      }
    } catch (error) {
      console.error('Falha ao testar a chave:', error);
      showError('Não foi possível validar a chave', (error.message || 'Tente novamente.') + errorDetail(error), false);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function bindModelSelect() {
    const select = el('modelo');
    if (!select) return;
    const models = window.PPV.config.models || [];
    models.forEach(function (model) {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.label;
      select.appendChild(option);
    });
    const saved = window.PPV.storage.getModel();
    const savedExists = models.some(function (model) { return model.id === saved; });
    select.value = savedExists ? saved : (models[0] ? models[0].id : '');
    select.addEventListener('change', function () { window.PPV.storage.saveModel(select.value); });
  }

  function bind() {
    window.PPV.storage.restoreForm();
    bindModelSelect();

    const remember = el('lembrarChave');
    const apiKey = el('apiKey');
    const savedKey = window.PPV.storage.getApiKey();
    if (savedKey) apiKey.value = savedKey;
    remember.checked = window.PPV.storage.isApiKeyRemembered();

    el('formCurriculo').addEventListener('submit', handleSubmit);
    el('btnImprimir').addEventListener('click', function () { window.print(); });
    el('btnCopiar').addEventListener('click', copyResume);
    el('btnCancelar').addEventListener('click', function () {
      if (activeController) {
        el('progressoTexto').textContent = 'Cancelando…';
        activeController.abort();
      }
    });
    el('btnLimpar').addEventListener('click', function () {
      if (activeController) activeController.abort();
      window.PPV.storage.clear();
      window.PPV.storage.clearForm();
      el('formCurriculo').reset();
      const modelSelect = el('modelo');
      if (modelSelect) modelSelect.selectedIndex = 0;
      remember.checked = false;
      hideError();
      clearOutput();
      notify('Dados salvos e chave removidos deste navegador.');
    });
    el('btnMostrarChave').addEventListener('click', function (event) {
      const isPassword = apiKey.type === 'password';
      apiKey.type = isPassword ? 'text' : 'password';
      event.currentTarget.textContent = isPassword ? 'Ocultar chave' : 'Mostrar chave';
    });
    el('btnTestarChave').addEventListener('click', testKey);
    el('btnFecharErro').addEventListener('click', hideError);
    el('btnTentarNovamente').addEventListener('click', function () {
      hideError();
      el('formCurriculo').requestSubmit();
    });
    apiKey.addEventListener('change', function () {
      window.PPV.storage.saveApiKey(apiKey.value.trim(), remember.checked);
    });
    remember.addEventListener('change', function () {
      window.PPV.storage.saveApiKey(apiKey.value.trim(), remember.checked);
      notify(remember.checked ? 'A chave será lembrada neste dispositivo.' : 'A chave ficará salva apenas nesta sessão.');
    });
    el('formCurriculo').addEventListener('input', function (event) {
      if (event.target.id === 'apiKey') return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(window.PPV.storage.saveForm, 500);
    });
    window.addEventListener('resize', function () {
      clearTimeout(fitTimer);
      fitTimer = setTimeout(window.PPV.renderer.fit, 150);
    });
  }

  return { bind };
})();
