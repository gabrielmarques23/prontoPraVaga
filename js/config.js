window.PPV = window.PPV || {};
window.PPV.config = {
  // Ordem de preferência. Modelos "lite" respondem muito mais rápido para uma
  // tarefa de estruturar texto; o Flash fica como opção de qualidade.
  models: [
    { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (rápido)', thinkingLevel: 'MINIMAL' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (reserva)', thinkingLevel: 'LOW' },
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (qualidade máxima)', thinkingLevel: 'LOW' }
  ],
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
  modelsEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  // Limite por tentativa. O modelo rápido costuma responder em poucos segundos.
  requestTimeoutMs: 30000,
  // Prazo total, somando todas as tentativas de fallback.
  totalDeadlineMs: 60000,
  // Teto de saída: evita gerações longas que estouram o tempo de espera.
  maxOutputTokens: 4096,
  apiKeySessionStorage: 'ppv.apiKey.session',
  apiKeyLocalStorage: 'ppv.apiKey.remember',
  formStorage: 'ppv.form',
  modelStorage: 'ppv.model'
};
