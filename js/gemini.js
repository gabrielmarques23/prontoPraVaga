window.PPV = window.PPV || {};
window.PPV.gemini = (function () {
  const config = window.PPV.config;
  const retryStatuses = [429, 500, 503, 504];

  function friendlyError(status, apiMessage) {
    const messages = {
      400: 'A solicitação não foi aceita. Revise os dados e tente novamente.',
      401: 'A chave da API parece inválida. Confira a chave do Google AI Studio.',
      403: 'A chave não tem permissão para usar este modelo ou serviço.',
      404: 'O modelo não foi encontrado. Confira a configuração do app.',
      429: 'A cota da API foi atingida. Aguarde e tente novamente.',
      500: 'O serviço do Gemini está instável. Tente novamente em instantes.',
      503: 'O serviço do Gemini está temporariamente indisponível.',
      504: 'O Gemini demorou demais para responder. Tente novamente.'
    };
    const error = new Error(messages[status] || 'Não foi possível gerar o currículo. Tente novamente.');
    error.status = status;
    error.apiMessage = apiMessage || '';
    return error;
  }

  function delay(ms, signal) {
    return new Promise(function (resolve, reject) {
      if (signal && signal.aborted) {
        reject(new DOMException('A geração foi cancelada.', 'AbortError'));
        return;
      }
      const timer = setTimeout(resolve, ms);
      if (!signal) return;
      signal.addEventListener('abort', function () {
        clearTimeout(timer);
        reject(new DOMException('A geração foi cancelada.', 'AbortError'));
      }, { once: true });
    });
  }

  async function generate(apiKey, dados, signal) {
    for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
      const timeoutController = new AbortController();
      let didTimeout = false;
      const timeoutId = setTimeout(function () { didTimeout = true; timeoutController.abort(); }, config.requestTimeoutMs);
      const requestController = new AbortController();
      const abortFromCaller = function () { requestController.abort(); };
      if (signal) {
        if (signal.aborted) throw new DOMException('A geração foi cancelada.', 'AbortError');
        signal.addEventListener('abort', abortFromCaller, { once: true });
      }
      const abortFromTimeout = function () { requestController.abort(); };
      timeoutController.signal.addEventListener('abort', abortFromTimeout, { once: true });

      try {
        const response = await fetch(config.endpoint + config.model + ':generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          signal: requestController.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: window.PPV.prompt.systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: window.PPV.prompt.buildUserPrompt(dados) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: window.PPV.prompt.responseSchema,
              maxOutputTokens: 2048,
              thinkingConfig: { thinkingLevel: 'low' }
            }
          })
        });
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok) {
          const error = friendlyError(response.status, data.error && data.error.message);
          if (retryStatuses.includes(response.status) && attempt < config.maxRetries) {
            await delay(Math.min(1000 * (2 ** attempt) + Math.random() * 400, 8000), signal);
            continue;
          }
          throw error;
        }
        const candidate = data.candidates && data.candidates[0];
        if (!candidate) {
          const reason = data.promptFeedback && data.promptFeedback.blockReason;
          throw new Error(reason ? 'A solicitação foi bloqueada pelo filtro de segurança (' + reason + '). Revise o texto enviado.' : 'O Gemini retornou uma resposta vazia. Tente novamente.');
        }
        if (candidate.finishReason === 'MAX_TOKENS') {
          const error = new Error('A resposta ficou longa demais e foi cortada. Reduza os detalhes das experiências e tente novamente.');
          error.code = 'MAX_TOKENS';
          throw error;
        }
        const text = (candidate.content && candidate.content.parts || [])
          .filter(function (part) { return !part.thought && typeof part.text === 'string'; })
          .map(function (part) { return part.text; }).join('').trim();
        if (!text) throw new Error('O Gemini não retornou conteúdo de currículo. Tente novamente.');
        try { return JSON.parse(text); }
        catch (_) { throw new Error('A resposta do Gemini veio em formato inválido. Tente gerar novamente.'); }
      } catch (error) {
        if (signal && signal.aborted) throw new DOMException('A geração foi cancelada.', 'AbortError');
        if (requestController.signal.aborted && !timeoutController.signal.aborted) {
          throw new DOMException('A geração foi cancelada.', 'AbortError');
        }
        if (didTimeout) throw new Error('A solicitação excedeu o limite de 45 segundos. Tente novamente.');
        if (error instanceof TypeError && attempt < config.maxRetries) {
          await delay(Math.min(1000 * (2 ** attempt) + Math.random() * 400, 8000), signal);
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', abortFromCaller);
      }
    }
    throw new Error('Não foi possível gerar o currículo. Tente novamente.');
  }

  return { generate };
})();
