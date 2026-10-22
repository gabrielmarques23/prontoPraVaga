window.PPV = window.PPV || {};
window.PPV.config = {
  model: 'gemini-3.8-flash',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
  requestTimeoutMs: 45000,
  maxRetries: 3,
  apiKeySessionStorage: 'ppv.apiKey.session',
  apiKeyLocalStorage: 'ppv.apiKey.remember',
  formStorage: 'ppv.form'
};
