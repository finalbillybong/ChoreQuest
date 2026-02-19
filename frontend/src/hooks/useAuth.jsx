import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, setAccessToken, clearAccessToken, ensureToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef(null);

  const refreshSession = useCallback(async () => {
    // Deduplicate concurrent refresh calls (prevents token-reuse revocation
    // when React StrictMode double-fires the mount effect)
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        // Use ensureToken (shared with 401-retry path) so there is exactly
        // one in-flight refresh at a time across the whole app.
        const data = await ensureToken();
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
