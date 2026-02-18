let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

async function refreshToken() {
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    clearAccessToken();
    throw new Error('Session expired');
  }
  const data = await res.json();
  accessToken = data.access_token;
  return data;
}

async function ensureToken() {
  if (!refreshPromise) {
    refreshPromise = refreshToken().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function api(path, options = {}) {
  const { body, method = 'GET', headers = {}, raw = false } = options;

  const config = {
    method,
    credentials: 'include',
    headers: { ...headers },
  };

  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (body && !(body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    config.body = body;
  }

  let res = await fetch(path, config);

  // If 401, try refreshing token and retry once
  if (res.status === 401 && !options._retried) {
    try {
      await ensureToken();
      config.headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(path, { ...config, _retried: true });
    } catch {
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Session expired');
    }
  }

  if (raw) return res;

  if (res.status === 204) return null;

  if (!res.ok) {
    const text = await res.text();
    let detail = 'Request failed';
    try {
      const data = JSON.parse(text);
      detail = data.detail || detail;
    } catch {
      // Response wasn't JSON (server error page, etc.)
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
