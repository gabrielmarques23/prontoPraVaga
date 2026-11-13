window.PPV = window.PPV || {};
window.PPV.gemini = (function () {
  const config = window.PPV.config;

  function abortError() {
    return new DOMException('A geração foi cancelada.', 'AbortError');
  }

  function friendlyError(status, apiMessage) {
    const message = String(apiMessage || '');
    const messages = {
      400: 'A solicitação não foi aceita. Revise os dados e tente novamente.',
      401: 'A chave da API parece inválida. Confira a chave do Google AI Studio.',
      403: 'A chave não tem permissão para usar este modelo ou serviço.',
      404: 'O modelo não foi encontrado. O app vai tentar um modelo alternativo.',
      429: 'A cota da API foi atingida. Aguarde um pouco e tente novamente.',
      500: 'O serviço do Gemini está instável. Tente novamente em instantes.',
      502: 'O serviço do Gemini está instável. Tente novamente em instantes.',
      503: 'O serviço do Gemini está temporariamente indisponível.',
      504: 'O Gemini demorou demais para responder. Tente novamente.'
    };
    let friendly = messages[status] || 'Não foi possível gerar o currículo. Tente novamente.';
    let fatal = status === 401;
    if (status === 400 && /api[_ ]?key/i.test(message)) {
      friendly = 'A chave da API não foi aceita. Confira se ela foi copiada inteira e se está ativa no Google AI Studio.';
      fatal = true;
    }
    if (status === 403 && /referer|referrer|origin/i.test(message)) {
      friendly = 'A chave tem restrição de sites (HTTP referrer) e o navegador não enviou uma origem válida. Ajuste as restrições da chave no Google AI Studio ou sirva o app por um servidor local.';
    }
    if (status === 429) {
      friendly = 'A cota da API foi atingida. Aguarde um pouco e tente novamente. Se persistir, confira se o modelo escolhido está disponível no seu plano.';
    }
    const error = new Error(friendly);
    error.status = status;
    error.apiMessage = message;
    error.retryable = status === 408 || status === 429 || status >= 500;
    error.fatal = fatal;
    return error;
  }

  function delay(ms, signal) {
    return new Promise(function (resolve, reject) {
      if (signal && signal.aborted) {
        reject(abortError());
        return;
      }
      const timer = setTimeout(resolve, ms);
      if (!signal) return;
      signal.addEventListener('abort', function () {
        clearTimeout(timer);
        reject(abortError());
      }, { once: true });
    });
  }

  function remaining(deadline) {
    return Math.max(0, deadline - Date.now());
  }

  function buildModelQueue(selectedId) {
    const list = Array.isArray(config.models) ? config.models.slice() : [];
    if (!selectedId) return list;
    const selected = list.filter(function (model) { return model.id === selectedId; });
    const rest = list.filter(function (model) { return model.id !== selectedId; });
    return selected.concat(rest);
  }

  function generationConfig(modelConfig) {
    const gen = {
      responseMimeType: 'application/json',
      responseSchema: window.PPV.prompt.responseSchema,
      maxOutputTokens: config.maxOutputTokens,
      temperature: 0.4
    };
    if (modelConfig.thinkingLevel) {
      gen.thinkingConfig = { thinkingLevel: modelConfig.thinkingLevel };
    }
    return gen;
  }

  function collectText(candidate) {
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    return parts
      .filter(function (part) { return !part.thought && typeof part.text === 'string'; })
      .map(function (part) { return part.text; })
      .join('')
      .trim();
  }

  function parseJson(raw) {
    let text = String(raw || '').replace(/^\uFEFF/, '').trim();
    if (!text) throw new Error('O Gemini não retornou conteúdo de currículo. Tente novamente.');
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) text = fence[1].trim();
    try { return JSON.parse(text); } catch (_) { /* tenta recortar abaixo */ }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch (_) { /* formato inválido */ }
    }
    throw new Error('A resposta do Gemini veio em formato inválido. Tente gerar novamente.');
  }

  function asText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function asList(value) {
    return Array.isArray(value) ? value.map(asText).filter(Boolean) : [];
  }

  function normalizeCourse(item) {
    if (typeof item === 'string') return { nome: item.trim(), periodo: '' };
    if (!item || typeof item !== 'object') return { nome: '', periodo: '' };
    return { nome: asText(item.nome), periodo: asText(item.periodo) };
  }

  function normalizeCv(raw) {
    const cv = raw && typeof raw === 'object' ? raw : {};
    const experiences = Array.isArray(cv.experiencias) ? cv.experiencias : [];
    return {
      nome: asText(cv.nome),
      email: asText(cv.email),
      telefone: asText(cv.telefone),
      cidade: asText(cv.cidade),
      objetivo: asText(cv.objetivo),
      resumo: asText(cv.resumo),
      experiencias: experiences.map(function (item) {
        const experience = item && typeof item === 'object' ? item : {};
        return {
          empresa: asText(experience.empresa),
          cargo: asText(experience.cargo),
          periodo: asText(experience.periodo),
          atividades: asList(experience.atividades).slice(0, 4)
        };
      }).filter(function (experience) {
        return experience.empresa || experience.cargo || experience.atividades.length;
      }).slice(0, 3),
      habilidades: asList(cv.habilidades).slice(0, 8),
      formacao: asText(cv.formacao),
      cursos: (Array.isArray(cv.cursos) ? cv.cursos : [])
        .map(normalizeCourse)
        .filter(function (course) { return course.nome; })
        .slice(0, 4),
      diferenciais: asList(cv.diferenciais).slice(0, 4)
    };
  }

  function hasContent(cv) {
    return Boolean(cv.nome || cv.objetivo || cv.resumo || cv.experiencias.length || cv.habilidades.length);
  }

  async function requestModel(apiKey, dados, modelConfig, signal, deadline) {
    const controller = new AbortController();
    let didTimeout = false;
    const allotted = Math.max(5000, Math.min(config.requestTimeoutMs, remaining(deadline)));
    const timeoutId = setTimeout(function () {
      didTimeout = true;
      controller.abort();
    }, allotted);
    const abortFromCaller = function () { controller.abort(); };
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId);
        throw abortError();
      }
      signal.addEventListener('abort', abortFromCaller, { once: true });
    }

    try {
      const response = await fetch(config.endpoint + modelConfig.id + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: window.PPV.prompt.systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: window.PPV.prompt.buildUserPrompt(dados) }] }],
          generationConfig: generationConfig(modelConfig)
        })
      });
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw friendlyError(response.status, data.error && data.error.message);

      const candidate = data.candidates && data.candidates[0];
      if (!candidate) {
        const reason = data.promptFeedback && data.promptFeedback.blockReason;
        const error = new Error(reason
          ? 'A solicitação foi bloqueada pelo filtro de segurança (' + reason + '). Revise o texto enviado.'
          : 'O Gemini retornou uma resposta vazia. Tente novamente.');
        error.code = 'EMPTY';
        throw error;
      }
      if (candidate.finishReason === 'MAX_TOKENS') {
        const error = new Error('O Gemini não conseguiu concluir o currículo dentro do limite de tamanho. O app vai tentar um modelo alternativo.');
        error.code = 'MAX_TOKENS';
        error.retryable = true;
        throw error;
      }

      const text = collectText(candidate);
      if (!text) {
        const error = new Error('O Gemini não retornou conteúdo de currículo. Tente novamente.');
        error.code = 'EMPTY';
        throw error;
      }
      const cv = normalizeCv(parseJson(text));
      if (!hasContent(cv)) {
        const error = new Error('O Gemini retornou um currículo vazio. Tente novamente.');
        error.code = 'EMPTY';
        throw error;
      }
      return cv;
    } catch (error) {
      if (signal && signal.aborted) throw abortError();
      if (didTimeout) {
        const timeoutError = new Error('A solicitação excedeu o limite de ' + Math.round(allotted / 1000) + ' segundos.');
        timeoutError.code = 'TIMEOUT';
        timeoutError.retryable = true;
        throw timeoutError;
      }
      if (controller.signal.aborted) throw abortError();
      if (error instanceof TypeError) {
        const networkError = new Error('Não foi possível conectar ao Gemini. Verifique sua internet e, se estiver abrindo o arquivo direto no navegador, tente servir o app por um servidor local.');
        networkError.code = 'NETWORK';
        networkError.retryable = true;
        throw networkError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', abortFromCaller);
    }
  }

  async function generate(apiKey, dados, signal, options) {
    const opts = options || {};
    const startedAt = Date.now();
    const deadline = startedAt + config.totalDeadlineMs;
    const queue = buildModelQueue(opts.model);
    let lastError = null;
    let attempted = 0;

    for (let index = 0; index < queue.length; index += 1) {
      if (signal && signal.aborted) throw abortError();
      if (remaining(deadline) < 3000) break;
      const modelConfig = queue[index];
      attempted += 1;
      if (typeof opts.onProgress === 'function') {
        opts.onProgress({
          model: modelConfig.id,
          label: modelConfig.label,
          attempt: attempted,
          total: queue.length,
          elapsedMs: Date.now() - startedAt
        });
      }
      try {
        const cv = await requestModel(apiKey, dados, modelConfig, signal, deadline);
        cv.__meta = {
          model: modelConfig.id,
          label: modelConfig.label,
          elapsedMs: Date.now() - startedAt,
          fallback: attempted > 1
        };
        return cv;
      } catch (error) {
        if (error.name === 'AbortError' || (signal && signal.aborted)) throw abortError();
        lastError = error;
        console.warn('[PPV] Modelo ' + modelConfig.id + ' falhou: ' + error.message, error);
        if (error.fatal) break;
        if (!error.retryable && attempted >= queue.length) break;
        // Só espera quando a falha é temporária (cota/serviço); troca de modelo
        // imediatamente em erros de configuração.
        if (error.retryable && remaining(deadline) > 5000) {
          await delay(Math.min(800 * attempted, 2000), signal);
        }
      }
    }

    if (!lastError) {
      lastError = new Error('Não foi possível gerar o currículo dentro do tempo limite. Tente novamente.');
    }
    if (attempted > 1 && lastError.code !== 'NETWORK') {
      lastError.message += ' O app tentou ' + attempted + ' modelos.';
    }
    throw lastError;
  }

  async function testConnection(apiKey, signal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(function () { controller.abort(); }, 15000);
    const abortFromCaller = function () { controller.abort(); };
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId);
        throw abortError();
      }
      signal.addEventListener('abort', abortFromCaller, { once: true });
    }
    try {
      const response = await fetch(config.modelsEndpoint + '?pageSize=1000', {
        headers: { 'x-goog-api-key': apiKey },
        signal: controller.signal
      });
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw friendlyError(response.status, data.error && data.error.message);
      const ids = (data.models || []).map(function (model) {
        return String(model.name || '').replace(/^models\//, '');
      }).filter(Boolean);
      if (!ids.length) throw new Error('A chave foi aceita, mas nenhum modelo foi retornado. Confira o projeto no Google AI Studio.');
      const available = config.models.filter(function (model) { return ids.indexOf(model.id) !== -1; });
      const missing = config.models.filter(function (model) { return ids.indexOf(model.id) === -1; })
        .map(function (model) { return model.id; });
      return { total: ids.length, available: available, missing: missing };
    } catch (error) {
      if (signal && signal.aborted) throw abortError();
      if (error.name === 'AbortError') {
        const timeoutError = new Error('A verificação da chave demorou mais de 15 segundos. Verifique sua conexão.');
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }
      if (error instanceof TypeError) {
        const networkError = new Error('Não foi possível conectar ao Gemini. Verifique sua internet.');
        networkError.code = 'NETWORK';
        throw networkError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', abortFromCaller);
    }
  }

  return { generate, testConnection, normalizeCv, parseJson };
})();
