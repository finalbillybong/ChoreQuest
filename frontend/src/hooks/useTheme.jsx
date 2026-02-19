import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const ThemeContext = createContext(null);

export const COLOR_THEMES = [
  // ── Boy themes ──
  { id: 'default',  label: 'Quest Blue',        group: 'boy',  accent: '#3b82f6', bg: '#0a0e1a', surface: '#111827' },
  { id: 'dragon',   label: 'Dragon Fire',       group: 'boy',  accent: '#ef4444', bg: '#1a0a0a', surface: '#1f1111' },
  { id: 'forest',   label: 'Enchanted Forest',  group: 'boy',  accent: '#10b981', bg: '#061210', surface: '#0d1f1b' },
  { id: 'arctic',   label: 'Arctic',            group: 'boy',  accent: '#06b6d4', bg: '#061217', surface: '#0b1d24' },
  // ── Girl themes ──
  { id: 'rose',     label: 'Rose Gold',         group: 'girl', accent: '#ec4899', bg: '#1a0a12', surface: '#1f1118' },
  { id: 'galaxy',   label: 'Galaxy',            group: 'girl', accent: '#a855f7', bg: '#0f0a1a', surface: '#1a1127' },
  { id: 'sunshine', label: 'Sunshine',          group: 'girl', accent: '#f59e0b', bg: '#1a140a', surface: '#1f1a0d' },
  { id: 'fairy',    label: 'Fairy Dust',        group: 'girl', accent: '#c084fc', bg: '#140a1a', surface: '#1d1127' },
];

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('chorequest-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const [colorTheme, setColorTheme] = useState(() => {
    return localStorage.getItem('chorequest-color-theme') || 'default';
  });

  // Apply mode + color theme to document
  useEffect(() => {
    localStorage.setItem('chorequest-theme', mode);
    localStorage.setItem('chorequest-color-theme', colorTheme);

    const el = document.documentElement;
    el.classList.toggle('light-mode', mode === 'light');

    // Remove all theme-* classes, then add the active one
    COLOR_THEMES.forEach((t) => {
      if (t.id !== 'default') el.classList.remove(`theme-${t.id}`);
    });
    if (colorTheme !== 'default') {
      el.classList.add(`theme-${colorTheme}`);
    }
  }, [mode, colorTheme]);

  const toggleMode = () => setMode((t) => (t === 'dark' ? 'light' : 'dark'));

  const setColorThemeAndSync = useCallback(async (themeId) => {
    setColorTheme(themeId);
    // Persist to server via avatar_config
    try {
      // Fetch current user to get existing avatar_config
      const me = await api('/api/auth/me');
      const config = { ...(me.avatar_config || {}), color_theme: themeId };
      await api('/api/auth/me', {
        method: 'PUT',
        body: { avatar_config: config },
      });
    } catch {
      // Non-critical — localStorage already has the value
    }
  }, []);

  // Sync from server on mount (user's avatar_config.color_theme)
  const syncFromUser = useCallback((user) => {
    if (user?.avatar_config?.color_theme) {
      const serverTheme = user.avatar_config.color_theme;
      if (COLOR_THEMES.some((t) => t.id === serverTheme)) {
        setColorTheme(serverTheme);
        localStorage.setItem('chorequest-color-theme', serverTheme);
      }
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: mode,
        toggle: toggleMode,
        colorTheme,
        setColorTheme: setColorThemeAndSync,
        syncFromUser,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be within ThemeProvider');
  return ctx;
}
