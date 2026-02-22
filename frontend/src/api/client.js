const TOKEN_KEY = 'chorequest_access_token';

let accessToken = null;
let _tokenProvider = null;

// Restore token from localStorage on module load
try {
  accessToken = localStorage.getItem(TOKEN_KEY);
} catch { /* SSR / private browsing */ }

export function setAccessToken(token) {
  accessToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export function getAccessToken() {
  return accessToken;
}

/**
 * Return a current valid token for WebSocket or other non-fetch uses.
 * In SaaS mode this calls the Firebase token provider; otherwise returns
 * the stored local JWT.
 */
export async function getCurrentToken() {
  if (_tokenProvider) {
    return await _tokenProvider();
  }
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

/**
 * Set an async function that returns a Bearer token.
 * When set, this overrides the stored accessToken for all API calls.
 * Used in SaaS mode to get Firebase ID tokens on the fly.
 */
export function setTokenProvider(fn) {
  _tokenProvider = fn;
}

async function refreshToken() {
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    clearAccessToken();
    throw new Error('Session expired');
  }
  const data = await res.json();
  setAccessToken(data.access_token);
  return data;
}

export async function ensureToken() {
  if (!refreshPromise) {
    refreshPromise = refreshToken().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

let refreshPromise = null;

export async function api(path, options = {}) {
  const { body, method = 'GET', headers = {}, raw = false } = options;

  const config = {
    method,
    credentials: 'include',
    headers: { ...headers },
  };

  // Get the auth token (Firebase ID token or local JWT)
  if (_tokenProvider) {
    const token = await _tokenProvider();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  } else if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (body && !(body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    config.body = body;
  }

  let res = await fetch(path, config);

  // If 401 and using local tokens, try refreshing and retry once
  if (res.status === 401 && !_tokenProvider && !options._retried) {
    try {
      await ensureToken();
      config.headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(path, { ...config, _retried: true });
    } catch {
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Session expired');
    }
  }

  // If 401 with Firebase, force-refresh the token and retry once
  if (res.status === 401 && _tokenProvider && !options._retried) {
    try {
      const freshToken = await _tokenProvider(true);
      if (freshToken) {
        config.headers['Authorization'] = `Bearer ${freshToken}`;
        res = await fetch(path, { ...config, _retried: true });
      }
    } catch { /* ignore refresh failure */ }
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Session expired');
    }
  }

  if (raw) return res;

  if (res.status === 204) return null;

  // Handle 402 subscription required
  if (res.status === 402) {
    const text = await res.text();
    let detail;
    try { detail = JSON.parse(text); } catch { detail = {}; }
    window.dispatchEvent(new CustomEvent('subscription:required', { detail: detail.detail || detail }));
    const err = new Error(detail?.detail?.message || 'Subscription required');
    err.status = 402;
    err.data = detail?.detail || detail;
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    let detail = 'Request failed';
    try {
      const data = JSON.parse(text);
      detail = data.detail || detail;
    } catch {
      // Response wasn't JSON
    }
    throw new Error(detail);
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid response from server');
  }
}
