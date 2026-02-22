import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, setAccessToken, clearAccessToken, getAccessToken, setTokenProvider } from '../api/client';
import { useAppConfig, isSaas } from './useAppConfig';
import {
  initFirebase,
  firebaseSignIn,
  firebaseSignUp,
  firebaseSignOut,
  getIdToken,
  onFirebaseAuthChange,
} from '../api/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { config, loading: configLoading } = useAppConfig();
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(undefined); // undefined = not checked, null = no family
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef(null);
  const firebaseInitRef = useRef(false);

  const saas = isSaas(config);

  // Initialise Firebase when config arrives in SaaS mode
  useEffect(() => {
    if (!config || !saas || firebaseInitRef.current) return;
    initFirebase(config.firebase);
    setTokenProvider((forceRefresh) => getIdToken(!!forceRefresh));
    firebaseInitRef.current = true;
  }, [config, saas]);

  // ---------- Session restore / refresh ----------
  const refreshSession = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        if (saas) {
          // SaaS: just re-fetch user data; api() handles the Firebase token
          const userData = await api('/api/auth/me');
          setUser(userData);
          return true;
        }
        if (getAccessToken()) {
          const userData = await api('/api/auth/me');
          setUser(userData);
          return true;
        }
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
        if (!saas) {
          clearAccessToken();
          setUser(null);
        }
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [saas]);

  // ---------- SaaS: listen to Firebase auth state ----------
  useEffect(() => {
    if (!saas || !firebaseInitRef.current) return;

    const unsubscribe = onFirebaseAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await api('/api/auth/me');
          setUser(userData);
          // Check family membership
          const fam = await api('/api/families/me');
          setFamily(fam);
        } catch {
          setUser(null);
          setFamily(undefined);
        }
      } else {
        setUser(null);
        setFamily(undefined);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [saas]);

  // ---------- Self-hosted: restore on mount ----------
  useEffect(() => {
    if (configLoading) return;
    if (saas) {
      // In SaaS mode clear any stale self-hosted token from localStorage
      clearAccessToken();
      return;
    }
    refreshSession().finally(() => setLoading(false));

    const handleExpired = () => {
      clearAccessToken();
      setUser(null);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [configLoading, saas, refreshSession]);

  // ---------- Auth actions ----------

  // Self-hosted login
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

  // SaaS Firebase login
  const firebaseLogin = async (email, password) => {
    await firebaseSignIn(email, password);
    // Auth state listener will handle setting user
  };

  // SaaS Firebase register
  const firebaseRegister = async (email, password, displayName) => {
    await firebaseSignUp(email, password, displayName);
    // Auth state listener will handle setting user
  };

  const logout = async () => {
    if (saas) {
      await firebaseSignOut();
    } else {
      try {
        await api('/api/auth/logout', { method: 'POST' });
      } catch { /* ignore */ }
      clearAccessToken();
    }
    setUser(null);
    setFamily(undefined);
  };

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const createFamily = async (name) => {
    const fam = await api('/api/families', { method: 'POST', body: { name } });
    setFamily(fam);
    try {
      const userData = await api('/api/auth/me');
      setUser(userData);
    } catch { /* ignore */ }
    return fam;
  };

  const joinFamily = async (invite_code) => {
    const fam = await api('/api/families/join', { method: 'POST', body: { invite_code } });
    setFamily(fam);
    try {
      const userData = await api('/api/auth/me');
      setUser(userData);
    } catch { /* ignore */ }
    return fam;
  };

  return (
    <AuthContext.Provider value={{
      user,
      family,
      loading: loading || configLoading,
      saas,
      login,
      pinLogin,
      register,
      firebaseLogin,
      firebaseRegister,
      logout,
      updateUser,
      refreshSession,
      createFamily,
      joinFamily,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
