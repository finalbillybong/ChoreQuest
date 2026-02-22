import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, setAccessToken, clearAccessToken, getAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef(null);

  const refreshSession = useCallback(async () => {
    // Deduplicate concurrent refresh calls (React StrictMode double-fires)
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        // If we have a stored token (from localStorage), try using it
        // directly via /me.  The api() 401-retry will automatically
        // attempt a cookie-based refresh if the token has expired.
        if (getAccessToken()) {
          const userData = await api('/api/auth/me');
          setUser(userData);
          return true;
        }

        // No stored token — try cookie-based refresh
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('No session');
        const data = await res.json();
        setAccessToken(data.access_token);
        setUser(data.user);
        return true;
      } catch {
        clearAccessToken();
        setUser(null);
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));

    const handleExpired = () => {
      clearAccessToken();
      setUser(null);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [refreshSession]);

  const login = async (username, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
    setAccessToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const pinLogin = async (username, pin) => {
    const data = await api('/api/auth/pin-login', { method: 'POST', body: { username, pin } });
    setAccessToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (username, password, display_name, role, invite_code) => {
    const body = { username, password, display_name, role };
    if (invite_code) body.invite_code = invite_code;
    const data = await api('/api/auth/register', { method: 'POST', body });
    setAccessToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    clearAccessToken();
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, pinLogin, register, logout, updateUser, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
